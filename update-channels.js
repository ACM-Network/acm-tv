/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = './src/config/channels.json';
const channelsData = JSON.parse(fs.readFileSync(path, 'utf8'));

const durations = JSON.parse(fs.readFileSync('durations.json', 'utf8'));
const metadata = JSON.parse(fs.readFileSync('tmdb-metadata.json', 'utf8'));

const streams = {
  'the-family-star': 'https://d3sgzbosmwirao.cloudfront.net/video/f36f1d5c789e7104ff5b1785a117ffde4de9f9ef39f636b004adb7c6cd309bec/1/hls/h264_high.m3u8',
  'adipurush': 'https://d3sgzbosmwirao.cloudfront.net/video/cd82740e63c46e3515b99131e2e932f6a04435e739697626dca3d0e85fc7b5fc/1/hls/h264_high.m3u8',
  'train-to-busan': 'https://d3sgzbosmwirao.cloudfront.net/video/33c589bec0ad581342ed465c158580742c40f53bc5331d744940c038602972ba/1/hls/h264_high.m3u8',
  'drushyam-2': 'https://d3sgzbosmwirao.cloudfront.net/video/54f32048a38168ce0c2d77363b678205d6b5249d019ed3ac5fa5ac51fd319821/1/hls/h264_high.m3u8',
  'narappa': 'https://d3sgzbosmwirao.cloudfront.net/video/9979233aa3b683125701fc09b457257ad5f89ba83014434447a88811d46cc7d0/1/hls/h264_high.m3u8',
  'ek-mini-katha': 'https://d3sgzbosmwirao.cloudfront.net/video/26cdb458780a6d20bc2dabbd16870d6e0e371dcd26ef67bd58f2c6f0ce95c62d/1/hls/h264_high.m3u8',
  'middle-class-melodies': 'https://d3sgzbosmwirao.cloudfront.net/video/4685562a9dc6e6bf16c381f551240964a1e1f70ad65a83385fd9e394e578a6fa/1/hls/h264_high.m3u8',
  'operation-valentine': 'https://d3sgzbosmwirao.cloudfront.net/video/ab04d2e5ae0b261162badd2490f6e24c8bf9758a5d86e2f648d6e49a84409784/4/hls/h264_high.m3u8'
};

const newMovies = [];

// Map some better genres based on title
const genreMap = {
  'the-family-star': 'Romance',
  'adipurush': 'Mythology',
  'train-to-busan': 'Horror',
  'drushyam-2': 'Thriller',
  'narappa': 'Action',
  'ek-mini-katha': 'Comedy',
  'middle-class-melodies': 'Comedy',
  'operation-valentine': 'Action'
};

for (const [id, url] of Object.entries(streams)) {
  const meta = metadata[id];
  const duration = durations[id];
  
  newMovies.push({
    id: id,
    title: meta.title,
    description: meta.description,
    duration: duration,
    videoUrl: url,
    type: 'content',
    category: genreMap[id] || meta.category,
    thumbnail: meta.thumbnail,
    year: meta.year,
    language: id === 'train-to-busan' ? 'Korean' : 'Telugu',
    backdrop: meta.backdrop
  });
}

// Find acm-movies
const acmMoviesChannel = channelsData.channels.find(c => c.id === 'acm-movies');

// Avoid duplicates if script run multiple times
const existingIds = new Set(acmMoviesChannel.programs.map(p => p.id));
for (const m of newMovies) {
  if (!existingIds.has(m.id)) {
    acmMoviesChannel.programs.push(m);
  }
}

fs.writeFileSync(path, JSON.stringify(channelsData, null, 2));
console.log('Channels updated.');
