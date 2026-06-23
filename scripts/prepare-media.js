const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let ffmpegPath = null;
let ffprobePath = null;


// Color helpers
const color = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const videoFileArg = args.find(arg => arg !== '--dry-run');

  if (!videoFileArg) {
    console.error(`${color.red}Error: Please specify a video file path.${color.reset}`);
    console.log('Usage: npm run prepare-media -- [--dry-run] <video-file-path>');
    process.exit(1);
  }

  const absoluteVideoPath = path.resolve(videoFileArg);
  if (!fs.existsSync(absoluteVideoPath)) {
    console.error(`${color.red}Error: Video file does not exist: ${absoluteVideoPath}${color.reset}`);
    process.exit(1);
  }

  console.log(`${color.cyan}ACM TV Media Preparation Utility${color.reset}`);
  console.log(`Input File: ${absoluteVideoPath}`);
  if (isDryRun) {
    console.log(`${color.yellow}--- DRY RUN MODE ACTIVE (No files will be written or modified) ---${color.reset}`);
  }

  const baseDir = path.resolve(__dirname, '..');
  const publicMediaPrefix = path.join(baseDir, 'public');

  // Verify that the video is inside the public folder
  if (!absoluteVideoPath.startsWith(publicMediaPrefix)) {
    console.error(`${color.red}Error: Media file must be located inside the project public/ folder.${color.reset}`);
    process.exit(1);
  }

  // Derive URLs relative to public directory
  const relativeVideoPath = absoluteVideoPath.substring(publicMediaPrefix.length).replace(/\\/g, '/');
  const extension = path.extname(absoluteVideoPath);
  const baseName = path.basename(absoluteVideoPath, extension);
  const videoDir = path.dirname(absoluteVideoPath);

  const metadataFilePath = path.join(videoDir, `${baseName}.metadata.json`);
  const relativeMetadataPath = metadataFilePath.substring(publicMediaPrefix.length).replace(/\\/g, '/');

  // Derive programId
  const programId = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  // Setup tools check
  ffmpegPath = detectExecutable('ffmpeg');
  ffprobePath = detectExecutable('ffprobe');
  const ffmpegAvailable = !!ffmpegPath;
  const ffprobeAvailable = !!ffprobePath;

  console.log(`Tool Status:`);
  console.log(`  FFmpeg:  ${ffmpegAvailable ? `FOUND at ${ffmpegPath}` : 'MISSING'}`);
  console.log(`  FFprobe: ${ffprobeAvailable ? `FOUND at ${ffprobePath}` : 'MISSING'}`);

  const extractionMethod = ffmpegAvailable ? 'FFmpeg' : (ffprobeAvailable ? 'FFprobe Metadata / EBML Demuxer fallback' : 'EBML fallback');
  console.log(`Extraction Method: ${extractionMethod}`);

  let detectedDuration = 0;
  let audioTracks = [];
  let subtitleTracks = [];

  if (ffprobeAvailable) {
    console.log('Using FFprobe to analyze media file...');
    try {
      const ffprobeOutput = execSync(`"${ffprobePath}" -v error -show_format -show_streams -print_format json "${absoluteVideoPath}"`, { encoding: 'utf8' });
      const info = JSON.parse(ffprobeOutput);
      
      detectedDuration = Math.round(parseFloat(info.format.duration || 0));

      // Audio stream mapping
      const audioStreams = info.streams.filter(s => s.codec_type === 'audio');
      audioStreams.forEach((stream, index) => {
        const streamIndex = stream.index;
        const rawLang = stream.tags?.language || 'eng';
        const langCode = mapLanguageCode(rawLang);
        const langName = mapLanguageName(langCode);

        audioTracks.push({
          streamIndex,
          language: langName,
          code: langCode,
          codec: 'aac',
          default: index === 0, // Mark first audio stream as default
          url: `${relativeVideoPath.substring(0, relativeVideoPath.length - extension.length)}_${langCode}.m4a`
        });
      });

      // Subtitle stream mapping
      const subtitleStreams = info.streams.filter(s => s.codec_type === 'subtitle');
      subtitleStreams.forEach((stream) => {
        const streamIndex = stream.index;
        const rawLang = stream.tags?.language || 'eng';
        const langCode = mapLanguageCode(rawLang);
        const langName = mapLanguageName(langCode);

        subtitleTracks.push({
          streamIndex,
          language: langName,
          code: langCode,
          format: 'vtt',
          default: false,
          url: `${relativeVideoPath.substring(0, relativeVideoPath.length - extension.length)}_${langCode}.vtt`
        });
      });

    } catch (e) {
      console.error(`${color.yellow}FFprobe failed to analyze the file. Falling back to EBML parser...${color.reset}`, e);
      fallbackToEbmlParser();
    }
  } else {
    fallbackToEbmlParser();
  }

  // Fallback EBML parser implementation
  function fallbackToEbmlParser() {
    console.log('Running fallback EBML binary parser...');
    const result = parseMkvEbml(absoluteVideoPath);
    if (!result) {
      console.error(`${color.red}Error: Fallback EBML parser failed. Ensure file is a Matroska container.${color.reset}`);
      process.exit(1);
    }
    detectedDuration = result.duration;
    
    result.audioTracks.forEach((track, index) => {
      audioTracks.push({
        trackNumber: track.trackNumber,
        language: mapLanguageName(track.language),
        code: track.language,
        codec: 'aac',
        default: index === 0,
        url: `${relativeVideoPath.substring(0, relativeVideoPath.length - extension.length)}_${track.language}.m4a`
      });
    });

    result.subtitleTracks.forEach((track) => {
      subtitleTracks.push({
        trackNumber: track.trackNumber,
        language: mapLanguageName(track.language),
        code: track.language,
        format: 'vtt',
        default: false,
        url: `${relativeVideoPath.substring(0, relativeVideoPath.length - extension.length)}_${track.language}.vtt`
      });
    });
  }

  // Check for external subtitle files in the same directory (SRT & VTT)
  const externalSubtitles = checkExternalSubtitleFiles(videoDir, baseName, relativeVideoPath);
  
  // Merge external subtitles, avoiding duplicates by code
  externalSubtitles.forEach(extSub => {
    if (!subtitleTracks.some(t => t.code === extSub.code)) {
      subtitleTracks.push(extSub);
    }
  });

  console.log(`Analysis Results:`);
  console.log(`  Duration: ${detectedDuration} seconds`);
  console.log(`  Audio Tracks Found: ${audioTracks.length}`);
  audioTracks.forEach(t => console.log(`    - [${t.code}] ${t.language} (${t.codec}) ${t.default ? '[DEFAULT]' : ''}`));
  console.log(`  Subtitle Tracks Found: ${subtitleTracks.length}`);
  subtitleTracks.forEach(t => console.log(`    - [${t.code}] ${t.language} (${t.format})`));

  // Perform conversions (extracting streams and converting SRTs)
  const extractedAudioCount = extractAudioStreams(absoluteVideoPath, videoDir, baseName, audioTracks, ffmpegAvailable, isDryRun);
  const extractedSubtitleCount = extractSubtitleStreams(absoluteVideoPath, videoDir, baseName, subtitleTracks, ffmpegAvailable, isDryRun);
  
  // Convert any local SRT subtitle files to VTT
  convertLocalSrts(videoDir, baseName, isDryRun);

  // Generate / Load metadata file
  const defaultTitle = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const defaultDescription = 'Automatically prepared and registered media content.';
  
  let existingMetadata = {};
  if (fs.existsSync(metadataFilePath)) {
    try {
      existingMetadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
      console.log('Found existing metadata file, performing incremental update...');
    } catch (e) {
      console.warn('Existing metadata is corrupted, starting fresh.');
    }
  }

  // Clean tracks for output (remove processing properties like streamIndex or trackNumber)
  const cleanAudioTracks = audioTracks.map(({ streamIndex, trackNumber, ...rest }) => rest);
  const cleanSubtitleTracks = subtitleTracks.map(({ streamIndex, trackNumber, ...rest }) => rest);

  const finalMetadata = {
    version: existingMetadata.version || 1,
    title: existingMetadata.title || defaultTitle,
    duration: detectedDuration || existingMetadata.duration || 0,
    video: existingMetadata.video || (relativeVideoPath.endsWith('.m3u8') ? null : relativeVideoPath),
    hls: existingMetadata.hls || (relativeVideoPath.endsWith('.m3u8') ? relativeVideoPath : null),
    audioTracks: cleanAudioTracks,
    subtitles: cleanSubtitleTracks,
    poster: existingMetadata.poster || '',
    description: existingMetadata.description || defaultDescription,
    ...existingMetadata // Preserves custom properties
  };

  // Re-apply updated tracks and duration to ensure they match current analysis
  finalMetadata.duration = detectedDuration || finalMetadata.duration;
  finalMetadata.audioTracks = cleanAudioTracks;
  finalMetadata.subtitles = cleanSubtitleTracks;
  if (!relativeVideoPath.endsWith('.m3u8')) {
    finalMetadata.video = relativeVideoPath;
  }

  // Proposed updates to config files
  const manifestPath = path.join(baseDir, 'src', 'config', 'media-manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {}
  }
  const updatedManifest = {
    ...manifest,
    [programId]: {
      metadata: relativeMetadataPath
    }
  };

  const channelsPath = path.join(baseDir, 'src', 'config', 'channels.json');
  let channelsData = { channels: [] };
  if (fs.existsSync(channelsPath)) {
    try {
      channelsData = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
    } catch (e) {}
  }

  // Auto-resolve channel category based on folder name
  let targetChannelId = 'acm-tv';
  let defaultCategory = 'Feature';
  if (relativeVideoPath.includes('/acm-movies/')) {
    targetChannelId = 'acm-movies';
    defaultCategory = 'Movie';
  } else if (relativeVideoPath.includes('/acm-music/')) {
    targetChannelId = 'acm-music';
    defaultCategory = 'Music';
  } else if (relativeVideoPath.includes('/acm-trailers/')) {
    targetChannelId = 'acm-trailers';
    defaultCategory = 'Trailer';
  } else if (relativeVideoPath.includes('/acm-rcu/')) {
    targetChannelId = 'acm-rcu';
    defaultCategory = 'RCU Content';
  }

  let channelUpdated = false;
  let registeredInChannel = '';

  for (const channel of channelsData.channels) {
    // Check if the program is already in the channel programs list
    const existingProgIdx = channel.programs.findIndex(p => p.id === programId || p.videoUrl === relativeVideoPath);
    if (existingProgIdx !== -1) {
      const existingProg = channel.programs[existingProgIdx];
      // Update duration, metadata path, audioTracks and subtitles, preserving manual edits
      channel.programs[existingProgIdx] = {
        ...existingProg,
        duration: detectedDuration,
        metadataUrl: relativeMetadataPath,
        audioTracks: cleanAudioTracks,
        subtitles: cleanSubtitleTracks
      };
      channelUpdated = true;
      registeredInChannel = channel.name;
      break;
    }
  }

  // If not found in any channel, register under the resolved target channel
  if (!channelUpdated) {
    const targetChannel = channelsData.channels.find(c => c.id === targetChannelId) || channelsData.channels[0];
    if (targetChannel) {
      targetChannel.programs.push({
        id: programId,
        title: finalMetadata.title,
        description: finalMetadata.description,
        duration: detectedDuration,
        videoUrl: relativeVideoPath,
        type: 'content',
        category: defaultCategory,
        metadataUrl: relativeMetadataPath,
        audioTracks: cleanAudioTracks,
        subtitles: cleanSubtitleTracks
      });
      registeredInChannel = targetChannel.name;
      channelUpdated = true;
    }
  }

  if (isDryRun) {
    console.log(`\n${color.yellow}Proposed metadata.json:${color.reset}`);
    console.log(JSON.stringify(finalMetadata, null, 2));
    console.log(`\n${color.yellow}Proposed manifest update for "${programId}":${color.reset}`);
    console.log(JSON.stringify(updatedManifest[programId], null, 2));
    console.log(`\n${color.yellow}Proposed registration in channel "${registeredInChannel}":${color.reset}`);
    const channelWithProg = channelsData.channels.find(c => c.name === registeredInChannel);
    const progInChannel = channelWithProg?.programs.find(p => p.id === programId || p.videoUrl === relativeVideoPath);
    console.log(JSON.stringify(progInChannel, null, 2));
  } else {
    // Write files
    fs.writeFileSync(metadataFilePath, JSON.stringify(finalMetadata, null, 2), 'utf8');
    console.log(`${color.green}Generated metadata: ${metadataFilePath}${color.reset}`);

    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2), 'utf8');
    console.log(`${color.green}Updated media manifest: ${manifestPath}${color.reset}`);

    fs.writeFileSync(channelsPath, JSON.stringify(channelsData, null, 2), 'utf8');
    console.log(`${color.green}Registered program inside channel "${registeredInChannel}" in: ${channelsPath}${color.reset}`);
  }

  // Verify generated files post-extraction
  if (!isDryRun) {
    console.log(`\n${color.cyan}Verifying generated files...${color.reset}`);
    let verificationFailed = false;

    // 1. Verify metadata file exists and is valid JSON
    if (fs.existsSync(metadataFilePath)) {
      try {
        const content = fs.readFileSync(metadataFilePath, 'utf8');
        const parsed = JSON.parse(content);
        console.log(`${color.green}✓ Metadata file is valid JSON and readable: ${metadataFilePath}${color.reset}`);
      } catch (e) {
        console.error(`${color.red}✗ Metadata file is corrupted/unreadable: ${metadataFilePath}${color.reset}`, e);
        verificationFailed = true;
      }
    } else {
      console.error(`${color.red}✗ Metadata file was not created: ${metadataFilePath}${color.reset}`);
      verificationFailed = true;
    }

    // 2. Verify audio tracks files exist and are readable (i.e. size > 0)
    audioTracks.forEach(track => {
      const filePath = path.join(videoDir, `${baseName}_${track.code}.m4a`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          console.log(`${color.green}✓ Audio file exists and is readable (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${filePath}${color.reset}`);
        } else {
          console.error(`${color.red}✗ Audio file is empty (0 bytes): ${filePath}${color.reset}`);
          verificationFailed = true;
        }
      } else {
        console.error(`${color.red}✗ Audio file was not created: ${filePath}${color.reset}`);
        verificationFailed = true;
      }
    });

    // 3. Verify subtitle track files exist and are readable (size > 0)
    subtitleTracks.forEach(track => {
      const filePath = path.join(videoDir, `${baseName}_${track.code}.vtt`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          console.log(`${color.green}✓ Subtitle file exists and is readable (${stats.size} bytes): ${filePath}${color.reset}`);
        } else {
          console.error(`${color.red}✗ Subtitle file is empty (0 bytes): ${filePath}${color.reset}`);
          verificationFailed = true;
        }
      } else {
        console.error(`${color.red}✗ Subtitle file was not created: ${filePath}${color.reset}`);
        verificationFailed = true;
      }
    });

    if (verificationFailed) {
      console.error(`\n${color.red}=== Verification Failed! ===${color.reset}`);
    } else {
      console.log(`\n${color.green}=== All Generated Files Successfully Verified ===${color.reset}`);
    }
  }

  // Performance Logging Summary
  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${color.green}=== Media Preparation Summary ===${color.reset}`);
  console.log(`  Processing Time:   ${elapsedSeconds} seconds`);
  console.log(`  Audio Tracks:      ${audioTracks.length} detected`);
  console.log(`  Subtitle Tracks:   ${subtitleTracks.length} detected`);
  console.log(`  Metadata File:     ${relativeMetadataPath}`);
  console.log(`  Manifest Status:   ${isDryRun ? 'Dry-Run Proposed' : 'Updated'}`);
  console.log(`  Channel Register:  ${isDryRun ? 'Dry-Run Proposed' : 'Updated'} (Channel: ${registeredInChannel})`);
  console.log(`${color.green}=================================${color.reset}`);
}

function detectExecutable(name) {
  // 1. Check environment variable first
  const envPath = process.env[name.toUpperCase() + '_PATH'];
  if (envPath && fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
    return path.resolve(envPath);
  }

  // 2. Check current directory or bin folder inside project
  const localPaths = [
    path.join(process.cwd(), name),
    path.join(process.cwd(), name + '.exe'),
    path.join(process.cwd(), 'bin', name),
    path.join(process.cwd(), 'bin', name + '.exe'),
  ];
  for (const lp of localPaths) {
    if (fs.existsSync(lp) && fs.statSync(lp).isFile()) {
      return lp;
    }
  }

  // 3. Search in system PATH
  try {
    const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const resolvedPath = stdout.split(/\r?\n/)[0];
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      return path.resolve(resolvedPath);
    }
  } catch (e) {
    // Ignore and proceed
  }

  // 4. Check common installation directories
  if (process.platform === 'win32') {
    const commonDirs = [
      'C:\\Program Files\\ffmpeg\\bin',
      'C:\\ffmpeg\\bin',
      'C:\\Program Files (x86)\\ffmpeg\\bin',
    ];
    for (const dir of commonDirs) {
      const fullPath = path.join(dir, name + '.exe');
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  } else {
    const commonPaths = [
      `/usr/bin/${name}`,
      `/usr/local/bin/${name}`,
      `/opt/local/bin/${name}`,
    ];
    for (const cp of commonPaths) {
      if (fs.existsSync(cp)) {
        return cp;
      }
    }
  }

  return null;
}


function mapLanguageCode(rawCode) {
  const code = (rawCode || '').toLowerCase().trim();
  const dict = {
    'telugu': 'tel', 'tel': 'tel', 'te': 'tel',
    'tamil': 'tam', 'tam': 'tam', 'ta': 'tam',
    'hindi': 'hin', 'hin': 'hin', 'hi': 'hin',
    'english': 'eng', 'eng': 'eng', 'en': 'eng',
    'kannada': 'kan', 'kan': 'kan', 'kn': 'kan',
    'malayalam': 'mal', 'mal': 'mal', 'ml': 'mal'
  };
  return dict[code] || code;
}

function mapLanguageName(code) {
  const dict = {
    'tel': 'Telugu',
    'tam': 'Tamil',
    'hin': 'Hindi',
    'eng': 'English',
    'kan': 'Kannada',
    'mal': 'Malayalam'
  };
  return dict[code] || code.toUpperCase();
}

function checkExternalSubtitleFiles(dir, baseName, publicVideoPath) {
  const subtitles = [];
  try {
    const files = fs.readdirSync(dir);
    const pattern = new RegExp(`^${escapeRegExp(baseName)}_(.+)\\.(srt|vtt)$`, 'i');
    
    files.forEach(file => {
      const match = file.match(pattern);
      if (match) {
        const langCode = mapLanguageCode(match[1]);
        const format = match[2].toLowerCase();
        const relativeUrlPath = publicVideoPath.substring(0, publicVideoPath.lastIndexOf('/')) + '/' + baseName + '_' + langCode + '.vtt';
        
        subtitles.push({
          language: mapLanguageName(langCode),
          code: langCode,
          format: 'vtt',
          default: false,
          url: relativeUrlPath
        });
      }
    });

    // Also look for simple <baseName>.srt or <baseName>.vtt (default to eng)
    if (files.some(f => f.toLowerCase() === `${baseName.toLowerCase()}.srt` || f.toLowerCase() === `${baseName.toLowerCase()}.vtt`)) {
      const format = files.find(f => f.toLowerCase() === `${baseName.toLowerCase()}.srt`) ? 'srt' : 'vtt';
      const relativeUrlPath = publicVideoPath.substring(0, publicVideoPath.lastIndexOf('/')) + '/' + baseName + '_eng.vtt';
      subtitles.push({
        language: 'English',
        code: 'eng',
        format: 'vtt',
        default: false,
        url: relativeUrlPath
      });
    }
  } catch (e) {
    console.warn('Failed to check external subtitle directory:', e);
  }
  return subtitles;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Convert SRT content to VTT content natively
function convertSrtToVttContent(srtContent) {
  let vtt = srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  if (!vtt.startsWith('WEBVTT')) {
    vtt = 'WEBVTT\n\n' + vtt;
  }
  return vtt;
}

function convertLocalSrts(dir, baseName, isDryRun) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.toLowerCase().startsWith(baseName.toLowerCase()) && file.toLowerCase().endsWith('.srt')) {
        const ext = path.extname(file);
        const namePart = file.substring(0, file.length - ext.length);
        const subLang = namePart.includes('_') ? namePart.substring(namePart.lastIndexOf('_') + 1) : 'eng';
        const langCode = mapLanguageCode(subLang);

        const srtPath = path.join(dir, file);
        const vttPath = path.join(dir, `${baseName}_${langCode}.vtt`);

        if (isDryRun) {
          console.log(`[DRY RUN] Will convert subtitle ${srtPath} -> ${vttPath}`);
        } else {
          const srtContent = fs.readFileSync(srtPath, 'utf8');
          const vttContent = convertSrtToVttContent(srtContent);
          fs.writeFileSync(vttPath, vttContent, 'utf8');
          console.log(`${color.green}Converted Subtitle to VTT: ${vttPath}${color.reset}`);
        }
      }
    });
  } catch (e) {
    console.warn('Failed to convert local SRT files:', e);
  }
}

function extractAudioStreams(videoPath, dir, baseName, audioTracks, ffmpegAvailable, isDryRun) {
  let count = 0;
  if (!ffmpegAvailable) {
    // If ffmpeg is missing, fall back to EBML demuxer for MKV files
    console.log('FFmpeg is unavailable. Running fallback EBML binary demuxer...');
    const tracksInfo = {};
    audioTracks.forEach(t => {
      const outPath = path.join(dir, `${baseName}_${t.code}.m4a`);
      tracksInfo[t.trackNumber] = {
        name: t.language,
        lang: t.code,
        file: outPath,
        fd: null,
        written: 0
      };
    });

    if (isDryRun) {
      console.log(`[DRY RUN] Would demux audio using EBML binary demuxer for tracks:`, Object.keys(tracksInfo).join(', '));
      return Object.keys(tracksInfo).length;
    }

    try {
      demuxMkvBuffered(videoPath, tracksInfo);
      count = Object.keys(tracksInfo).length;
      console.warn(`${color.yellow}Warning: FFmpeg is missing. Extracted raw streams written to .m4a might not play in Chrome.${color.reset}`);
    } catch (e) {
      console.error('Fallback EBML demuxer failed:', e);
    }
    return count;
  }

  // FFmpeg extraction
  audioTracks.forEach((track) => {
    const outPath = path.join(dir, `${baseName}_${track.code}.m4a`);
    if (isDryRun) {
      console.log(`[DRY RUN] Extract stream ${track.streamIndex} -> ${outPath}`);
      count++;
    } else {
      try {
        console.log(`Extracting audio stream index ${track.streamIndex} (${track.language}) to AAC (.m4a)...`);
        // Map by streamIndex and convert to AAC
        execSync(`"${ffmpegPath}" -y -i "${videoPath}" -map 0:${track.streamIndex} -c:a aac -b:a 192k "${outPath}"`, { stdio: 'ignore' });
        console.log(`${color.green}Extracted: ${outPath}${color.reset}`);
        count++;
      } catch (e) {
        console.error(`Failed to extract audio track ${track.language} using ffmpeg:`, e);
      }
    }
  });
  return count;
}

function extractSubtitleStreams(videoPath, dir, baseName, subtitleTracks, ffmpegAvailable, isDryRun) {
  let count = 0;
  if (!ffmpegAvailable) {
    // Custom subtitles extraction from EBML container is complex, so we log that VTT companion files should be placed
    console.log('FFmpeg unavailable for subtitle extraction. Please place WebVTT companion files in the media folder.');
    return 0;
  }

  // FFmpeg subtitle extraction
  subtitleTracks.forEach((track) => {
    if (track.streamIndex === undefined) return; // Companion files don't need extraction
    const outPath = path.join(dir, `${baseName}_${track.code}.vtt`);
    if (isDryRun) {
      console.log(`[DRY RUN] Extract subtitle stream ${track.streamIndex} -> ${outPath}`);
      count++;
    } else {
      try {
        console.log(`Extracting subtitle stream index ${track.streamIndex} (${track.language}) to WebVTT...`);
        // FFmpeg automatically converts SRT/ASS subtitle streams to WebVTT when output path ends with .vtt!
        execSync(`"${ffmpegPath}" -y -i "${videoPath}" -map 0:${track.streamIndex} "${outPath}"`, { stdio: 'ignore' });
        console.log(`${color.green}Extracted Subtitle: ${outPath}${color.reset}`);
        count++;
      } catch (e) {
        console.error(`Failed to extract subtitle track ${track.language} using ffmpeg:`, e);
      }
    }
  });
  return count;
}

// ----------------------------------------------------
// Fallback MKV EBML Binary Parser & Demuxer Helpers
// ----------------------------------------------------
function readRawId(buffer, offset) {
  if (offset >= buffer.length) return { value: -1, length: 0 };
  const firstByte = buffer[offset];
  if (firstByte === 0 || firstByte === undefined) return { value: -1, length: 0 };
  
  let length = 1;
  while ((firstByte & (0x80 >> (length - 1))) === 0) {
    length++;
    if (length > 8) return { value: -1, length: 0 };
  }
  
  if (offset + length > buffer.length) return { value: -1, length: 0 };
  
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = (value << 8) | buffer[offset + i];
  }
  return { value, length };
}

function readVint(buffer, offset) {
  if (offset >= buffer.length) return { value: -1, length: 0 };
  const firstByte = buffer[offset];
  if (firstByte === 0 || firstByte === undefined) return { value: -1, length: 0 };
  
  let length = 1;
  while ((firstByte & (0x80 >> (length - 1))) === 0) {
    length++;
    if (length > 8) return { value: -1, length: 0 };
  }
  
  if (offset + length > buffer.length) return { value: -1, length: 0 };
  
  let value = firstByte & (0xFF >> length);
  for (let i = 1; i < length; i++) {
    value = (value << 8) | buffer[offset + i];
  }
  return { value, length };
}

function parseMkvEbml(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const size = fs.fstatSync(fd).size;
  const searchLimit = Math.min(size, 40 * 1024 * 1024); // Scan first 40MB
  const buffer = Buffer.alloc(searchLimit);
  fs.readSync(fd, buffer, 0, searchLimit, 0);
  fs.closeSync(fd);

  const TRACKS_ID = Buffer.from([0x16, 0x54, 0xAE, 0x6B]);
  let offset = -1;
  let duration = 7200; // Default placeholder if not found

  // Try to find Segment Info for Duration
  const INFO_ID = Buffer.from([0x15, 0x49, 0xA9, 0x66]);
  let infoOffset = buffer.indexOf(INFO_ID);
  if (infoOffset !== -1) {
    const sizeVint = readVint(buffer, infoOffset + 4);
    if (sizeVint.length > 0) {
      let curr = infoOffset + 4 + sizeVint.length;
      const infoEnd = curr + sizeVint.value;
      let timecodeScale = 1000000;
      let rawDuration = 0;

      while (curr < infoEnd && curr < searchLimit) {
        const idVint = readRawId(buffer, curr);
        if (idVint.length === 0) break;
        const elemSizeVint = readVint(buffer, curr + idVint.length);
        if (elemSizeVint.length === 0) break;

        const valOffset = curr + idVint.length + elemSizeVint.length;
        
        if (idVint.value === 0x2AD7B1) { // TimecodeScale
          let scale = 0;
          for (let i = 0; i < elemSizeVint.value; i++) {
            scale = (scale << 8) | buffer[valOffset + i];
          }
          timecodeScale = scale;
        } else if (idVint.value === 0x4489) { // Duration
          if (elemSizeVint.value === 4) {
            rawDuration = buffer.readFloatBE(valOffset);
          } else if (elemSizeVint.value === 8) {
            rawDuration = buffer.readDoubleBE(valOffset);
          }
        }
        curr = valOffset + elemSizeVint.value;
      }
      if (rawDuration > 0) {
        duration = Math.round((rawDuration * timecodeScale) / 1000000000);
      }
    }
  }

  while (true) {
    offset = buffer.indexOf(TRACKS_ID, offset + 1);
    if (offset === -1) break;
    
    const sizeVint = readVint(buffer, offset + 4);
    if (sizeVint.length === 0) continue;
    
    const tracksContentOffset = offset + 4 + sizeVint.length;
    const tracksEnd = tracksContentOffset + sizeVint.value;
    if (tracksEnd > searchLimit) continue;

    const TRACK_ENTRY_ID = 0xAE;
    const TRACK_NUMBER_ID = 0xD7;
    const TRACK_TYPE_ID = 0x83;
    const LANGUAGE_ID = 0x22B59C;
    const CODEC_ID = 0x86;

    let curr = tracksContentOffset;
    const audioTracks = [];
    const subtitleTracks = [];

    while (curr < tracksEnd) {
      if (curr >= buffer.length) break;
      const idVint = readRawId(buffer, curr);
      if (idVint.length === 0) break;
      const subSizeVint = readVint(buffer, curr + idVint.length);
      if (subSizeVint.length === 0) break;

      const contentOffset = curr + idVint.length + subSizeVint.length;
      const nextOffset = contentOffset + subSizeVint.value;

      if (idVint.value === TRACK_ENTRY_ID) {
        let entryOffset = contentOffset;
        const entryEnd = contentOffset + subSizeVint.value;
        const currentTrack = { trackNumber: 0, type: 'unknown', language: 'eng', codec: 'unknown' };

        while (entryOffset < entryEnd) {
          const subId = readRawId(buffer, entryOffset);
          if (subId.length === 0) break;
          const elemSize = readVint(buffer, entryOffset + subId.length);
          if (elemSize.length === 0) break;

          const valOffset = entryOffset + subId.length + elemSize.length;

          if (subId.value === TRACK_NUMBER_ID) {
            let num = 0;
            for (let i = 0; i < elemSize.value; i++) {
              num = (num << 8) | buffer[valOffset + i];
            }
            currentTrack.trackNumber = num;
          } else if (subId.value === TRACK_TYPE_ID) {
            let typeVal = 0;
            for (let i = 0; i < elemSize.value; i++) {
              typeVal = (typeVal << 8) | buffer[valOffset + i];
            }
            currentTrack.type = typeVal === 1 ? 'vide' : (typeVal === 2 ? 'soun' : (typeVal === 17 ? 'subt' : 'other'));
          } else if (subId.value === LANGUAGE_ID) {
            currentTrack.language = mapLanguageCode(buffer.toString('utf8', valOffset, valOffset + elemSize.value).replace(/\0/g, '').trim());
          } else if (subId.value === CODEC_ID) {
            currentTrack.codec = buffer.toString('utf8', valOffset, valOffset + elemSize.value).replace(/\0/g, '').trim();
          }

          entryOffset = valOffset + elemSize.value;
        }

        if (currentTrack.type === 'soun') {
          audioTracks.push(currentTrack);
        } else if (currentTrack.type === 'subt') {
          subtitleTracks.push(currentTrack);
        }
      }
      curr = nextOffset;
    }

    if (audioTracks.length > 0 || subtitleTracks.length > 0) {
      return { duration, audioTracks, subtitleTracks };
    }
  }

  return { duration, audioTracks: [], subtitleTracks: [] };
}

function demuxMkvBuffered(filePath, tracksInfo) {
  const fd = fs.openSync(filePath, 'r');
  const stat = fs.fstatSync(fd);
  const fileSize = stat.size;

  // Open output files
  for (const trackId in tracksInfo) {
    tracksInfo[trackId].fd = fs.openSync(tracksInfo[trackId].file, 'w');
    tracksInfo[trackId].written = 0;
  }

  const containerIds = new Set([
    0x18538067, // Segment
    0x1F43B675, // Cluster
    0xA0        // BlockGroup
  ]);

  const blockIds = new Set([
    0xA3, // SimpleBlock
    0xA1  // Block
  ]);

  const BUFFER_SIZE = 12 * 1024 * 1024; // 12MB buffer
  const buffer = Buffer.alloc(BUFFER_SIZE);
  let bufferOffset = 0;
  let bufferLength = 0;
  let filePosition = 0;

  function fillBuffer() {
    if (bufferOffset > 0) {
      const remaining = bufferLength - bufferOffset;
      if (remaining > 0) {
        buffer.copy(buffer, 0, bufferOffset, bufferLength);
      }
      bufferLength = remaining;
      bufferOffset = 0;
    }
    const toRead = BUFFER_SIZE - bufferLength;
    if (toRead > 0 && filePosition < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, bufferLength, toRead, filePosition);
      bufferLength += bytesRead;
      filePosition += bytesRead;
    }
  }

  function readIdFromBuffer() {
    if (bufferLength - bufferOffset < 4) fillBuffer();
    if (bufferLength - bufferOffset === 0) return null;
    const firstByte = buffer[bufferOffset];
    let length = 1;
    while ((firstByte & (0x80 >> (length - 1))) === 0) {
      length++;
      if (length > 4) return null;
    }
    if (bufferLength - bufferOffset < length) {
      fillBuffer();
      if (bufferLength - bufferOffset < length) return null;
    }
    let id = 0;
    for (let i = 0; i < length; i++) {
      id = (id << 8) | buffer[bufferOffset + i];
    }
    bufferOffset += length;
    return id;
  }

  function readSizeFromBuffer() {
    if (bufferLength - bufferOffset < 8) fillBuffer();
    if (bufferLength - bufferOffset === 0) return null;
    const firstByte = buffer[bufferOffset];
    let length = 1;
    while ((firstByte & (0x80 >> (length - 1))) === 0) {
      length++;
      if (length > 8) return null;
    }
    if (bufferLength - bufferOffset < length) {
      fillBuffer();
      if (bufferLength - bufferOffset < length) return null;
    }
    let value = firstByte & (0xFF >> length);
    for (let i = 1; i < length; i++) {
      value = (value << 8) | buffer[bufferOffset + i];
    }
    bufferOffset += length;
    return value;
  }

  while (true) {
    if (bufferLength - bufferOffset < 16) {
      fillBuffer();
      if (bufferLength - bufferOffset === 0) break;
    }

    const currentElemFileOffset = filePosition - bufferLength + bufferOffset;
    const idStartOffset = bufferOffset;
    const id = readIdFromBuffer();
    if (id === null) break;

    const idLength = bufferOffset - idStartOffset;
    const sizeStartOffset = bufferOffset;
    const elementSize = readSizeFromBuffer();
    if (elementSize === null) break;

    const sizeLength = bufferOffset - sizeStartOffset;
    const headerSize = idLength + sizeLength;

    if (containerIds.has(id)) {
      continue;
    } else if (blockIds.has(id)) {
      if (bufferLength - bufferOffset < elementSize) {
        fillBuffer();
        if (bufferLength - bufferOffset < elementSize) {
          console.error('Error: Block size larger than buffer size!');
          break;
        }
      }
      const blockStart = bufferOffset;
      // Parse Track Number VINT
      const trackVint = readVint(buffer, bufferOffset);
      if (trackVint && trackVint.length > 0) {
        const trackNumber = trackVint.value;
        const trackInfo = tracksInfo[trackNumber];
        if (trackInfo) {
          const blockHeaderSize = trackVint.length + 3; // timecode(2) + flags(1)
          const payloadSize = elementSize - blockHeaderSize;
          const payloadOffset = blockStart + blockHeaderSize;
          if (payloadSize > 0) {
            fs.writeSync(trackInfo.fd, buffer, payloadOffset, payloadSize);
            trackInfo.written += payloadSize;
          }
        }
      }
      bufferOffset = blockStart + elementSize;
    } else {
      const remainingInBuffer = bufferLength - bufferOffset;
      if (remainingInBuffer >= elementSize) {
        bufferOffset += elementSize;
      } else {
        bufferOffset = 0;
        bufferLength = 0;
        filePosition = currentElemFileOffset + headerSize + elementSize;
      }
    }
  }

  // Close files
  fs.closeSync(fd);
  for (const trackId in tracksInfo) {
    fs.closeSync(tracksInfo[trackId].fd);
    console.log(`Track ${trackId} (${tracksInfo[trackId].name}): Demuxed ${(tracksInfo[trackId].written / (1024 * 1024)).toFixed(2)} MB`);
  }
}

main();
