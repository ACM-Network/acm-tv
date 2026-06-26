"use client";

import React, { useRef, useState, useEffect } from 'react';
import { VolumeX, Volume2, Maximize2, Minimize2, Tv, Wifi, AlertTriangle, Loader2 , Play, Pause} from 'lucide-react';
import { Channel, ProgramInstance, BroadcastState } from '../types';
import { getBroadcastState, formatLocalTime } from '../utils/scheduleEngine';
import { getDirectVideoUrl } from '../utils/videoParser';
import StandbyOverlay from './StandbyOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import AudioTrackSelector, { AudioTrack } from './AudioTrackSelector';
import SubtitleSelector, { SubtitleTrack } from './SubtitleSelector';
import Hls from 'hls.js';

const getUnixTimeMs = () => Date.now();

interface ExtendedAudioTrack extends AudioTrack {
  url?: string;
  default?: boolean;
  codec?: string;
}

interface HTMLVideoElementWithAudioTracks extends HTMLVideoElement {
  audioTracks?: {
    length: number;
    [index: number]: {
      id: string;
      label: string;
      language: string;
      enabled: boolean;
    };
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
  };
}

interface CachedMetadata {
  duration?: number;
  hls?: string;
  video?: string;
  audioTracks?: { default?: boolean; [key: string]: unknown }[];
  subtitles?: { code?: string; language: string; format?: string; default?: boolean; url?: string }[];
  [key: string]: unknown;
}

const validateRemoteUrl = async (url: string): Promise<{ success: boolean; reason?: string }> => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && !contentType.startsWith('video/') && !contentType.startsWith('application/x-mpegURL') && !contentType.startsWith('application/vnd.apple.mpegurl')) {
        if (contentType !== 'application/octet-stream') {
          return { success: false, reason: `Invalid content-type: ${contentType}` };
        }
      }
      return { success: true };
    } else if (res.status === 404) {
      return { success: false, reason: `URL returned 404 Not Found` };
    } else {
      return { success: false, reason: `URL returned status code: ${res.status}` };
    }
  } catch {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      return { success: true };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      return { success: false, reason: `Host unreachable or connection failed: ${errMsg}` };
    }
  }
};

interface TVPlayerProps {
  channel: Channel;
  onStateChange?: (state: BroadcastState) => void;
}

