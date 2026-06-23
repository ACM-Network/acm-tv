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

interface ExtendedAudioTrack extends AudioTrack {
  url?: string;
}

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

  // Diagnostics and caching
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [validationResult, setValidationResult] = useState<string>('Pending');
  
  // Ref to track the current active instance ID to avoid unnecessary src changes
  const activeInstanceIdRef = useRef<string>('');
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

  const fetchAndCacheMetadata = async (videoUrl: string) => {
    const lastDotIndex = videoUrl.lastIndexOf('.');
    const base = lastDotIndex !== -1 ? videoUrl.substring(0, lastDotIndex) : videoUrl;
    const metadataUrl = base + '.metadata.json';

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
      
      setBroadcastState(state);
      if (onStateChange) onStateChange(state);

      const currentInst = state.currentProgram;

      // Program Switch Check
      if (activeInstanceIdRef.current !== currentInst.instanceId) {
        // Switching is handled asynchronously inside the useEffect listening to instanceId
      } else {
        const video = videoRef.current;
        if (video && !mediaError) {
          const actualPos = video.currentTime;
          const targetPos = state.playbackPosition;
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
    if (video) {
      // Guard against duplicate loads
      if (video.src !== src && !video.src.endsWith(src)) {
        console.log(`[ACM TV] Loading source: ${src}`);
        video.src = src;
        video.load();
      }
      
      // Attempt play
      video.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
          consecutiveErrorsRef.current = 0; // Reset count on successful playback
        })
        .catch((err) => {
          if (err.name === 'NotAllowedError') {
            console.warn("[ACM TV] Autoplay blocked by browser. Showing unmute overlay.");
            video.muted = true;
            setIsMuted(true);
            setShowTapToUnmute(true);
            video.play()
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
                consecutiveErrorsRef.current = 0;
              })
              .catch(e => {
                if (e.name === 'NotAllowedError') {
                  setShowTapToUnmute(true);
                } else if (e.name !== 'AbortError') {
                  handlePlaybackError('Initial muted playback failed', e);
                }
              });
          } else if (err.name === 'AbortError') {
            console.log("[ACM TV] Play call aborted by subsequent load/seek request.");
          } else {
            handlePlaybackError('Play call rejected', err);
          }
        });
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
    console.warn("[ACM TV][AUDIO FALLBACK] Falling back to default native/embedded audio.");
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
      setIsFallbackActive(false);
      return; // Return early, the state update will re-run this effect
    }

    const loadMetadataAndSetup = async () => {
      const videoUrl = currentInst.program.videoUrl;
      const lastDotIndex = videoUrl.lastIndexOf('.');
      const base = lastDotIndex !== -1 ? videoUrl.substring(0, lastDotIndex) : videoUrl;
      const metadataUrl = base + '.metadata.json';
      
      const targetSrc = isFallbackActive 
        ? STANDBY_FALLBACK_VIDEO_URL 
        : getDirectVideoUrl(videoUrl);

      setIsLoading(true);
      setValidationResult('Validating...');

      // 1. Verify metadata file exists (only if not fallback)
      if (!isFallbackActive) {
        const metadataExists = await verifyFileExists(metadataUrl);
        if (!metadataExists) {
          const reason = `Metadata file does not exist: ${metadataUrl}`;
          setValidationResult(`Failed: ${reason}`);
          setMediaError(reason);
          setMissingFilePath(metadataUrl);
          setIsLoading(false);
          return;
        }
      }

      // 2. Verify video file exists & resolves (currentSrc resolves)
      const videoExists = await verifyFileExists(targetSrc);
      if (!videoExists) {
        const reason = `Video file does not exist or fails to resolve: ${targetSrc}`;
        setValidationResult(`Failed: ${reason}`);
        setMediaError(reason);
        setMissingFilePath(targetSrc);
        setIsLoading(false);
        return;
      }

      // 3. Verify browser supports source natively
      const video = videoRef.current;
      if (video) {
        let mimeType = '';
        if (targetSrc.endsWith('.mp4')) mimeType = 'video/mp4';
        else if (targetSrc.endsWith('.m3u8')) mimeType = 'application/x-mpegURL';
        else if (targetSrc.endsWith('.webm')) mimeType = 'video/webm';
        else if (targetSrc.endsWith('.m4a')) mimeType = 'audio/mp4';
        else if (targetSrc.endsWith('.mkv')) mimeType = 'video/x-matroska';
        
        if (mimeType) {
          const canPlay = video.canPlayType(mimeType);
          if (canPlay === '' && targetSrc.endsWith('.mkv')) {
            const reason = `Browser does not support source format: .mkv natively unsupported by Chromium`;
            setValidationResult(`Failed: ${reason}`);
            setMediaError(reason);
            setMissingFilePath(targetSrc);
            setIsLoading(false);
            return;
          }
        }
      }

      const metadata = await fetchAndCacheMetadata(videoUrl);

      if (!active) return;

      const videoSource = metadata ? (metadata.hls || metadata.video || targetSrc) : targetSrc;

      // 4. Verify duration > 0
      const duration = metadata?.duration || currentInst.program.duration;
      if (!(duration > 0)) {
        const reason = `Invalid duration: ${duration}s (must be > 0)`;
        setValidationResult(`Failed: ${reason}`);
        setMediaError(reason);
        setMissingFilePath(targetSrc);
        setIsLoading(false);
        return;
      }

      // 5. Validation passed
      setValidationResult('Passed');

      // Setup audio tracks
      if (metadata && Array.isArray(metadata.audioTracks) && metadata.audioTracks.length > 0) {
        const currentSelection = audioTracks.find(t => t.enabled)?.id;
        const mapped = metadata.audioTracks.map((track: any) => ({
          id: track.code,
          label: track.language,
          language: track.code,
          codec: track.codec,
          default: track.default || false,
          enabled: currentSelection ? track.code === currentSelection : false,
          url: track.url
        }));

        if (!mapped.some((t: any) => t.enabled)) {
          const defaultTrack = mapped.find((t: any) => t.default);
          if (defaultTrack) {
            defaultTrack.enabled = true;
          } else {
            const native = mapped.find((t: any) => !t.url);
            if (native) native.enabled = true;
            else {
              const eng = mapped.find((t: any) => t.language === 'eng');
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

      // Setup subtitles
      if (metadata && Array.isArray(metadata.subtitles) && metadata.subtitles.length > 0) {
        const mappedSub = metadata.subtitles.map((sub: any, i: number) => ({
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

        try {
          const res = await fetch(videoSource, { method: 'HEAD' });
          if (res.status === 404) {
            console.error(`[ACM TV] Media file not found: ${videoSource}`);
            setMediaError("Media file not found");
            setMissingFilePath(videoSource);
            setIsLoading(false);
            return;
          }
          loadAndPlaySource(videoSource, broadcastState?.playbackPosition || 0);
        } catch (e) {
          console.warn(`[ACM TV] HEAD check failed for source ${videoSource}, playing directly:`, e);
          loadAndPlaySource(videoSource, broadcastState?.playbackPosition || 0);
        }
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
      // Modulo clamp using actual video duration
      const duration = video.duration || currentInst.program.duration || 1;
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

  const handlePlaybackError = (errorContext: string, errorDetail?: any) => {
    const video = videoRef.current;
    if (!video) return;

    const errorName = errorDetail?.name || errorDetail?.message || '';
    if (errorName === 'AbortError' || errorName.includes('abort') || errorContext.includes('AbortError')) {
      console.log(`[ACM TV] Playback aborted (AbortError) - normal navigation/seeking interruption. Ignoring.`);
      return;
    }
    if (errorName === 'NotAllowedError' || errorName.includes('NotAllowed') || errorContext.includes('NotAllowedError')) {
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
        video.load();
        const targetPos = broadcastState?.playbackPosition || 0;
        const duration = video.duration || currentInst.program.duration || 1;
        video.currentTime = targetPos % duration;
        video.play()
          .then(() => {
            console.log(`[ACM TV][RECOVERY] Recovery attempt succeeded.`);
          })
          .catch((err) => {
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
              handlePlaybackError('Recovery play failed', err);
            }
          });
      } catch (err) {
        handlePlaybackError('Recovery reload/seek failed', err);
      }
    } else {
      console.error(`[ACM TV][RECOVERY] Recovery already attempted for instance ${instanceId}. Escalating to Broadcast Outage.`);
      setMediaError(errorDetail?.message || "Video playback failed (recovery exhausted)");
      setMissingFilePath(video.src || videoSrc);
      setIsLoading(false);
      if (!isFallbackActive) {
        setIsFallbackActive(true);
      }
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

      {/* Custom Media / File Not Found Overlay (Validation Block) */}
      {mediaError && (
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
                <span>UTC {formatLocalTime(Date.now()).replace(/AM|PM/g, '')}</span>
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
            <div><span className="text-zinc-500 font-bold">Current Program:</span> <span className="text-white font-bold">{broadcastState?.currentProgram?.program.title || 'N/A'} ({broadcastState?.currentProgram?.program.id || 'N/A'})</span></div>
            <div><span className="text-zinc-500 font-bold">Schedule Slot:</span> <span className="text-white font-bold">{broadcastState?.currentProgram ? `${broadcastState.currentProgram.startTimeFormatted} - ${broadcastState.currentProgram.endTimeFormatted}` : 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Active Video URL:</span> <span className="text-zinc-400 break-all select-all font-bold">{videoSrc || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Program Config videoUrl:</span> <span className="text-zinc-400 break-all select-all font-bold">{broadcastState?.currentProgram?.program.videoUrl || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Program Type / Cat:</span> <span className="text-white font-bold">{broadcastState?.currentProgram?.program.type || 'N/A'} / {broadcastState?.currentProgram?.program.category || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Active Audio URL:</span> <span className="text-zinc-400 break-all select-all font-bold">{audioTracks.find(t => t.enabled)?.url || 'Embedded / Native'}</span></div>
            <div><span className="text-zinc-500 font-bold">Metadata URL:</span> <span className="text-zinc-400 break-all select-all font-bold">{broadcastState?.currentProgram ? (broadcastState.currentProgram.program.videoUrl.substring(0, broadcastState.currentProgram.program.videoUrl.lastIndexOf('.')) + '.metadata.json') : 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Metadata Status:</span> <span className="text-white font-bold">{metadataLoaded ? 'Valid' : 'Missing / Invalid'}</span></div>
            <div><span className="text-zinc-500 font-bold">Validation Result:</span> <span className={`font-bold ${validationResult.startsWith('Failed') ? 'text-red-500' : 'text-emerald-500'}`}>{validationResult}</span></div>
            <div><span className="text-zinc-500 font-bold">video.readyState:</span> <span className="text-white font-bold">{videoRef.current?.readyState ?? 0}</span></div>
            <div><span className="text-zinc-500 font-bold">video.networkState:</span> <span className="text-white font-bold">{videoRef.current?.networkState ?? 0}</span></div>
            <div><span className="text-zinc-500 font-bold">video.currentSrc:</span> <span className="text-zinc-400 break-all select-all font-bold">{videoRef.current?.currentSrc || 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Playhead (Time/Dur):</span> <span className="text-white font-bold">{videoRef.current ? `${videoRef.current.currentTime.toFixed(2)}s / ${videoRef.current.duration.toFixed(2)}s` : 'N/A'}</span></div>
            <div><span className="text-zinc-500 font-bold">Buffered Ranges:</span> <span className="text-zinc-400 font-bold">{getBufferedRangesString()}</span></div>
            <div><span className="text-zinc-500 font-bold">Playback Rate:</span> <span className="text-white font-bold">{videoRef.current?.playbackRate ?? 1}</span></div>
            <div><span className="text-zinc-500 font-bold">Stalled State:</span> <span className={`font-bold ${isStalledState.current ? 'text-red-500' : 'text-zinc-400'}`}>{isStalledState.current ? 'STALLED (True)' : 'Normal (False)'}</span></div>
            <div><span className="text-zinc-500 font-bold">Stall Count (Ticks):</span> <span className="text-white font-bold">{stallCountRef.current}</span></div>
            <div><span className="text-zinc-500 font-bold">Recovery Count:</span> <span className="text-amber-500 font-bold">{broadcastState?.currentProgram ? (recoveryCountRef.current[broadcastState.currentProgram.instanceId] || 0) : 0}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
