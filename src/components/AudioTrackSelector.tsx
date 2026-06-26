"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Headphones, Check, HelpCircle } from 'lucide-react';

export interface AudioTrack {
  id: string | number;
  label: string;
  language: string;
  enabled: boolean;
}

interface AudioTrackSelectorProps {
  tracks: AudioTrack[];
  onSelectTrack: (trackId: string | number) => void;
  hasNativeSupport: boolean;
}

export default function AudioTrackSelector({
  tracks,
  onSelectTrack,
  hasNativeSupport
}: AudioTrackSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDisabled = !hasNativeSupport || tracks.length <= 1;
  const activeTrack = tracks.find(t => t.enabled);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-sm bg-signal-surface hover:bg-signal-surface-hover border transition-colors flex items-center gap-1.5 cursor-pointer ${
          isDisabled && !isOpen
            ? 'opacity-50 border-signal-border text-signal-text-secondary hover:bg-signal-surface'
            : 'border-signal-border-active text-signal-text-primary'
        }`}
        title={!hasNativeSupport ? "Audio Tracks (Unsupported)" : "Audio Tracks"}
      >
        <Headphones className="w-4 h-4" />
        <span className="text-xs font-bold font-mono tracking-wide hidden sm:inline">
          {activeTrack && hasNativeSupport ? activeTrack.label : 'AUDIO'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-56 rounded-md bg-signal-surface-raised border border-signal-border shadow-2xl p-1.5 z-50 text-left pointer-events-auto animate-slide-up">
          <div className="px-2 py-1.5 text-[10px] font-bold font-mono text-signal-text-secondary tracking-widest uppercase border-b border-signal-border mb-1.5 flex items-center justify-between">
            <span>AUDIO TRK</span>
            {!hasNativeSupport && (
              <span className="text-signal-red text-[8px] font-bold bg-signal-red-dim px-1 py-0.5 rounded-sm border border-signal-red/20">
                UNSUPPORTED
              </span>
            )}
          </div>

          {!hasNativeSupport ? (
            <div className="px-2 py-3 text-center space-y-2 select-none">
              <HelpCircle className="w-5 h-5 text-signal-text-secondary mx-auto" />
              <p className="text-[10px] font-mono text-signal-text-secondary leading-normal">
                MULTI-TRACK UNSUPPORTED
              </p>
            </div>
          ) : tracks.length <= 1 ? (
            <div className="px-2 py-2 text-[10px] font-mono text-signal-text-secondary select-none text-center">
              SINGLE TRACK
            </div>
          ) : (
            <div className="space-y-0.5">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(track.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs font-mono font-bold transition-colors ${
                    track.enabled
                      ? 'bg-signal-amber-dim text-signal-amber border border-signal-border-active'
                      : 'text-signal-text-secondary hover:bg-signal-surface-hover hover:text-signal-text-primary border border-transparent'
                  }`}
                >
                  <span className="flex flex-col text-left">
                    <span>{track.label}</span>
                    {track.language && track.language !== 'und' && (
                      <span className="text-[9px] text-signal-text-tertiary uppercase tracking-wider">
                        LANG: {track.language}
                      </span>
                    )}
                  </span>
                  {track.enabled && (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
