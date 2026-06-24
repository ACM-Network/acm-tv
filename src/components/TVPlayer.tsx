"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Play, VolumeX, Volume2, Maximize2, Minimize2, Tv, Wifi, AlertTriangle, Loader2, Activity } from 'lucide-react';
import { Channel, ProgramInstance, BroadcastState } from '../types';
import { getBroadcastState, formatLocalTime } from '../utils/scheduleEngine';
import { getDirectVideoUrl, STANDBY_FALLBACK_VIDEO_URL } from '../utils/videoParser';
import StandbyOverlay from './StandbyOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import AudioTrackSelector, { AudioTrack } from './AudioTrackSelector';
import SubtitleSelector, { SubtitleTrack } from './SubtitleSelector';
import Hls from 'hls.js';

interface ExtendedAudioTrack extends AudioTrack {
  url?: string;
  default?: boolean;
  codec?: string;
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
  } catch (err: unknown) {
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
  const [missingFilePath, setMissingFilePath] = useState<string | null>(null);
  
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>('');

  const [failedPrograms, setFailedPrograms] = useState<Record<string, boolean>>({});
  const failedProgramsRef = useRef<Record<string, boolean>>({});
  const updateFailedProgram = (instanceId: string) => {
    failedProgramsRef.current = { ...failedProgramsRef.current, [instanceId]: true };
    setFailedPrograms({ ...failedProgramsRef.current });
    updateBroadcastState();
  };
  const [lastMediaEvent, setLastMediaEvent] = useState<string>('None');

  // Diagnostics and caching
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [validationResult, setValidationResult] = useState<string>('Pending');
  
  // Ref to track the current active instance ID to avoid unnecessary src changes
  const activeInstanceIdRef = useRef<string>('');

  // Hls.js diagnostics and state
  const hlsRef = useRef<Hls | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [hlsManifestStatus, setHlsManifestStatus] = useState<string>('N/A');
  const [hlsQualityLevel, setHlsQualityLevel] = useState<string>('N/A');
  const [hlsPlaybackState, setHlsPlaybackState] = useState<string>('Idle');
  const [hlsFatalError, setHlsFatalError] = useState<string>('None');
  const [tokenExpiryStatus, setTokenExpiryStatus] = useState<string>('N/A');
  const [durationWarning, setDurationWarning] = useState<string | null>(null);

  // States for rendering ref diagnostics without direct ref access in render (ESLint safety)
  const [videoReadyState, setVideoReadyState] = useState<number>(0);
  const [videoNetworkState, setVideoNetworkState] = useState<number>(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoBufferedRanges, setVideoBufferedRanges] = useState<string>('none');
  const [hudStalledState, setHudStalledState] = useState<boolean>(false);
  const [hudStallCount, setHudStallCount] = useState<number>(0);
  const [hudRecoveryCount, setHudRecoveryCount] = useState<number>(0);
  const [videoError, setVideoError] = useState<string>('None');

  // Clock state to prevent impure Date.now() during render
  const [localTimeMs, setLocalTimeMs] = useState<number>(typeof window !== 'undefined' ? Date.now() : 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeMs(Date.now());
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
    setHlsUrl(null);
    setHlsManifestStatus('N/A');
    setHlsQualityLevel('N/A');
    setHlsPlaybackState('Idle');
    setHlsFatalError('None');
    setTokenExpiryStatus('N/A');
  };
  // Controls autohide timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for drift correction and error recovery tracking
  const driftExceededStartRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const metadataCacheRef = useRef<Record<string, any>>({});
  const fileExistenceCacheRef = useRef<Record<string, boolean>>({});

  const lastTimeRef = useRef<number>(-1);
  const stallCountRef = useRef<number>(0);
  const isStalledState = useRef<boolean>(false);
  const recoveryCountRef = useRef<Record<string, number>>({});

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
    } catch (e) {
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
      setMetadataLoaded(true);
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
        data.audioTracks.forEach((t: any) => {
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
      setMetadataLoaded(true);
      return validated;
    } catch (e) {
      console.warn(`[ACM TV][METADATA] Could not fetch metadata from: ${metadataUrl}. Using defaults.`, e);
      return null;
    }
  };

  // 1. Calculate & Sync Broadcast State
  const updateBroadcastState = () => {
    try {
      const now = Date.now();
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
                
                // STALL RECOVERY: Only one attempt per instance ID
                const instanceId = currentInst.instanceId;
                const recoveryCount = recoveryCountRef.current[instanceId] || 0;
                if (recoveryCount < 1) {
                  recoveryCountRef.current[instanceId] = recoveryCount + 1;
                  console.log(`[ACM TV][STALL RECOVERY] Attempting recovery (Attempt 1) for instance ${instanceId}. Reloading source...`);
                  
                  try {
                    video.load();
                    // Modulo clamp using actual video duration
                    const duration = video.duration || currentInst.program.duration || 1;
                    video.currentTime = targetPos % duration;
                    video.play()
                      .then(() => {
                        console.log(`[ACM TV][STALL RECOVERY] Recovery play success.`);
                        isStalledState.current = false;
                        stallCountRef.current = 0;
                      })
                      .catch((err) => {
                        console.error(`[ACM TV][STALL RECOVERY] Playback play failed during recovery:`, err);
                        setMediaError("Playback stalled (recovery failed)");
                        setMissingFilePath(video.src || videoSrc);
                      });
                  } catch (err) {
                    console.error(`[ACM TV][STALL RECOVERY] Reload failed during recovery:`, err);
                    setMediaError("Playback stalled (recovery failed)");
                    setMissingFilePath(video.src || videoSrc);
                  }
                } else {
                  console.error(`[ACM TV][STALL RECOVERY] Recovery already attempted for instance ${instanceId}. Halting to prevent infinite loop.`);
                  setMediaError("Playback stalled (recovery failed)");
                  setMissingFilePath(video.src || videoSrc);
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
              driftExceededStartRef.current = Date.now();
            } else {
              const elapsed = Date.now() - driftExceededStartRef.current;
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
  const loadAndPlaySource = (src: string, seekOffset: number) => {
    const video = videoRef.current;
    if (!video) return;

    const currentInst = broadcastState?.currentProgram;
    const isHlsUrl = src.includes('.m3u8');

    // Destroy existing HLS instance
    destroyHls();
    setDurationWarning(null);

    if (isHlsUrl) {
      setHlsUrl(src);
      setHlsManifestStatus('Loading');

      // Check if token seems present/expired
      const hasToken = src.includes('t=') || src.includes('s=') || src.includes('e=');
      if (hasToken) {
        setTokenExpiryStatus('Valid');
      } else {
        setTokenExpiryStatus('N/A');
      }

      if (Hls.isSupported()) {
        console.log(`[ACM TV] Initializing hls.js for source: ${src}`);
        const hls = new Hls({
          startPosition: seekOffset,
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 2,
          fragLoadingMaxRetry: 3
        });

        hlsRef.current = hls;

        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(src);
        });

        hls.on(Hls.Events.MANIFEST_LOADED, () => {
          setHlsManifestStatus('Loaded');
          setHlsPlaybackState('Loaded Manifest');
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[ACM TV] Hls manifest parsed. Level count:', hls.levels.length);
          setHlsPlaybackState('Parsed');
          video.play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
              setHlsPlaybackState('Playing');
              consecutiveErrorsRef.current = 0;
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

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const levelIdx = data.level;
          const level = hls.levels[levelIdx];
          if (level) {
            setHlsQualityLevel(`${level.height || level.width || levelIdx}p`);
          } else {
            setHlsQualityLevel(`Level ${levelIdx}`);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error(`[ACM TV] Fatal HLS error: ${data.type} - ${data.details}`);
            setHlsFatalError(`Fatal: ${data.details}`);
            
            const isNetworkError = data.type === Hls.ErrorTypes.NETWORK_ERROR;
            const isManifestError = data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
                                    data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
                                    data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR;
            
            const responseCode = data.response?.code;
            const isTokenExpiredOrAuthError = responseCode === 403 || responseCode === 404 || responseCode === 401;

            if (isManifestError || isTokenExpiredOrAuthError || (responseCode && responseCode >= 400)) {
              console.warn(`[ACM TV] Fatal manifest / token expired error detected (${responseCode || data.details}). Skipping program.`);
              setTokenExpiryStatus(responseCode === 403 ? 'Expired (403)' : responseCode === 404 ? 'Expired (404)' : 'Error');
              if (currentInst) {
                updateFailedProgram(currentInst.instanceId);
              }
            } else {
              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                console.log('[ACM TV] Fatal Media Error. Attempting HLS recoverMediaError...');
                hls.recoverMediaError();
              } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                console.log('[ACM TV] Fatal Network Error. Attempting HLS startLoad...');
                hls.startLoad();
              } else {
                console.warn(`[ACM TV] Unrecoverable HLS error (${data.details}). Skipping program.`);
                if (currentInst) {
                  updateFailedProgram(currentInst.instanceId);
                }
              }
            }
          } else {
            console.warn(`[ACM TV] Non-fatal HLS error: ${data.details}`);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log(`[ACM TV] Native HLS supported. Loading URL: ${src}`);
        setHlsManifestStatus('Native (Safari)');
        setHlsQualityLevel('Auto (Native)');
        
        video.src = src;
        video.load();
        
        const playNative = () => {
          video.currentTime = seekOffset;
          video.play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
              consecutiveErrorsRef.current = 0;
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
        setHlsManifestStatus('Unsupported Browser');
        if (currentInst) {
          updateFailedProgram(currentInst.instanceId);
        }
      }
    } else {
      setHlsUrl(null);
      setHlsManifestStatus('N/A');
      setHlsQualityLevel('N/A (MP4)');
      setHlsPlaybackState('Playing (MP4)');
      setHlsFatalError('None');
      setTokenExpiryStatus('N/A');

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

  // Clean up Hls instance on unmount
  useEffect(() => {
    return () => {
      destroyHls();
    };
  }, []);

  // Sync playback state in state variable for HUD
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateStateLabel = () => {
      if (video.paused) {
        setHlsPlaybackState('Paused');
      } else if (video.seeking) {
        setHlsPlaybackState('Seeking');
      } else if (isBuffering) {
        setHlsPlaybackState('Buffering');
      } else {
        setHlsPlaybackState('Playing');
      }
    };

    video.addEventListener('play', updateStateLabel);
    video.addEventListener('playing', updateStateLabel);
    video.addEventListener('pause', updateStateLabel);
    video.addEventListener('seeking', updateStateLabel);
    video.addEventListener('seeked', updateStateLabel);
    video.addEventListener('waiting', updateStateLabel);

    return () => {
      video.removeEventListener('play', updateStateLabel);
      video.removeEventListener('playing', updateStateLabel);
      video.removeEventListener('pause', updateStateLabel);
      video.removeEventListener('seeking', updateStateLabel);
      video.removeEventListener('seeked', updateStateLabel);
      video.removeEventListener('waiting', updateStateLabel);
    };
  }, [isBuffering]);

  // Sync real-time video element diagnostics for HUD without accessing refs inside JSX
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateDiagStates = () => {
      setVideoReadyState(video.readyState);
      setVideoNetworkState(video.networkState);
      setVideoCurrentTime(video.currentTime);
      setVideoDuration(video.duration);
      
      const ranges: string[] = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push(`[${video.buffered.start(i).toFixed(1)}s - ${video.buffered.end(i).toFixed(1)}s]`);
      }
      setVideoBufferedRanges(ranges.join(', ') || 'none');
      setVideoError(video.error ? `Code ${video.error.code}: ${video.error.message || 'Error'}` : 'None');
      setHudStalledState(isStalledState.current);
      setHudStallCount(stallCountRef.current);
      
      const currentInst = broadcastState?.currentProgram;
      if (currentInst) {
        setHudRecoveryCount(recoveryCountRef.current[currentInst.instanceId] || 0);
      }
    };

    video.addEventListener('timeupdate', updateDiagStates);
    video.addEventListener('progress', updateDiagStates);
    video.addEventListener('durationchange', updateDiagStates);
    video.addEventListener('loadedmetadata', updateDiagStates);
    video.addEventListener('error', updateDiagStates);
    video.addEventListener('waiting', updateDiagStates);
    video.addEventListener('playing', updateDiagStates);

    updateDiagStates();

    return () => {
      video.removeEventListener('timeupdate', updateDiagStates);
      video.removeEventListener('progress', updateDiagStates);
      video.removeEventListener('durationchange', updateDiagStates);
      video.removeEventListener('loadedmetadata', updateDiagStates);
      video.removeEventListener('error', updateDiagStates);
      video.removeEventListener('waiting', updateDiagStates);
      video.removeEventListener('playing', updateDiagStates);
    };
  }, [broadcastState?.currentProgram?.instanceId, isBuffering]);

  // Check native audioTracks API support on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const supported = 'audioTracks' in video || 'audioTracks' in HTMLVideoElement.prototype;
      setHasAudioTrackSupport(supported);
    }
  }, []);

  // Listen for 'D' key press to toggle diagnostics HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        setShowDiagnostics(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Force re-renders for diagnostics HUD without affecting core loop
  const [diagnosticsTick, setDiagnosticsTick] = useState(0);
  useEffect(() => {
    if (!showDiagnostics) return;
    const interval = setInterval(() => {
      setDiagnosticsTick(t => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [showDiagnostics]);

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

  const getBufferedRangesString = () => {
    const video = videoRef.current;
    if (!video) return 'none';
    const ranges = [];
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push(`[${video.buffered.start(i).toFixed(1)}s - ${video.buffered.end(i).toFixed(1)}s]`);
    }
    return ranges.join(', ') || 'none';
  };

  const detectNativeAudioTracks = () => {
    const video = videoRef.current;
    if (!video) return;

    const nativeTracks = (video as any).audioTracks;
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

    const nativeTracks = (video as any).audioTracks;
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

  // Listen to video element events for diagnostics
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const events = [
      'loadstart', 'suspend', 'emptied', 'stalled', 'error', 'abort',
      'waiting', 'playing', 'loadedmetadata', 'canplay', 'play', 'pause'
    ];

    const logEvent = (e: Event) => {
      const eventName = e.type.toUpperCase();
      console.log(`[ACM TV][MEDIA EVENT] ${eventName} | readyState: ${video.readyState} | networkState: ${video.networkState}`);
      setLastMediaEvent(`${eventName} (${new Date().toLocaleTimeString()})`);
    };

    events.forEach(evt => video.addEventListener(evt, logEvent));

    return () => {
      events.forEach(evt => video.removeEventListener(evt, logEvent));
    };
  }, [videoSrc]);

  // Reset fallback active on program switch
  useEffect(() => {
    if (isFallbackActive) {
      setIsFallbackActive(false);
    }
  }, [broadcastState?.currentProgram?.instanceId]);

  // Main Effect: Switch programs, load metadata, filter missing files, apply defaults
  useEffect(() => {
    const currentInst = broadcastState?.currentProgram;
    if (!currentInst) return;

    let active = true;

    // Reset error states on program transition
    setMediaError(null);
    setMissingFilePath(null);
    consecutiveErrorsRef.current = 0;
    setMetadataLoaded(false);

    if (isFallbackActive) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.src = '';
      }
      setIsLoading(false);
      return;
    }

    const loadMetadataAndSetup = async () => {
      const videoUrl = currentInst.program.videoUrl;
      const targetSrc = getDirectVideoUrl(videoUrl);

      setIsLoading(true);
      setValidationResult('Validating...');

      // 1. Verify remote URL before assigning it
      console.log(`[ACM TV][VALIDATION] Validating remote source: ${targetSrc}`);
      const valRes = await validateRemoteUrl(targetSrc);
      console.log(`[ACM TV][VALIDATION RESULT] Success: ${valRes.success}, Reason: ${valRes.reason || 'None'}`);
      if (!valRes.success) {
        const reason = `Validation failed: ${valRes.reason || 'Unknown error'}`;
        setValidationResult(`Failed: ${reason}`);
        updateFailedProgram(currentInst.instanceId);
        setIsLoading(false);
        return;
      }

      // 2. Fetch metadata (completely optional, do not block or throw error if it fails)
      const metadata = await fetchAndCacheMetadata(videoUrl, currentInst.program.metadataUrl);
      if (!active) return;

      const videoSource = metadata ? (metadata.hls || metadata.video || targetSrc) : targetSrc;

      // 3. Verify duration > 0 (fallback to program default if metadata missing)
      const duration = metadata?.duration || currentInst.program.duration;
      if (!(duration > 0)) {
        const reason = `Invalid duration: ${duration}s (must be > 0)`;
        setValidationResult(`Failed: ${reason}`);
        updateFailedProgram(currentInst.instanceId);
        setIsLoading(false);
        return;
      }

      // Validation passed
      setValidationResult('Passed');

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
        const hasDefaultSub = mappedSub.some((s: any) => s.enabled);
        if (hasDefaultSub) {
          setTimeout(() => {
            const video = videoRef.current;
            if (video) {
              const activeSub = mappedSub.find((s: any) => s.enabled);
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
        loadAndPlaySource(videoSource, broadcastState?.playbackPosition || 0);
      } else {
        setIsLoading(false);
      }
    };

    loadMetadataAndSetup();

    return () => {
      active = false;
    };
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
      const nativeTracks = (video as any).audioTracks;
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
    const nativeTracks = (video as any).audioTracks;
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
  }, [audioTracks, isPlaying, isBuffering, isLoading, isMuted]);

  // Run update loop
  useEffect(() => {
    // Run initial calculation
    updateBroadcastState();

    // Regular interval check for drift correction and program handovers (every 2.5s)
    const interval = setInterval(updateBroadcastState, 2500);

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
            updateBroadcastState();
            scheduleNextHandover();
          }, msRemaining + 200); // 200ms buffer to allow server clock rollover
        }
      } catch (e) {
        // Ignored
      }
    };
    scheduleNextHandover();

    // Event listeners to handle tab active state and device sleep/wake-up
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[ACM TV] Page visible, executing immediate broadcast sync.");
        updateBroadcastState();
        scheduleNextHandover();
      }
    };

    const handleWindowFocus = () => {
      console.log("[ACM TV] Window focused, running sync.");
      updateBroadcastState();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', updateBroadcastState);

    return () => {
      clearInterval(interval);
      if (handoverTimeout) clearTimeout(handoverTimeout);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', updateBroadcastState);
    };
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

      // Check actual vs. configured duration
      const actualDuration = video.duration;
      const configuredDuration = currentInst.program.duration;
      if (actualDuration && configuredDuration) {
        const diff = Math.abs(actualDuration - configuredDuration);
        if (diff > 2) {
          const warning = `Duration mismatch: Configured ${configuredDuration}s vs Actual ${actualDuration.toFixed(1)}s`;
          console.warn(warning);
          setDurationWarning(warning);
        } else {
          setDurationWarning(null);
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
    const recoveryCount = recoveryCountRef.current[instanceId] || 0;
    console.error(`[ACM TV][PLAYBACK ERROR] Context: ${errorContext} | Recovery Count: ${recoveryCount} | Details:`, errorDetail || '');

    if (recoveryCount < 1) {
      recoveryCountRef.current[instanceId] = recoveryCount + 1;
      console.log(`[ACM TV][RECOVERY] Attempting controlled recovery for instance: ${instanceId}`);
      try {
        if (hlsRef.current) {
          hlsRef.current.recoverMediaError();
        } else {
          video.load();
          const targetPos = broadcastState?.playbackPosition || 0;
          const duration = video.duration || currentInst.program.duration || 1;
          video.currentTime = targetPos % duration;
          video.play()
            .then(() => {
              console.log(`[ACM TV][RECOVERY] Recovery attempt succeeded.`);
            })
            .catch((err) => {
              if (err instanceof Error && err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                handlePlaybackError('Recovery play failed', err);
              }
            });
        }
      } catch (err) {
        handlePlaybackError('Recovery reload/seek failed', err);
      }
    } else {
      console.error(`[ACM TV][RECOVERY] Recovery already attempted for instance ${instanceId}. Skipping to next program.`);
      updateFailedProgram(instanceId);
    }
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
      setMissingFilePath(null);
      setIsRetrying(false);
      activeInstanceIdRef.current = ''; // Reset identifier to force reload
      updateBroadcastState();
    }, 1500);
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
    updateBroadcastState();
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

  const progressPercent = broadcastState && broadcastState.currentProgram
    ? (broadcastState.playbackPosition / broadcastState.currentProgram.program.duration) * 100
    : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800 shadow-amber-500/5 group cursor-none"
      style={{ cursor: showControls || showTapToUnmute || mediaError ? 'auto' : 'none' }}
    >
      {/* External Audio Track Element (Chrome Compatible) */}
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
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          console.log('[ACM TV][BUFFERING] Video started playing (onPlay)');
        }}
        onPlaying={() => {
          setIsBuffering(false);
          console.log('[ACM TV][BUFFERING] Video resumed playing (onPlaying)');
        }}
        onWaiting={() => {
          setIsBuffering(true);
          console.log('[ACM TV][BUFFERING] Video waiting/buffering (onWaiting)');
        }}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-cover"
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

      {/* Branded Channel Bug / Watermark - Visible during playback */}
      {isPlaying && !mediaError && (
        <div className="absolute top-4 right-4 z-30 w-24 sm:w-32 opacity-35 hover:opacity-80 transition-opacity duration-300 pointer-events-none select-none">
          <img 
            src={channel.bugUrl || "/branding/acm-tv-bug.svg"} 
            alt="ACM TV Watermark" 
            className="w-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          />
        </div>
      )}

      {/* Loading & Buffering Spinner HUD */}
      {(isLoading || isBuffering) && !mediaError && (
        <div className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-zinc-950/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-zinc-800/80 shadow-2xl">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
              {isLoading ? 'LOADING FEED...' : 'BUFFERING FEED...'}
            </span>
          </div>
        </div>
      )}

      {/* Branded Standby Slate / Technical Difficulties */}
      {isFallbackActive && (
        <StandbyOverlay
          channel={channel}
          currentProgram={broadcastState?.currentProgram || null}
          upNext={broadcastState?.upNext || null}
          onRetry={handleReconnect}
          isRetrying={isRetrying}
        />
      )}

      {/* Custom Media / File Not Found Overlay (Validation Block) */}
      {mediaError && !isFallbackActive && (
        <div className="absolute inset-0 z-40 bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
          {/* Subtle Branded Background */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:30px_30px]"></div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 max-w-md w-full mx-4 p-8 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 shadow-2xl text-center"
          >
            <div className="flex justify-center mb-5 text-red-500">
              <AlertTriangle className="w-12 h-12" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
              {mediaError === "Media file not found" ? "Media File Not Found" : "Broadcast Outage"}
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              {mediaError === "Media file not found"
                ? "The schedule engine is running, but the media file is missing from the server storage."
                : "The video player encountered a playback error while trying to stream this file."
              }
            </p>

            {/* Error Detail Display */}
            {missingFilePath && (
              <div className="bg-black/60 border border-zinc-800/60 rounded-xl p-3.5 mb-6 text-left">
                <span className="text-[9px] font-black text-red-400 tracking-wider uppercase block mb-1">Target Path</span>
                <code className="text-xs font-mono text-zinc-300 break-all select-all font-bold">
                  {missingFilePath}
                </code>
              </div>
            )}

            {/* Action items */}
            <div className="space-y-3">
              <button
                onClick={handleReconnect}
                disabled={isRetrying}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs tracking-wider uppercase transition-all"
              >
                {isRetrying ? 'Checking Storage...' : 'RE-SYNC WITH STORAGE'}
              </button>
              
              <div className="text-[10px] text-zinc-500">
                Please check <code className="text-zinc-400">MEDIA_SETUP.md</code> to configure local files.
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tap to Unmute Autoplay Overlay */}
      <AnimatePresence>
        {isPlaying && showTapToUnmute && !mediaError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleUnmute}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer select-none"
          >
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="p-6 rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/20 mb-4"
            >
              <VolumeX className="w-10 h-10 stroke-[2.5]" />
            </motion.div>
            <h4 className="text-lg font-black text-white uppercase tracking-widest text-center px-4">
              Tap to Unmute Broadcast
            </h4>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">
              ACM TV is Broadcasting Live Now
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom HUD Overlays (Controls/Title Bar) */}
      <AnimatePresence>
        {showControls && !mediaError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none"
          >
            {/* Top HUD Banner */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-600 border border-red-500/40 text-[10px] font-black text-white tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  LIVE
                </span>
                <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300 tracking-wider">
                  1080P
                </span>
                <span className="hidden sm:inline text-xs text-zinc-400 font-medium">
                  {channel.name} Network Feed
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-zinc-300 bg-black/40 border border-zinc-800/80 px-3 py-1 rounded">
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>UTC {formatLocalTime(localTimeMs).replace(/AM|PM/g, '')}</span>
              </div>
            </div>

            {/* Bottom Controls HUD */}
            <div className="space-y-4 pointer-events-auto">
              {/* Program Info (Only if playing main program) */}
              {broadcastState?.currentProgram && (
                <div className="hidden sm:block max-w-xl text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <span className="text-[10px] font-bold text-amber-500 tracking-widest uppercase block mb-0.5">
                    Now Broadcasting • {broadcastState.currentProgram.program.category}
                  </span>
                  <h4 className="text-lg font-black text-white leading-tight">
                    {broadcastState.currentProgram.program.title}
                  </h4>
                </div>
              )}

              {/* Progress Bar (Branded) */}
              <div className="space-y-1.5">
                <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {broadcastState?.currentProgram && (
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                    <span>
                      {new Date(Math.max(0, broadcastState.playbackPosition) * 1000).toISOString().substring(11, 19)}
                    </span>
                    <span>
                      {new Date(broadcastState.currentProgram.program.duration * 1000).toISOString().substring(11, 19)}
                    </span>
                  </div>
                )}
              </div>

              {/* Controls Action Panel */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-4">
                  {/* Since live stream, no pause capability, just status indicator */}
                  <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                    <Tv className="w-3.5 h-3.5 text-amber-500" />
                    <span>Real-Time Broadcast</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Audio Track Selector (VLC-Style Fallback Menu) */}
                  {audioTracks.length > 1 && (
                    <AudioTrackSelector
                      tracks={audioTracks}
                      onSelectTrack={handleSelectTrack}
                      hasNativeSupport={hasAudioTrackSupport}
                    />
                  )}

                  {/* Subtitle Selector */}
                  {subtitles.length > 0 && (
                    <SubtitleSelector
                      tracks={subtitles}
                      onSelectTrack={handleSelectSubtitleTrack}
                    />
                  )}

                  {/* Diagnostics HUD Toggle */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDiagnostics(!showDiagnostics);
                    }}
                    className={`p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border text-white transition-colors cursor-pointer ${showDiagnostics ? 'border-amber-500 text-amber-500' : 'border-zinc-800'}`}
                    title="Toggle Diagnostics HUD (Press 'D')"
                  >
                    <Activity className="w-4 h-4" />
                  </button>

                  {/* Mute Button */}
                  <button 
                    onClick={toggleMute}
                    className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Fullscreen Button */}
                  <button 
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-white transition-colors"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagnostics HUD Panel */}
      {showDiagnostics && (
        <div className="absolute top-4 left-4 z-40 max-w-sm w-80 p-4 rounded-xl bg-black/85 backdrop-blur-md border border-zinc-800/85 text-[10px] font-mono text-zinc-300 space-y-2 select-text pointer-events-auto">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5 mb-1.5">
            <span className="font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>ACM TV Diagnostics</span>
            </span>
            <button 
              onClick={() => setShowDiagnostics(false)}
              className="text-zinc-500 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1">
            <div><span className="text-zinc-500 font-bold">Active Program ID:</span> <span className="text-amber-400 font-bold">{broadcastState?.currentProgram?.program.id || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Active Program Title:</span> <span className="text-white font-bold">{broadcastState?.currentProgram?.program.title || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Schedule Slot:</span> <span className="text-white font-bold">{broadcastState?.currentProgram ? `${broadcastState.currentProgram.startTimeFormatted} - ${broadcastState.currentProgram.endTimeFormatted}` : 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Active Source URL:</span> <span className="text-zinc-400 break-all select-all font-bold">{videoSrc || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">HLS Manifest URL:</span> <span className="text-zinc-400 break-all select-all font-bold">{hlsUrl || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">HLS Manifest Status:</span> <span className={`font-bold ${hlsManifestStatus === 'Error' ? 'text-red-500' : 'text-emerald-500'}`}>{hlsManifestStatus}</span></div>
            <div><span className="text-zinc-500 font-bold">HLS Quality Level:</span> <span className="text-white font-bold">{hlsQualityLevel}</span></div>
            <div><span className="text-zinc-500 font-bold">HLS Playback State:</span> <span className="text-white font-bold">{hlsPlaybackState}</span></div>
            <div><span className="text-zinc-500 font-bold">HLS Fatal Error Status:</span> <span className={`font-bold ${hlsFatalError !== 'None' ? 'text-red-500' : 'text-zinc-400'}`}>{hlsFatalError}</span></div>
            <div><span className="text-zinc-500 font-bold">Token Expiry Status:</span> <span className={`font-bold ${tokenExpiryStatus.startsWith('Expired') ? 'text-red-500' : 'text-zinc-400'}`}>{tokenExpiryStatus}</span></div>
            <div><span className="text-zinc-500 font-bold">Schedule Offset (Target):</span> <span className="text-white font-bold">{broadcastState?.playbackPosition ? `${broadcastState.playbackPosition.toFixed(2)}s` : '0.00s'}</span></div>
            <div><span className="text-zinc-500 font-bold">Current Program Position:</span> <span className="text-white font-bold">{`${videoCurrentTime.toFixed(2)}s / ${videoDuration.toFixed(2)}s`}</span></div>
            {durationWarning && (
              <div className="text-amber-500 font-bold border border-amber-900 bg-amber-950/40 p-1.5 rounded mt-1.5">{durationWarning}</div>
            )}
            <div className="border-t border-zinc-800/80 my-1 pt-1"></div>
            <div><span className="text-zinc-500 font-bold">video.readyState:</span> <span className="text-white font-bold">{videoReadyState}</span></div>
            <div><span className="text-zinc-500 font-bold">video.networkState:</span> <span className="text-white font-bold">{videoNetworkState}</span></div>
            <div><span className="text-zinc-500 font-bold">Buffered Ranges:</span> <span className="text-zinc-400 font-bold">{videoBufferedRanges}</span></div>
            <div><span className="text-zinc-500 font-bold">Stalled State:</span> <span className={`font-bold ${hudStalledState ? 'text-red-500' : 'text-zinc-400'}`}>{hudStalledState ? 'STALLED (True)' : 'Normal (False)'}</span></div>
            <div><span className="text-zinc-500 font-bold">Stall Ticks:</span> <span className="text-white font-bold">{hudStallCount}</span></div>
            <div><span className="text-zinc-500 font-bold">Recovery Count:</span> <span className="text-amber-500 font-bold">{hudRecoveryCount}</span></div>
            <div><span className="text-zinc-500 font-bold">video.error:</span> <span className="text-red-500 font-bold">{videoError}</span></div>
            <div><span className="text-zinc-500 font-bold">Last Media Event:</span> <span className="text-white font-bold">{lastMediaEvent}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