export default function TVPlayer({ channel, onStateChange }: TVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [broadcastState, setBroadcastState] = useState<BroadcastState | null>(null);
  const [hasAudioTrackSupport, setHasAudioTrackSupport] = useState(false);
  const [audioTracks, setAudioTracks] = useState<ExtendedAudioTrack[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTapToUnmute, setShowTapToUnmute] = useState(true);
  const [showControls, setShowControls] = useState(true);
  
  // Loading & Media Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>('');

  const failedProgramsRef = useRef<Record<string, boolean>>({});
  const updateFailedProgram = (instanceId: string, nowMs: number) => {
    failedProgramsRef.current = { ...failedProgramsRef.current, [instanceId]: true };
    updateBroadcastState(nowMs);
  };

  
  // Ref to track the current active instance ID to avoid unnecessary src changes
  const activeInstanceIdRef = useRef<string>('');
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive progress bar hover states
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTimeStr, setHoverTimeStr] = useState<string>('');
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Hls.js diagnostics and state
  const hlsRef = useRef<Hls | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);

  // Aspect Ratio & Display Mode
  const [displayMode, setDisplayMode] = useState<'Auto' | 'Contain' | 'Cover' | 'Fill' | 'Stretch'>('Auto');
  const [autoFit, setAutoFit] = useState<'contain' | 'cover'>('contain');

  // HLS Stream Info
  // Volume
  const [volume, setVolume] = useState<number>(1.0);

  // Picture-in-Picture
  const [isPipSupported, setIsPipSupported] = useState<boolean>(false);
  const [isPipActive, setIsPipActive] = useState<boolean>(false);

  // Channel Info Overlay
  const [showInfoOverlay, setShowInfoOverlay] = useState<boolean>(true);
  const infoOverlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Movie Title Card Overlay
  const [showTitleCard, setShowTitleCard] = useState<boolean>(false);

  // Stability counters & safeguards
  const reloadTimestampsRef = useRef<number[]>([]);
  const downgradeTimestampsRef = useRef<number[]>([]);
  const stablePlaybackSecondsRef = useRef<number>(0);
  const maxLevelCapRef = useRef<number>(-1);

  // Clock state to prevent impure Date.now() during render
  const [localTimeMs, setLocalTimeMs] = useState<number>(0);

  useEffect(() => {
    setTimeout(() => {
      setLocalTimeMs(getUnixTimeMs());
    }, 0);
    const timer = setInterval(() => {
      setLocalTimeMs(getUnixTimeMs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const destroyHls = () => {
    if (hlsRef.current) {
      console.log('[ACM TV] Destroying active Hls instance...');
      try {
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (err) {
        console.error('Error destroying Hls instance:', err);
      }
      hlsRef.current = null;
    }
  };

  const getObjectFitStyle = (): React.CSSProperties => {
    const mode = displayMode;
    if (mode === 'Contain') return { objectFit: 'contain' };
    if (mode === 'Cover') return { objectFit: 'cover' };
    if (mode === 'Fill') return { objectFit: 'cover' };
    if (mode === 'Stretch') return { objectFit: 'fill' };
    if (mode === 'Auto') {
      return { objectFit: autoFit };
    }
    return { objectFit: 'contain' };
  };

  const updateAutoFit = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setAutoFit('contain');
      return;
    }
    const videoRatio = video.videoWidth / video.videoHeight;
    const containerWidth = containerRef.current?.clientWidth || 1600;
    const containerHeight = containerRef.current?.clientHeight || 900;
    const containerRatio = containerWidth / containerHeight;

    if (Math.abs(videoRatio - containerRatio) < 0.15) {
      setAutoFit('cover');
    } else if (videoRatio < 1.5) {
      setAutoFit('contain');
    } else if (videoRatio > 1.85) {
      setAutoFit('contain');
    } else {
      setAutoFit('contain');
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const val = Math.max(0, Math.min(1, newVolume));
    setVolume(val);
    const video = videoRef.current;
    if (video) {
      video.volume = val;
      video.muted = val === 0;
      setIsMuted(val === 0);
    }
    try {
      localStorage.setItem('acm_tv_volume', val.toString());
    } catch {}
  };

  // Load display mode, volume, and support on mount (SSR Safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        try {
          const savedMode = localStorage.getItem('acm_tv_display_mode');
          if (savedMode && ['Auto', 'Contain', 'Cover', 'Fill', 'Stretch'].includes(savedMode)) {
            setDisplayMode(savedMode as 'Auto' | 'Contain' | 'Cover' | 'Fill' | 'Stretch');
          } else {
            setDisplayMode('Auto');
          }
        } catch {
          setDisplayMode('Auto');
        }

        try {
          const savedVolume = localStorage.getItem('acm_tv_volume');
          if (savedVolume !== null) {
            const parsed = parseFloat(savedVolume);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
              setVolume(parsed);
              setIsMuted(parsed === 0);
              if (videoRef.current) {
                videoRef.current.volume = parsed;
                videoRef.current.muted = parsed === 0;
              }
            }
          }
        } catch {}

        // PiP Support Check
        const video = videoRef.current;
        const pipSupported = !!(document.pictureInPictureEnabled && video && video.requestPictureInPicture);
        setIsPipSupported(pipSupported);
      }, 0);

      // Resize listener for auto fit calculations
      window.addEventListener('resize', updateAutoFit);
      return () => window.removeEventListener('resize', updateAutoFit);
    }
  }, []);
  // Controls autohide timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for drift correction and error recovery tracking
  const driftExceededStartRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const metadataCacheRef = useRef<Record<string, CachedMetadata>>({});
  const fileExistenceCacheRef = useRef<Record<string, boolean>>({});

  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const lastTimeRef = useRef<number>(-1);
  const stallCountRef = useRef<number>(0);
  const isStalledState = useRef<boolean>(false);

  // Helper to check if file exists (returns 404 safety check with caching)
  const verifyFileExists = async (url: string): Promise<boolean> => {
    if (fileExistenceCacheRef.current[url] !== undefined) {
      return fileExistenceCacheRef.current[url];
    }
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const exists = res.status !== 404;
      fileExistenceCacheRef.current[url] = exists;
      return exists;
    } catch {
      return true; // Assume present on CORS/network errors to prevent false negatives
    }
  };

  const fetchAndCacheMetadata = async (videoUrl: string, programMetadataUrl?: string) => {
    let metadataUrl = programMetadataUrl;
    if (!metadataUrl) {
      const urlWithoutQuery = videoUrl.split('?')[0];
      const lastDotIndex = urlWithoutQuery.lastIndexOf('.');
      const base = lastDotIndex !== -1 ? urlWithoutQuery.substring(0, lastDotIndex) : urlWithoutQuery;
      metadataUrl = base + '.metadata.json';
    }

    if (metadataCacheRef.current[metadataUrl]) {
      return metadataCacheRef.current[metadataUrl];
    }

    try {
      const res = await fetch(metadataUrl);
      if (!res.ok) {
        throw new Error(`Status: ${res.status}`);
      }
      const data = await res.json();

      // Validate metadata schema
      const warnings: string[] = [];
      let isMetadataValid = true;

      if (!data || typeof data !== 'object') {
        console.warn(`[ACM TV][METADATA WARNING] Metadata for ${metadataUrl} is not an object`);
        return null;
      }

      if (data.version === undefined) {
        warnings.push('Missing schema version');
        data.version = 1;
      } else if (typeof data.version !== 'number' || data.version <= 0) {
        warnings.push(`Invalid schema version: ${data.version}`);
        data.version = 1;
      }

      if (!data.video && !data.hls) {
        warnings.push('Missing video/hls path');
        isMetadataValid = false;
      }

      if (data.duration === undefined) {
        warnings.push('Missing duration');
        isMetadataValid = false;
      } else if (typeof data.duration !== 'number' || data.duration <= 0) {
        warnings.push(`Invalid duration: ${data.duration}`);
        isMetadataValid = false;
      }

      // Check default track validation
      if (Array.isArray(data.audioTracks)) {
        let hasDefault = false;
        data.audioTracks.forEach((t: { default?: boolean }) => {
          if (t.default) hasDefault = true;
        });
        if (data.audioTracks.length > 0 && !hasDefault) {
          warnings.push('No audio track is marked as default. Marking first track as default.');
          data.audioTracks[0].default = true;
        }
      }

      if (warnings.length > 0) {
        console.warn(`[ACM TV][METADATA WARNINGS] Validation warnings for ${metadataUrl}:\n - ${warnings.join('\n - ')}`);
      }

      if (!isMetadataValid) {
        console.warn(`[ACM TV][METADATA] Critical validation failed for ${metadataUrl}, falling back.`);
        return null;
      }

      // HEAD check audio tracks
      const verifiedAudio = [];
      if (Array.isArray(data.audioTracks)) {
        for (const track of data.audioTracks) {
          if (track.url) {
            console.log(`[ACM TV][AUDIO] Verifying audio track: ${track.language} (${track.url})`);
            const exists = await verifyFileExists(track.url);
            if (exists) {
              verifiedAudio.push(track);
            } else {
              console.warn(`[ACM TV][METADATA] Audio track file missing (404), removing from selector: ${track.url}`);
            }
          } else {
            verifiedAudio.push(track);
          }
        }
      }

      // HEAD check subtitles
      const verifiedSubtitles = [];
      if (Array.isArray(data.subtitles)) {
        for (const sub of data.subtitles) {
          if (sub.url) {
            const exists = await verifyFileExists(sub.url);
            if (exists) verifiedSubtitles.push(sub);
            else console.warn(`[ACM TV][METADATA] Subtitle file missing: ${sub.url}`);
          } else {
            verifiedSubtitles.push(sub);
          }
        }
      }

      const validated = {
        ...data,
        audioTracks: verifiedAudio,
        subtitles: verifiedSubtitles
      };

      metadataCacheRef.current[metadataUrl] = validated;
      return validated;
    } catch (e) {
      console.warn(`[ACM TV][METADATA] Could not fetch metadata from: ${metadataUrl}. Using defaults.`, e);
      return null;
    }
  };

  const markProgramUnhealthyAndSkip = (nowMs: number) => {
    const currentInst = broadcastState?.currentProgram;
    if (currentInst) {
      console.error(`[ACM TV] Stability Manager: Marking program instance ${currentInst.program.title} (${currentInst.instanceId}) unhealthy and advancing schedule.`);
      updateFailedProgram(currentInst.instanceId, nowMs);
    }
  };

  const handleBufferingEvent = (nowMs: number) => {
    // Filter to last 60s
    downgradeTimestampsRef.current = downgradeTimestampsRef.current.filter(t => nowMs - t < 60000);
    downgradeTimestampsRef.current.push(nowMs);

    // Downgrade HLS quality cap: One step lower only if needed
    if (hlsRef.current && hlsRef.current.levels.length > 1) {
      const hls = hlsRef.current;
      const highestLevelIdx = hls.levels.length - 1;
      const newCap = highestLevelIdx - 1;
      if (maxLevelCapRef.current === -1 || newCap < maxLevelCapRef.current) {
        maxLevelCapRef.current = newCap;
        hls.autoLevelCapping = newCap;
        hls.currentLevel = -1; // Unlock level so it can switch down
        console.warn(`[ACM TV] Stability Manager: Buffering detected. Downgrading max level cap to: index ${newCap} (${hls.levels[newCap].height}p)`);
      }
    }
  };

  const updateBroadcastState = (nowMs: number) => {
    try {
      const now = nowMs;
      const state = getBroadcastState(channel, now);
      
      let currentInst: ProgramInstance | null = state.currentProgram;
      let playbackPos = state.playbackPosition;
      let fallbackDepth = 0;

      while (currentInst && failedProgramsRef.current[currentInst.instanceId] && fallbackDepth < 5) {
        fallbackDepth++;
        console.warn(`[ACM TV][VALIDATION] Skip failed program instance: ${currentInst.program.id} (Instance: ${currentInst.instanceId})`);
        if (fallbackDepth === 1) {
          currentInst = state.upNext;
          playbackPos = 0;
        } else {
          const laterIdx = fallbackDepth - 2;
          if (state.laterTonight && state.laterTonight[laterIdx]) {
            currentInst = state.laterTonight[laterIdx];
            playbackPos = 0;
          } else {
            currentInst = null;
            break;
          }
        }
      }

      if (!currentInst) {
        console.error("[ACM TV][VALIDATION] All fallback programs failed validation! Triggering Standby.");
        setIsFallbackActive(true);
        return;
      }

      const adjustedState = {
        ...state,
        currentProgram: currentInst,
        playbackPosition: playbackPos
      };

      setBroadcastState(adjustedState);
      if (onStateChange) onStateChange(adjustedState);

      // Program Switch Check
      if (activeInstanceIdRef.current !== currentInst.instanceId) {
        // Switching is handled asynchronously inside the useEffect listening to instanceId
      } else {
        const video = videoRef.current;
        if (video && !mediaError) {
          const actualPos = video.currentTime;
          const targetPos = playbackPos;
          const drift = Math.abs(targetPos - actualPos);

          // Get buffered ranges
          const bufferedRanges: string[] = [];
          for (let i = 0; i < video.buffered.length; i++) {
            bufferedRanges.push(`[${video.buffered.start(i).toFixed(1)}s-${video.buffered.end(i).toFixed(1)}s]`);
          }

          // Get network state label
          const networkStates = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
          const netState = networkStates[video.networkState] || `UNKNOWN (${video.networkState})`;

          // Diagnostic Logging
          console.log(
            `[ACM TV][DIAGNOSTICS]\n` +
            `  Current Time: ${actualPos.toFixed(2)}s\n` +
            `  Target Time:  ${targetPos.toFixed(2)}s\n` +
            `  Drift:        ${drift.toFixed(2)}s\n` +
            `  ReadyState:   ${video.readyState}\n` +
            `  Buffered:     ${bufferedRanges.join(', ') || 'none'}\n` +
            `  NetworkState: ${netState}\n` +
            `  Paused:       ${video.paused}\n` +
            `  Seeking:      ${video.seeking}\n` +
            `  Buffering:    ${isBuffering}`
          );

          // STALL DETECTION LOGIC
          // Check if playhead is stuck while not paused, seeking, or loading
          const isActuallyPlaying = !video.paused && !video.seeking && !isBuffering && !isLoading;
          if (isActuallyPlaying) {
            if (actualPos === lastTimeRef.current) {
              stallCountRef.current += 1;
              if (stallCountRef.current >= 2) {
                isStalledState.current = true;
                console.warn(`[ACM TV][STALL] Playback stalled at position ${actualPos.toFixed(2)}s for over 5 seconds.`);
                
                // STALL RECOVERY: Attempt silent recovery without skipping
                console.log(`[ACM TV][STALL RECOVERY] Attempting reload for instance ${currentInst.instanceId}.`);

                try {
                  const duration = video.duration || currentInst.program.duration || 1;
                  const newSeek = targetPos % duration;
                  if (hlsRef.current) {
                    console.log("[ACM TV] Recovery: Re-creating Hls instance.");
                    destroyHls();
                    loadAndPlaySource(videoSrc, newSeek, currentInst.instanceId);
                  } else {
                    video.load();
                    video.currentTime = newSeek;
                    video.play()
                      .then(() => {
                        isStalledState.current = false;
                        stallCountRef.current = 0;
                      })
                      .catch((err) => {
                        console.error("Play recovery failed:", err);
                      });
                  }
                } catch (err) {
                  console.error("Stall recovery error:", err);
                }
              }
            } else {
              stallCountRef.current = 0;
              isStalledState.current = false;
              lastTimeRef.current = actualPos;
            }
          } else {
            stallCountRef.current = 0;
          }

          const skipDrift = video.seeking || isBuffering || video.readyState < 3 || video.paused;
          if (skipDrift) {
            driftExceededStartRef.current = null;
          } else if (drift > 12.0) {
            if (driftExceededStartRef.current === null) {
              driftExceededStartRef.current = nowMs;
            } else {
              const elapsed = nowMs - driftExceededStartRef.current;
              if (elapsed >= 5000) {
                console.log(`[ACM TV][RECOVERY] Drift of ${drift.toFixed(1)}s exceeded 12s threshold continuously for 5s. Correcting time to target: ${targetPos.toFixed(1)}s.`);
                video.currentTime = targetPos;
                driftExceededStartRef.current = null;
              }
            }
          } else {
            driftExceededStartRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error("[ACM TV] Schedule engine state calculation error:", err);
      setMediaError("Schedule calculation error");
    }
  };

  // Helper to load and play the video source
  const loadAndPlaySource = (src: string, seekOffset: number, instId: string) => {
    const video = videoRef.current;
    if (!video) return;

    const isHlsUrl = src.includes('.m3u8');

    // Destroy existing HLS instance
    destroyHls();

    // Setup 20-second startup timeout for HLS or standard content
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    loadingTimeoutRef.current = setTimeout(() => {
      if (activeInstanceIdRef.current === instId) {
        console.error(`[ACM TV] Loading/manifest startup timeout (20s) exceeded for instance: ${instId}`);
        updateFailedProgram(instId, getUnixTimeMs());
      }
    }, 20000);

    if (isHlsUrl) {

      if (Hls.isSupported()) {
        console.log(`[ACM TV] Initializing hls.js for source: ${src}`);
        const hls = new Hls({
          startPosition: seekOffset,
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingMaxRetry: 5,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 20000,
          levelLoadingMaxRetry: 5,
          levelLoadingRetryDelay: 1000,
          levelLoadingMaxRetryTimeout: 20000,
          fragLoadingMaxRetry: 5,
          fragLoadingRetryDelay: 1000,
          fragLoadingMaxRetryTimeout: 20000
        });

        hlsRef.current = hls;

        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(src);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[ACM TV] Hls manifest parsed. Level count:', hls.levels.length);

          // Always start and lock to highest available quality level
          let highestLevelIdx = hls.levels.length - 1;
          let maxBitrate = 0;
          for (let i = 0; i < hls.levels.length; i++) {
            if (hls.levels[i].bitrate > maxBitrate) {
              maxBitrate = hls.levels[i].bitrate;
              highestLevelIdx = i;
            }
          }
          
          hls.startLevel = highestLevelIdx;
          hls.currentLevel = highestLevelIdx; // Lock to highest initially
          maxLevelCapRef.current = highestLevelIdx;
          hls.autoLevelCapping = highestLevelIdx;
          stablePlaybackSecondsRef.current = 0;

          console.log(`[ACM TV] Quality locked to highest index: ${highestLevelIdx}`);

          video.play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
              consecutiveErrorsRef.current = 0;
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
            })
            .catch((err) => {
              if (err.name === 'NotAllowedError') {
                console.warn("[ACM TV] Autoplay blocked for HLS stream.");
                setIsMuted(true);
                setShowTapToUnmute(true);
                video.muted = true;
                video.play().catch(e => console.error("Muted HLS play failed:", e));
              } else if (err.name !== 'AbortError') {
                handlePlaybackError('Hls play call rejected', err);
              }
            });
        });



        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error(`[ACM TV] Fatal HLS error: ${data.type} - ${data.details}`);
            
            const responseCode = data.response?.code;
            const is404 = responseCode === 404;

            if (is404) {
              console.warn(`[ACM TV] Fatal 404 error detected. Skipping program.`);
              updateFailedProgram(instId, getUnixTimeMs());
            } else {
              // Rate limit reloads to 3 within 60 seconds
              const now = getUnixTimeMs();
              reloadTimestampsRef.current = reloadTimestampsRef.current.filter(t => now - t < 60000);
              if (reloadTimestampsRef.current.length >= 3) {
                console.error("[ACM TV] Stability Manager: Fatal HLS error reload limit exceeded. Skipping program.");
                updateFailedProgram(instId, now);
                return;
              }
              reloadTimestampsRef.current.push(now);

              console.log('[ACM TV] Attempting silent recovery...');
              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                hls.startLoad();
              } else {
                setTimeout(() => {
                  if (activeInstanceIdRef.current === instId) {
                    hls.startLoad();
                  }
                }, 3000);
              }
            }
          } else {
            console.warn(`[ACM TV] Non-fatal HLS error: ${data.details}`);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log(`[ACM TV] Native HLS supported. Loading URL: ${src}`);
        
        video.src = src;
        video.load();
        
        const playNative = () => {
          video.currentTime = seekOffset;
          video.play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
              consecutiveErrorsRef.current = 0;
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
            })
            .catch(err => {
              if (err.name === 'NotAllowedError') {
                setShowTapToUnmute(true);
              } else if (err.name !== 'AbortError') {
                handlePlaybackError('Native Hls play failed', err);
              }
            });
          video.removeEventListener('loadedmetadata', playNative);
        };
        video.addEventListener('loadedmetadata', playNative);
      } else {
        console.error('[ACM TV] HLS is not supported in this browser!');
        if (instId) {
          updateFailedProgram(instId, getUnixTimeMs());
        }
      }
    } else {

      if (video.src !== src && !video.src.endsWith(src)) {
        console.log(`[ACM TV] Loading standard source: ${src}`);
        video.src = src;
        video.load();
      }

      video.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
          consecutiveErrorsRef.current = 0;
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
        })
        .catch((err) => {
          if (err.name === 'NotAllowedError') {
            setShowTapToUnmute(true);
          } else if (err.name !== 'AbortError') {
            handlePlaybackError('MP4 play failed', err);
          }
        });
    }
  };

  const updateVideoStats = (video: HTMLVideoElement) => {
    setVideoCurrentTime(video.currentTime);
    if (video.duration && video.duration !== videoDuration) {
      setVideoDuration(video.duration);
    }
    
    let bufPercent = 0;
    if (video.duration > 0) {
      for (let i = 0; i < video.buffered.length; i++) {
        const start = video.buffered.start(i);
        const end = video.buffered.end(i);
        if (video.currentTime >= start && video.currentTime <= end) {
          bufPercent = (end / video.duration) * 100;
          break;
        }
      }
    }
    setBufferedPercent(bufPercent);
  };

  // Clean up Hls instance on unmount
  useEffect(() => {
    return () => {
      destroyHls();
    };
  }, []);

  // Throttled update loop (once per second max) for progress, duration, stability cap restoration, and HUD updates
  useEffect(() => {
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      // Update current playhead position, duration and buffered stats
      updateVideoStats(video);

      // Stability Monitor: check stable playback for quality restoration
      const curTime = video.currentTime;
      let bufAhead = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        const start = video.buffered.start(i);
        const end = video.buffered.end(i);
        if (curTime >= start && curTime <= end) {
          bufAhead = end - curTime;
          break;
        }
      }

      const isStable = !video.paused && !isBuffering && !isStalledState.current;
      if (isStable && bufAhead >= 6.0) {
        stablePlaybackSecondsRef.current += 1;
        if (stablePlaybackSecondsRef.current >= 20) {
          stablePlaybackSecondsRef.current = 0;
          if (hlsRef.current && maxLevelCapRef.current !== -1) {
            const hls = hlsRef.current;
            const highestLevelIdx = hls.levels.length - 1;
            maxLevelCapRef.current = highestLevelIdx;
            hls.autoLevelCapping = highestLevelIdx;
            hls.currentLevel = highestLevelIdx; // Lock back to highest
            console.log(`[ACM TV] Stability Manager: Playback stable for 20s. Restored and locked quality to highest level.`);
          }
        }
      } else {
        stablePlaybackSecondsRef.current = 0;
      }

    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastState, isBuffering, isPlaying]);

  // Picture-in-Picture event sync handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPip = () => {
      setIsPipActive(true);
      console.log("[ACM TV] Picture-in-Picture: Entered PiP mode.");
    };

    const onLeavePip = () => {
      setIsPipActive(false);
      console.log("[ACM TV] Picture-in-Picture: Exited PiP mode. Performing automatic sync check.");
      if (!video.paused) {
        const now = Date.now();
        const state = getBroadcastState(channel, now);
        const targetPos = state.playbackPosition;
        const duration = video.duration || state.currentProgram?.program.duration || 1;
        const drift = Math.abs(video.currentTime - (targetPos % duration));
        if (drift > 2.0) {
          console.log(`[ACM TV] PiP Exit Resync: Drift of ${drift.toFixed(1)}s corrected.`);
          video.currentTime = targetPos % duration;
        }
      }
    };

    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastState?.currentProgram?.instanceId]);

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("[ACM TV] Picture-in-Picture error:", err);
    }
  };

  // Check native audioTracks API support on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const supported = 'audioTracks' in video || 'audioTracks' in HTMLVideoElement.prototype;
      setHasAudioTrackSupport(supported);
    }
  }, []);



  const fallbackToDefaultAudio = () => {
    const isRemote = videoSrc.startsWith('http://') || videoSrc.startsWith('https://');
    if (!isRemote) {
      console.warn("[ACM TV][AUDIO FALLBACK] Falling back to default native/embedded audio.");
    }
    setAudioTracks(prev => {
      const active = prev.find(t => t.enabled);
      if (active && active.url) {
        return prev.map(t => {
          if (t.id === active.id) {
            return { ...t, url: undefined };
          }
          return t;
        });
      }
      return prev;
    });

    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  };


  const detectNativeAudioTracks = () => {
    const video = videoRef.current;
    if (!video) return;

    const nativeTracks = (video as HTMLVideoElementWithAudioTracks).audioTracks;
    if (nativeTracks) {
      const parsedTracks: AudioTrack[] = [];
      for (let i = 0; i < nativeTracks.length; i++) {
        const track = nativeTracks[i];
        parsedTracks.push({
          id: track.id || `track-${i}`,
          label: track.label || track.language || `Track ${i + 1}`,
          language: track.language || 'und',
          enabled: track.enabled
        });
      }
      setAudioTracks(parsedTracks);
      setHasAudioTrackSupport(true);
    } else {
      setAudioTracks([]);
      setHasAudioTrackSupport(false);
    }
  };

  const handleSelectSubtitleTrack = (subTrackId: string | number | null) => {
    // 1. Update React state
    setSubtitles(prev => prev.map(track => ({
      ...track,
      enabled: track.id === subTrackId
    })));

    // 2. Toggle native text track modes
    const video = videoRef.current;
    if (video) {
      const selectedTrack = subtitles.find(t => t.id === subTrackId);
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (selectedTrack && (track.label === selectedTrack.label || track.language === selectedTrack.language)) {
          track.mode = 'showing';
        } else {
          track.mode = 'hidden';
        }
      }
    }
  };

  // Monitor native track changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const nativeTracks = (video as HTMLVideoElementWithAudioTracks).audioTracks;
    if (nativeTracks) {
      const handleTrackChange = () => {
        detectNativeAudioTracks();
      };
      nativeTracks.addEventListener('change', handleTrackChange);
      nativeTracks.addEventListener('addtrack', handleTrackChange);
      nativeTracks.addEventListener('removetrack', handleTrackChange);
      return () => {
        nativeTracks.removeEventListener('change', handleTrackChange);
        nativeTracks.removeEventListener('addtrack', handleTrackChange);
        nativeTracks.removeEventListener('removetrack', handleTrackChange);
      };
    }
  }, [videoSrc]);


  // Reset fallback active on program switch
  useEffect(() => {
    if (isFallbackActive) {
      setTimeout(() => {
        setIsFallbackActive(false);
      }, 0);
    }
  }, [broadcastState?.currentProgram?.instanceId, isFallbackActive]);

  // Reset all states and destroy playback session when channel changes (Root Cause isolation)
  useEffect(() => {
    console.log(`[ACM TV] Channel changed to: ${channel.name} (${channel.id}). Performing complete teardown.`);
    
    // 1. Destroy HLS session
    destroyHls();

    // 2. Pause and reset HTML5 video/audio elements to clear buffers
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = '';
      video.removeAttribute('src');
      try {
        video.load();
      } catch {}
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {}
    }

    // 3. Clear all active timeouts & state trackers
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (infoOverlayTimeoutRef.current) {
      clearTimeout(infoOverlayTimeoutRef.current);
      infoOverlayTimeoutRef.current = null;
    }
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    activeInstanceIdRef.current = '';
    maxLevelCapRef.current = -1;
    stablePlaybackSecondsRef.current = 0;
    reloadTimestampsRef.current = [];
    downgradeTimestampsRef.current = [];
    consecutiveErrorsRef.current = 0;
    driftExceededStartRef.current = null;
    stallCountRef.current = 0;
    isStalledState.current = false;
    lastTimeRef.current = -1;

    // 4. Reset all React player and UI states asynchronously
    const timer = setTimeout(() => {
      setIsLoading(true);
      setIsBuffering(false);
      setIsPlaying(false);
      setMediaError(null);
      setIsFallbackActive(false);
      setIsRetrying(false);
      setVideoSrc('');
      setAudioTracks([]);
      setSubtitles([]);
      setVideoCurrentTime(0);
      setVideoDuration(0);
      setBufferedPercent(0);
      setShowTitleCard(false);

      // 5. Calculate and dispatch initial state for new channel to parent
      const initialState = getBroadcastState(channel, getUnixTimeMs());
      setBroadcastState(initialState);
      onStateChangeRef.current?.(initialState);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [channel, onStateChangeRef]);

  useEffect(() => {
    const currentInst = broadcastState?.currentProgram;
    if (!currentInst) return;

    // Verify correct data source: Ensure the state's channelId matches the active channel
    if (broadcastState.channelId !== channel.id) {
      console.warn(`[ACM TV] Data source mismatch: expected channel ${channel.id}, got state channel ${broadcastState.channelId}. Skipping program load.`);
      return;
    }

    // Root Cause Validation: Ensure the current program belongs to the active channel
    const programExistsInChannel = channel.programs.some(p => p.id === currentInst.program.id) ||
                                  (channel.idents && channel.idents.some(p => p.id === currentInst.program.id)) ||
                                  (channel.promos && channel.promos.some(p => p.id === currentInst.program.id));

    if (!programExistsInChannel) {
      console.warn(`[ACM TV] Mismatch detected: Program ${currentInst.program.title} (${currentInst.program.id}) does not exist in channel ${channel.name} (${channel.id}). Skipping load.`);
      return;
    }

    let active = true;
    let transitionTimer: NodeJS.Timeout | null = null;

    // Reset error states on program transition
    transitionTimer = setTimeout(() => {
      if (!active) return;
      setMediaError(null);
    }, 0);
    consecutiveErrorsRef.current = 0;

    if (isFallbackActive) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.src = '';
      }
      setTimeout(() => {
        if (!active) return;
        setIsLoading(false);
      }, 0);
      return;
    }

    const loadMetadataAndSetup = async () => {
      const videoUrl = currentInst.program.videoUrl;
      if (!videoUrl) {
        setIsFallbackActive(true);
        setIsLoading(false);
        return;
      }
      const targetSrc = getDirectVideoUrl(videoUrl);

      setIsLoading(true);

      // 1. Verify remote URL before assigning it
      console.log(`[ACM TV][VALIDATION] Validating remote source: ${targetSrc}`);
      const valRes = await validateRemoteUrl(targetSrc);
      console.log(`[ACM TV][VALIDATION RESULT] Success: ${valRes.success}, Reason: ${valRes.reason || 'None'}`);
      if (!valRes.success) {
        if (valRes.reason?.includes("404")) {
          console.warn(`[ACM TV][VALIDATION] Definitive 404 detected. Skipping program.`);
          updateFailedProgram(currentInst.instanceId, getUnixTimeMs());
          setIsLoading(false);
          return;
        } else {
          console.warn(`[ACM TV][VALIDATION] Non-404 failure: ${valRes.reason}. Attempting playback anyway.`);
        }
      }

      // 2. Fetch metadata (completely optional, do not block or throw error if it fails)
      const metadata = await fetchAndCacheMetadata(videoUrl, currentInst.program.metadataUrl);
      if (!active) return;

      const videoSource = metadata ? (metadata.hls || metadata.video || targetSrc) : targetSrc;

      // 3. Verify duration > 0 (fallback to program default if metadata missing)
      const duration = metadata?.duration || currentInst.program.duration;
      if (!(duration > 0)) {
        updateFailedProgram(currentInst.instanceId, getUnixTimeMs());
        setIsLoading(false);
        return;
      }

      // Setup audio tracks (fallback to program defaults first, then native)
      const audioTracksSource = (metadata && Array.isArray(metadata.audioTracks) && metadata.audioTracks.length > 0)
        ? metadata.audioTracks
        : (currentInst.program.audioTracks && Array.isArray(currentInst.program.audioTracks) && currentInst.program.audioTracks.length > 0)
          ? currentInst.program.audioTracks
          : null;

      if (audioTracksSource) {
        const currentSelection = audioTracks.find(t => t.enabled)?.id;
        const mapped: ExtendedAudioTrack[] = audioTracksSource.map((track: { code: string; language: string; codec?: string; default?: boolean; url?: string }) => ({
          id: track.code,
          label: track.language,
          language: track.code,
          codec: track.codec,
          default: track.default || false,
          enabled: currentSelection ? track.code === currentSelection : false,
          url: track.url
        }));

        if (!mapped.some((t: ExtendedAudioTrack) => t.enabled)) {
          const defaultTrack = mapped.find((t: ExtendedAudioTrack) => t.default);
          if (defaultTrack) {
            defaultTrack.enabled = true;
          } else {
            const native = mapped.find((t: ExtendedAudioTrack) => !t.url);
            if (native) native.enabled = true;
            else {
              const eng = mapped.find((t: ExtendedAudioTrack) => t.language === 'eng');
              if (eng) eng.enabled = true;
              else if (mapped.length > 0) mapped[0].enabled = true;
            }
          }
        }
        setAudioTracks(mapped);
        setHasAudioTrackSupport(true);
      } else {
        detectNativeAudioTracks();
      }

      // Setup subtitles (fallback to program defaults first, then empty)
      const subtitlesSource = (metadata && Array.isArray(metadata.subtitles) && metadata.subtitles.length > 0)
        ? metadata.subtitles
        : (currentInst.program.subtitles && Array.isArray(currentInst.program.subtitles) && currentInst.program.subtitles.length > 0)
          ? currentInst.program.subtitles
          : null;

      if (subtitlesSource) {
        const mappedSub = subtitlesSource.map((sub: { code?: string; language: string; format?: string; default?: boolean; url?: string }, i: number) => ({
          id: `sub-${sub.code || sub.language}-${i}`,
          label: sub.language,
          language: sub.code || sub.language,
          format: sub.format || 'vtt',
          default: sub.default || false,
          url: sub.url,
          enabled: sub.default || false
        }));
        setSubtitles(mappedSub);

        // Apply native track showing mode if enabled
        const hasDefaultSub = mappedSub.some((s: SubtitleTrack) => s.enabled);
        if (hasDefaultSub) {
          setTimeout(() => {
            const video = videoRef.current;
            if (video) {
              const activeSub = mappedSub.find((s: SubtitleTrack) => s.enabled);
              for (let i = 0; i < video.textTracks.length; i++) {
                const track = video.textTracks[i];
                if (activeSub && (track.label === activeSub.label || track.language === activeSub.language)) {
                  track.mode = 'showing';
                } else {
                  track.mode = 'hidden';
                }
              }
            }
          }, 500);
        }
      } else {
        setSubtitles([]);
      }

      // Trigger load on source transition
      if (activeInstanceIdRef.current !== currentInst.instanceId || videoSrc !== videoSource) {
        console.log(`[ACM TV] Switching Program Source to: ${videoSource} (Seek offset: ${broadcastState?.playbackPosition || 0}s)`);
        activeInstanceIdRef.current = currentInst.instanceId;
        setVideoSrc(videoSource);
        loadAndPlaySource(videoSource, broadcastState?.playbackPosition || 0, currentInst.instanceId);
      } else {
        setIsLoading(false);
      }
    };

    loadMetadataAndSetup();

    return () => {
      active = false;
      if (transitionTimer) clearTimeout(transitionTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastState?.currentProgram?.instanceId, isFallbackActive]);

  const handleSelectTrack = (trackId: string | number) => {
    const video = videoRef.current;
    if (!video) return;

    // Update enabled state in React state
    const updatedTracks = audioTracks.map(track => ({
      ...track,
      enabled: track.id === trackId
    }));
    setAudioTracks(updatedTracks);

    const selectedTrack = updatedTracks.find(t => t.enabled);

    if (process.env.NODE_ENV === 'development' || true) {
      console.log(`[ACM TV][RECOVERY] Selected audio track "${selectedTrack?.label}" (ID: ${trackId})`);
    }

    // Bypass companion audio logic for remote programs
    const isRemote = videoSrc.startsWith('http://') || videoSrc.startsWith('https://');
    if (isRemote) {
      const nativeTracks = (video as HTMLVideoElementWithAudioTracks).audioTracks;
      if (nativeTracks) {
        for (let i = 0; i < nativeTracks.length; i++) {
          const track = nativeTracks[i];
          track.enabled = (track.id === trackId || `track-${i}` === trackId);
        }
        detectNativeAudioTracks();
      }
      return;
    }

    // 1. If it's a mapped track (Chrome compatible)
    if (selectedTrack && selectedTrack.url !== undefined) {
      const audio = audioRef.current;
      if (audio) {
        if (selectedTrack.url) {
          video.muted = true;
          console.log("[ACM TV][AUDIO] Loading external audio source URL:", selectedTrack.url);
          audio.src = selectedTrack.url;
          audio.load();
          audio.currentTime = video.currentTime;
          audio.muted = isMuted;
          if (isPlaying && !isMuted && !isBuffering && !isLoading) {
            audio.play().catch(e => console.error('[ACM TV][PLAYBACK ERROR] External audio play failed:', e));
          } else {
            audio.pause();
          }
        } else {
          // Native / original English track
          video.muted = isMuted;
          if (!audio.paused) {
            audio.pause();
          }
          audio.src = '';
        }
      }
      return;
    }

    // 2. Fallback to native tracks
    const nativeTracks = (video as HTMLVideoElementWithAudioTracks).audioTracks;
    if (nativeTracks) {
      for (let i = 0; i < nativeTracks.length; i++) {
        const track = nativeTracks[i];
        track.enabled = (track.id === trackId || `track-${i}` === trackId);
      }
      detectNativeAudioTracks();
    }
  };

  // Manage native video element mute state based on active audio track
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const activeTrack = audioTracks.find(t => t.enabled);
    const hasExternalAudio = !!(activeTrack && activeTrack.url);

    if (hasExternalAudio) {
      video.muted = true;
    } else {
      video.muted = isMuted;
    }
  }, [audioTracks, isMuted]);

  // Synchronize external audio element with the main video element
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    // Bypass companion audio element sync for remote streams
    const isRemote = videoSrc.startsWith('http://') || videoSrc.startsWith('https://');
    if (isRemote) {
      if (!audio.paused) {
        audio.pause();
      }
      audio.src = '';
      return;
    }

    const activeTrack = audioTracks.find(t => t.enabled);
    
    if (activeTrack && activeTrack.url) {
      // Set audio source if it changed
      if (audio.src !== window.location.origin + activeTrack.url && !audio.src.endsWith(activeTrack.url)) {
        console.log(`[ACM TV][AUDIO] Loading external audio source URL: ${activeTrack.url}`);
        audio.src = activeTrack.url;
        audio.load();
        audio.currentTime = video.currentTime;
      }

      // Sync play/pause states - only play if NOT muted and is playing!
      if (isPlaying && !isMuted && !isBuffering && !isLoading) {
        if (audio.paused) {
          audio.play().catch(e => {
            console.error('[ACM TV][PLAYBACK ERROR] External audio play failed:', e);
            if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
              fallbackToDefaultAudio();
            }
          });
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }

      // Sync volume/mute
      audio.muted = isMuted;
      
      // High accuracy synchronization check
      const syncInterval = setInterval(() => {
        if (video.seeking || isBuffering || isMuted) {
          if (!audio.paused) audio.pause();
          return;
        }

        const timeDiff = Math.abs(video.currentTime - audio.currentTime);
        if (timeDiff > 0.15) {
          console.log(`[ACM TV][RECOVERY] Audio track sync offset detected. video=${video.currentTime.toFixed(2)}s, audio=${audio.currentTime.toFixed(2)}s, diff=${timeDiff.toFixed(2)}s. Correcting audio currentTime.`);
          audio.currentTime = video.currentTime;
        }

        // Sync play state
        if (video.paused && !audio.paused) {
          audio.pause();
        } else if (!video.paused && audio.paused && !video.seeking && !isBuffering && !isMuted) {
          audio.play().catch(() => {});
        }
      }, 200);

      return () => {
        clearInterval(syncInterval);
      };
    } else {
      if (!audio.paused) {
        audio.pause();
      }
      audio.src = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioTracks, isPlaying, isBuffering, isLoading, isMuted]);

  // Run update loop
  useEffect(() => {
    // Run initial calculation
    updateBroadcastState(Date.now());

    // Regular interval check for drift correction and program handovers (every 2.5s)
    const interval = setInterval(() => updateBroadcastState(Date.now()), 2500);

    // Dynamic timeout for precise program handover
    let handoverTimeout: NodeJS.Timeout | null = null;
    const scheduleNextHandover = () => {
      if (handoverTimeout) clearTimeout(handoverTimeout);
      const now = Date.now();
      try {
        const state = getBroadcastState(channel, now);
        const msRemaining = state.currentProgram.endTime - now;
        if (msRemaining > 0) {
          handoverTimeout = setTimeout(() => {
            console.log("[ACM TV] Precise handover triggered.");
            updateBroadcastState(Date.now());
            scheduleNextHandover();
          }, msRemaining + 200); // 200ms buffer to allow server clock rollover
        }
      } catch {
        // Ignored
      }
    };
    scheduleNextHandover();

    // Event listeners to handle tab active state and device sleep/wake-up
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[ACM TV] Page visible, executing immediate broadcast sync.");
        updateBroadcastState(Date.now());
        scheduleNextHandover();
      }
    };

    const handleWindowFocus = () => {
      console.log("[ACM TV] Window focused, running sync.");
      updateBroadcastState(Date.now());
    };

    const handleOnline = () => {
      updateBroadcastState(Date.now());
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      if (handoverTimeout) clearTimeout(handoverTimeout);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, isFallbackActive]);

  const syncSubtitlesMode = () => {
    const video = videoRef.current;
    if (!video) return;
    const activeSub = subtitles.find(s => s.enabled);
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (activeSub && (track.label === activeSub.label || track.language === activeSub.language)) {
        track.mode = 'showing';
      } else {
        track.mode = 'hidden';
      }
    }
  };

  // Sync seek and handle playback state on loaded metadata
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    const currentInst = broadcastState?.currentProgram;
    if (video && currentInst) {
      setIsLoading(false);
      updateAutoFit();

      // Check actual vs. configured duration
      const actualDuration = video.duration;
      const configuredDuration = currentInst.program.duration;
      if (actualDuration && configuredDuration) {
        const diff = Math.abs(actualDuration - configuredDuration);
        if (diff > 2) {
          const warning = `Duration mismatch: Configured ${configuredDuration}s vs Actual ${actualDuration.toFixed(1)}s`;
          console.warn(warning);
        }
      }

      // Modulo clamp using actual video duration
      const duration = video.duration || configuredDuration || 1;
      const targetPos = Math.max(0, broadcastState?.playbackPosition || 0) % duration;
      console.log(`[ACM TV] Seek to target position: ${targetPos.toFixed(1)}s (video.duration: ${video.duration.toFixed(1)}s)`);
      video.currentTime = targetPos;
      
      const hasMetadataTracks = audioTracks.some(t => t.url);
      if (!hasMetadataTracks) {
        detectNativeAudioTracks();
      }
      syncSubtitlesMode();
    }
  };

  const handlePlaybackError = (errorContext: string, errorDetail?: unknown) => {
    const video = videoRef.current;
    if (!video) return;

    let errorName = '';
    let errorMessage = '';
    if (errorDetail && typeof errorDetail === 'object') {
      const detailObj = errorDetail as Record<string, unknown>;
      errorName = typeof detailObj.name === 'string' ? detailObj.name : '';
      errorMessage = typeof detailObj.message === 'string' ? detailObj.message : '';
    }
    const combinedError = errorName || errorMessage;

    if (combinedError === 'AbortError' || combinedError.includes('abort') || errorContext.includes('AbortError')) {
      console.log(`[ACM TV] Playback aborted (AbortError) - normal navigation/seeking interruption. Ignoring.`);
      return;
    }
    if (combinedError === 'NotAllowedError' || combinedError.includes('NotAllowed') || errorContext.includes('NotAllowedError')) {
      console.warn(`[ACM TV] Playback blocked (NotAllowedError) - autoplay restriction. Showing unmute overlay.`);
      setShowTapToUnmute(true);
      return;
    }

    const currentInst = broadcastState?.currentProgram;
    if (!currentInst) return;

    const instanceId = currentInst.instanceId;
    console.error(`[ACM TV][PLAYBACK ERROR] Context: ${errorContext} | Details:`, errorDetail || '');

    // Silently attempt controlled recovery after 3 seconds
    console.log(`[ACM TV][RECOVERY] Scheduling silent recovery in 3 seconds for instance: ${instanceId}`);
    setTimeout(() => {
      if (videoRef.current && activeInstanceIdRef.current === instanceId) {
        console.log(`[ACM TV][RECOVERY] Attempting silent recovery for: ${instanceId}`);
        const now = Date.now();
        const state = getBroadcastState(channel, now);
        const targetPos = state.playbackPosition;
        const duration = video.duration || currentInst.program.duration || 1;
        
        try {
          if (hlsRef.current) {
            hlsRef.current.recoverMediaError();
          } else {
            video.load();
            video.currentTime = targetPos % duration;
            video.play()
              .then(() => console.log(`[ACM TV][RECOVERY] Silent recovery succeeded.`))
              .catch((e) => console.error("[ACM TV][RECOVERY] Silent recovery play failed:", e));
          }
        } catch (err) {
          console.error("[ACM TV][RECOVERY] Silent recovery exception:", err);
        }
      }
    }, 3000);
  };

  // Handle errors and fall back gracefully
  const handleVideoError = () => {
    const video = videoRef.current;
    const err = video?.error;
    handlePlaybackError('HTML5 Video Element Error Event', {
      code: err?.code,
      message: err?.message || 'Unknown media loading error'
    });
  };

  // Manual reconnect/retry button handler
  const handleReconnect = () => {
    setIsRetrying(true);
    console.log("[ACM TV] Attempting manual connection reset.");
    
    setTimeout(() => {
      setIsFallbackActive(false);
      setMediaError(null);
      setIsRetrying(false);
      activeInstanceIdRef.current = ''; // Reset identifier to force reload
      updateBroadcastState(Date.now());
    }, 1500);
  };

  const handlePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // Immediately resync to live position on Play
      const now = Date.now();
      const state = getBroadcastState(channel, now);
      const targetPos = state.playbackPosition;
      const duration = video.duration || state.currentProgram?.program.duration || 1;
      video.currentTime = targetPos % duration;
      video.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Play failed:", err));
    }
  };

  const handleGoLive = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video || !broadcastState) return;
    const now = Date.now();
    const state = getBroadcastState(channel, now);
    const targetPos = state.playbackPosition;
    const duration = video.duration || state.currentProgram?.program.duration || 1;
    video.currentTime = targetPos % duration;
    setVideoCurrentTime(targetPos % duration);
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(err => console.error("Play failed:", err));
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current || !broadcastState?.currentProgram) return;
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    
    const duration = videoRef.current.duration || broadcastState.currentProgram.program.duration || 1;
    const seekTarget = percentage * duration;
    videoRef.current.currentTime = seekTarget;
    setVideoCurrentTime(seekTarget);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect || !broadcastState?.currentProgram) return;
    const moveX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, moveX / width));
    setHoverPosition(percentage * 100);

    const duration = videoRef.current?.duration || broadcastState.currentProgram.program.duration || 0;
    const hoverTime = percentage * duration;
    const mins = Math.floor(hoverTime / 60);
    const secs = Math.floor(hoverTime % 60);
    setHoverTimeStr(`${mins}:${secs.toString().padStart(2, '0')}`);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverPosition(null);
  };


  // Tap to Unmute Action
  const handleUnmute = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    setIsMuted(false);
    setShowTapToUnmute(false);
    
    const activeTrack = audioTracks.find(t => t.enabled);
    const hasExternalAudio = !!(activeTrack && activeTrack.url);
    if (video) {
      video.muted = hasExternalAudio ? true : false;
    }
    if (audio && hasExternalAudio) {
      audio.muted = false;
    }
    updateBroadcastState(Date.now());
  };

  // Toggle Mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    const audio = audioRef.current;
    const targetMute = !isMuted;
    setIsMuted(targetMute);
    if (!targetMute) {
      setShowTapToUnmute(false);
    }
    
    const activeTrack = audioTracks.find(t => t.enabled);
    const hasExternalAudio = !!(activeTrack && activeTrack.url);
    if (video) {
      video.muted = hasExternalAudio ? true : targetMute;
    }
    if (audio && hasExternalAudio) {
      audio.muted = targetMute;
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Error enabling fullscreen", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  // Track fullscreen changes from ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Show/Hide Custom controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showTapToUnmute) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const currentDuration = videoDuration || broadcastState?.currentProgram?.program.duration || 1;
  const progressPercent = (videoCurrentTime / currentDuration) * 100;

  const delaySec = broadcastState ? Math.max(0, broadcastState.playbackPosition - videoCurrentTime) : 0;
  const isBehindLive = delaySec > 4; // 4s threshold to account for clock skew and playback buffer differences
  const formattedDelay = (() => {
    const mins = Math.floor(delaySec / 60);
    const secs = Math.floor(delaySec % 60);
    return `-${mins}:${secs.toString().padStart(2, '0')}`;
  })();

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-signal-black border border-signal-border group cursor-none shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
      style={{ cursor: showControls || showTapToUnmute || mediaError ? 'auto' : 'none' }}
    >
      {/* External Audio Track Element */}
      <audio
        ref={audioRef}
        preload="auto"
        className="hidden"
        onError={(e) => {
          console.error("[ACM TV][AUDIO ERROR] Companion audio element failed to load or play:", e);
          fallbackToDefaultAudio();
        }}
      />

      {/* Video Element */}
      <video
        ref={videoRef}
        onClick={handlePlayPause}
        poster={broadcastState?.currentProgram?.program.thumbnail || "/branding/acm-tv-bug.svg"}
        onLoadedMetadata={(e) => {
          handleLoadedMetadata();
          updateVideoStats(e.currentTarget);
        }}
        onTimeUpdate={(e) => updateVideoStats(e.currentTarget)}
        onProgress={(e) => updateVideoStats(e.currentTarget)}
        onError={handleVideoError}
        onPlay={() => { setIsPlaying(true); setIsBuffering(false); }}
        onPlaying={() => setIsBuffering(false)}
        onWaiting={() => { setIsBuffering(true); handleBufferingEvent(getUnixTimeMs()); }}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full transition-all duration-300 cursor-pointer object-contain bg-signal-black"
        style={getObjectFitStyle()}
        playsInline
        muted={isMuted}
        autoPlay
      >
        {subtitles.map((track) => (
          <track
            key={track.id}
            kind="subtitles"
            label={track.label}
            srcLang={track.language}
            src={track.url}
            default={track.enabled}
          />
        ))}
      </video>

      {/* Branded Channel Bug */}
      {isPlaying && !mediaError && (
        <div className="absolute top-6 right-6 z-30 w-24 sm:w-28 opacity-40 hover:opacity-100 transition-opacity duration-300 pointer-events-none select-none">
          <img 
            src={channel.bugUrl || "/branding/acm-tv-bug.svg"} 
            alt="ACM TV Watermark" 
            className="w-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          />
        </div>
      )}

      {/* Poster artwork overlay */}
      {isLoading && !mediaError && broadcastState?.currentProgram?.program.thumbnail && (
        <div className="absolute inset-0 z-10 bg-signal-black pointer-events-none">
          <img 
            src={broadcastState.currentProgram.program.thumbnail} 
            alt={broadcastState.currentProgram.program.title} 
            className="w-full h-full object-cover opacity-30 grayscale"
          />
        </div>
      )}

      {/* Loading Spinner */}
      {(isLoading || isBuffering) && !mediaError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-signal-black/20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-signal-border border-t-signal-amber rounded-full animate-spin"></div>
            <div className="text-[10px] font-mono text-signal-amber uppercase tracking-widest animate-pulse-live">Syncing Signal...</div>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {!isPlaying && !isLoading && !isBuffering && !mediaError && (
        <div 
          onClick={handlePlayPause}
          className="absolute inset-0 z-35 bg-signal-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer select-none animate-fade-in"
        >
          <div className="flex items-center gap-3 bg-signal-surface-raised border border-signal-border-active px-6 py-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <span className="text-xs font-mono font-bold text-signal-text-primary tracking-widest uppercase flex items-center gap-2">
              <span className="text-signal-amber">||</span>
              <span>PAUSED</span>
            </span>
          </div>
        </div>
      )}

      {/* Movie Title Card */}
      {showTitleCard && broadcastState?.currentProgram && channel.id === 'acm-movies' && broadcastState.currentProgram.program.type === 'content' && (
        <div className="absolute inset-0 z-35 bg-gradient-to-t from-signal-black via-signal-black/90 to-transparent flex flex-col justify-end p-8 sm:p-12 text-left animate-fade-in">
          {broadcastState.currentProgram.program.backdrop && (
            <div 
              className="absolute inset-0 opacity-10 bg-cover bg-center filter blur-xl scale-110"
              style={{ backgroundImage: `url(${broadcastState.currentProgram.program.backdrop})` }}
            />
          )}
          
          <div className="relative z-10 max-w-3xl space-y-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-signal-surface border border-signal-border-active text-[10px] font-mono text-signal-amber uppercase tracking-widest">
                NOW SHOWING
              </span>
              {broadcastState.currentProgram.program.year && (
                <span className="text-signal-text-secondary font-mono text-[11px]">
                  {broadcastState.currentProgram.program.year}
                </span>
              )}
              <span className="text-signal-border-active font-bold">•</span>
              <span className="text-signal-text-secondary font-mono text-[11px] uppercase tracking-wider">
                {broadcastState.currentProgram.program.category}
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black text-signal-text-primary tracking-tight leading-none drop-shadow-lg">
              {broadcastState.currentProgram.program.title}
            </h1>
            
            <p className="text-sm text-signal-text-secondary leading-relaxed font-medium max-w-2xl line-clamp-3">
              {broadcastState.currentProgram.program.description}
            </p>
            
            <div className="pt-4 flex items-center gap-8 text-[11px] text-signal-text-tertiary font-mono">
              <div>
                <span className="uppercase text-[9px] font-bold block mb-1">Runtime</span>
                <span className="text-signal-text-primary font-bold">{Math.round(broadcastState.currentProgram.program.duration / 60)} MIN</span>
              </div>
              {broadcastState.upNext && (
                <div>
                  <span className="uppercase text-[9px] font-bold block mb-1">Up Next</span>
                  <span className="text-signal-amber font-bold">{broadcastState.upNext.program.title}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standby Overlay */}
      {isFallbackActive && (
        <StandbyOverlay
          channel={channel}
          currentProgram={broadcastState?.currentProgram || null}
          upNext={broadcastState?.upNext || null}
          onRetry={handleReconnect}
          isRetrying={isRetrying}
        />
      )}

      {/* Signal Interruption Overlay */}
      {mediaError && !isFallbackActive && (
        <div className="absolute inset-0 z-40 bg-signal-black flex flex-col items-center justify-center">
          <div className="relative z-10 max-w-md w-full mx-4 p-8 bg-signal-surface border border-signal-red-dim shadow-[0_0_50px_rgba(224,64,64,0.1)] text-center animate-fade-in">
            <div className="flex justify-center mb-6 text-signal-red animate-pulse-live">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-mono font-bold text-signal-text-primary uppercase tracking-widest mb-3">
              Signal Interruption
            </h3>
            
            <p className="text-[12px] text-signal-text-secondary leading-relaxed mb-8 px-4 font-mono">
              Broadcast signal lost. Re-establishing connection to network feed...
            </p>

            <button
              onClick={handleReconnect}
              disabled={isRetrying}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-signal-surface-raised hover:bg-signal-surface-hover border border-signal-red-dim hover:border-signal-red text-signal-red font-mono font-bold text-[11px] tracking-widest uppercase transition-all cursor-pointer"
            >
              {isRetrying ? 'RECONNECTING...' : 'FORCE RECONNECT'}
            </button>
          </div>
        </div>
      )}

      {/* Tap to Unmute Overlay */}
      {isPlaying && showTapToUnmute && !mediaError && (
        <div 
          onClick={handleUnmute}
          className="absolute inset-0 z-30 bg-signal-black/70 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer select-none animate-fade-in"
        >
          <div className="p-6 rounded-full bg-signal-surface border border-signal-amber/30 text-signal-amber shadow-[0_0_30px_rgba(232,162,48,0.2)] mb-6 animate-pulse-live">
            <VolumeX className="w-8 h-8 stroke-[2]" />
          </div>
          <h4 className="text-[15px] font-mono font-bold text-signal-text-primary uppercase tracking-widest text-center px-4">
            Tap to Enable Audio
          </h4>
          <p className="text-[10px] font-mono text-signal-text-tertiary mt-2 uppercase tracking-widest">
            Live Broadcast Active
          </p>
        </div>
      )}

      {/* Info Overlay */}
      {showInfoOverlay && broadcastState?.currentProgram && (
        <div className="absolute top-6 left-6 right-6 z-30 p-4 bg-signal-surface/95 backdrop-blur-md border border-signal-border shadow-2xl text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pointer-events-auto animate-slide-down">
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono font-bold text-signal-amber tracking-widest uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse-live"></span>
              Broadcasting • {broadcastState.currentProgram.program.category}
            </span>
            <h4 className="text-sm font-bold text-signal-text-primary leading-tight">
              {broadcastState.currentProgram.program.title}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:border-l border-signal-border pt-3 sm:pt-0 sm:pl-6 text-[10px] font-mono text-signal-text-secondary">
            <div>
              <span className="text-signal-text-tertiary uppercase font-bold block mb-0.5">Remaining</span>
              <span className="text-signal-text-primary font-bold">
                {(() => {
                  const remaining = Math.max(0, broadcastState.currentProgram.program.duration - videoCurrentTime);
                  const hrs = Math.floor(remaining / 3600);
                  const mins = Math.floor((remaining % 3600) / 60);
                  const secs = Math.floor(remaining % 60);
                  return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                })()}
              </span>
            </div>

            <div>
              <span className="text-signal-text-tertiary uppercase font-bold block mb-0.5">UTC Clock</span>
              <span className="text-signal-text-primary font-bold">{formatLocalTime(localTimeMs)}</span>
            </div>

            {broadcastState.upNext && (
              <div>
                <span className="text-signal-text-tertiary uppercase font-bold block mb-0.5">Next Up</span>
                <span className="text-signal-amber font-bold max-w-[150px] truncate block" title={broadcastState.upNext.program.title}>
                  {broadcastState.upNext.program.title}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls HUD */}
      <div 
        className={`absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none transition-opacity duration-300 ${showControls && !mediaError ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-signal-black/90 via-transparent to-signal-black/60 pointer-events-none"></div>
        
        {/* Top HUD */}
        <div className="relative flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-signal-text-secondary font-mono font-bold tracking-widest uppercase">
              {channel.name} Network Feed
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-signal-text-tertiary bg-signal-surface border border-signal-border px-3 py-1.5">
            <Wifi className="w-3 h-3 text-signal-green animate-pulse-live" />
            <span>UTC {formatLocalTime(localTimeMs).replace(/AM|PM/g, '')}</span>
          </div>
        </div>

        {/* Bottom HUD */}
        <div className="relative space-y-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {broadcastState?.currentProgram && (
            <div className="mb-2">
              <span className="text-sm font-bold text-signal-text-primary uppercase tracking-wide">
                {broadcastState.currentProgram.program.title}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div 
              ref={progressBarRef}
              onClick={handleProgressBarClick}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={handleProgressBarMouseLeave}
              className="relative w-full h-[3px] bg-signal-surface-raised cursor-pointer group"
            >
              <div 
                className="absolute top-0 left-0 h-full bg-signal-text-tertiary pointer-events-none"
                style={{ width: `${bufferedPercent}%` }}
              />
              <div 
                className="absolute top-0 left-0 h-full bg-signal-amber pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-signal-amber opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${progressPercent}% - 3px)` }}
              />
              {hoverPosition !== null && (
                <div 
                  className="absolute top-0 bottom-0 w-[1px] bg-signal-text-secondary pointer-events-none"
                  style={{ left: `${hoverPosition}%` }}
                />
              )}
              {hoverPosition !== null && (
                <div 
                  className="absolute bottom-4 -translate-x-1/2 px-2 py-1 bg-signal-surface border border-signal-border text-[10px] text-signal-text-primary font-mono pointer-events-none"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {hoverTimeStr}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-signal-text-secondary">
              <div className="flex items-center space-x-3">
                {isBehindLive ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-signal-surface border border-signal-border text-signal-text-secondary">
                      {formattedDelay} SYNC
                    </span>
                    <button
                      onClick={handleGoLive}
                      className="px-2 py-1 bg-signal-amber-dim border border-signal-border-active hover:bg-signal-amber hover:text-signal-black text-signal-amber transition-colors cursor-pointer"
                    >
                      REALIGN
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-signal-green">
                    <span className="w-1.5 h-1.5 bg-signal-green rounded-full animate-pulse-live"></span>
                    SYNCED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span>{new Date(Math.max(0, videoCurrentTime) * 1000).toISOString().substring(11, 19)}</span>
                <span className="text-signal-text-tertiary">/</span>
                <span className="text-signal-text-tertiary">
                  {broadcastState?.currentProgram ? new Date(broadcastState.currentProgram.program.duration * 1000).toISOString().substring(11, 19) : "00:00:00"}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={handlePlayPause} 
                className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center bg-signal-surface border border-signal-border hover:bg-signal-surface-hover text-signal-text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-signal-amber rounded"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-5 h-5 md:w-4 md:h-4" /> : <Play className="w-5 h-5 md:w-4 md:h-4" />}
              </button>
              
              <div className="flex items-center gap-3 bg-signal-surface border border-signal-border px-3 py-1.5 h-12 md:h-10 rounded">
                <button 
                  onClick={toggleMute} 
                  className="w-8 h-8 flex items-center justify-center text-signal-text-secondary hover:text-signal-text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-signal-amber rounded" 
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 md:w-4 md:h-4 text-signal-red" /> : <Volume2 className="w-5 h-5 md:w-4 md:h-4" />}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 md:w-24 h-1 md:h-[2px] bg-signal-border appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 md:[&::-webkit-slider-thumb]:w-2 md:[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-signal-text-primary focus:outline-none focus:ring-2 focus:ring-signal-amber rounded"
                  style={{ backgroundImage: `linear-gradient(to right, var(--signal-text-primary) ${(isMuted ? 0 : volume) * 100}%, transparent 0)` }}
                  aria-label="Volume"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {audioTracks.length > 1 && (
                <div className="focus-within:ring-2 focus-within:ring-signal-amber rounded">
                  <AudioTrackSelector tracks={audioTracks} onSelectTrack={handleSelectTrack} hasNativeSupport={hasAudioTrackSupport} />
                </div>
              )}
              {subtitles.length > 0 && (
                <div className="focus-within:ring-2 focus-within:ring-signal-amber rounded">
                  <SubtitleSelector tracks={subtitles} onSelectTrack={handleSelectSubtitleTrack} />
                </div>
              )}
              {isPipSupported && (
                <button 
                  onClick={togglePip} 
                  className={`w-12 h-12 md:w-10 md:h-10 flex items-center justify-center bg-signal-surface border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-signal-amber rounded ${isPipActive ? 'border-signal-border-active text-signal-amber' : 'border-signal-border hover:bg-signal-surface-hover text-signal-text-secondary'}`}
                  aria-label="Picture in Picture"
                >
                  <Tv className="w-5 h-5 md:w-4 md:h-4" />
                </button>
              )}
              <button 
                onClick={toggleFullscreen} 
                className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center bg-signal-surface border border-signal-border hover:bg-signal-surface-hover text-signal-text-secondary hover:text-signal-text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-signal-amber rounded"
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5 md:w-4 md:h-4" /> : <Maximize2 className="w-5 h-5 md:w-4 md:h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
