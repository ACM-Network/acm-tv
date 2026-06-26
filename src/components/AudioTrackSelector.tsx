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
        className={`p-2 rounded-full transition-all flex items-center justify-center cursor-pointer ${
          isDisabled && !isOpen
            ? 'opacity-50 text-white/50 cursor-not-allowed'
            : 'text-white hover:text-gray-300 hover:bg-white/10'
        }`}
        title={!hasNativeSupport ? "Audio Tracks (Unsupported)" : "Audio"}
      >
        <Headphones className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-64 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50 text-left pointer-events-auto transform transition-all animate-slide-up origin-bottom-right">
          <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white tracking-wide">Audio</span>
            {!hasNativeSupport && (
              <span className="text-red-400 text-[10px] font-bold bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 uppercase tracking-widest">
                Unsupported
              </span>
            )}
          </div>

          <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
            {!hasNativeSupport ? (
              <div className="px-4 py-6 text-center space-y-3 select-none">
                <HelpCircle className="w-6 h-6 text-white/40 mx-auto" />
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  Multiple audio tracks are unsupported in this browser.
                </p>
              </div>
            ) : tracks.length <= 1 ? (
              <div className="px-4 py-4 text-xs font-medium text-white/50 select-none text-center">
                Single track only
              </div>
            ) : (
              <div className="space-y-1">
                {tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectTrack(track.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      track.enabled
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex flex-col text-left gap-0.5">
                      <span className={track.enabled ? 'font-semibold' : ''}>{track.label}</span>
                      {track.language && track.language !== 'und' && (
                        <span className="text-[10px] text-white/40 font-normal uppercase tracking-wider">
                          {track.language}
                        </span>
                      )}
                    </span>
                    {track.enabled && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
