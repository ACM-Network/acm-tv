"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronRight, ChevronLeft, Check, HelpCircle } from 'lucide-react';
import { AudioTrack } from './AudioTrackSelector';
import { SubtitleTrack } from './SubtitleSelector';

export interface QualityLevel {
  id: number;
  height: number;
  bitrate: number;
}

interface PlayerSettingsProps {
  qualities: QualityLevel[];
  activeQuality: number | 'auto'; 
  onSelectQuality: (id: number | 'auto') => void;
  
  audioTracks: AudioTrack[];
  onSelectAudioTrack: (id: string | number) => void;
  hasNativeAudioSupport: boolean;

  subtitleTracks: SubtitleTrack[];
  onSelectSubtitleTrack: (id: string | number | null) => void;
}

export default function PlayerSettings({
  qualities,
  activeQuality,
  onSelectQuality,
  audioTracks,
  onSelectAudioTrack,
  hasNativeAudioSupport,
  subtitleTracks,
  onSelectSubtitleTrack
}: PlayerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'audio' | 'subtitles'>('main');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeAudioTrack = audioTracks.find(t => t.enabled);
  const activeSubtitle = subtitleTracks.find(t => t.enabled);

  const getQualityLabel = () => {
    if (qualities.length === 0) return 'Auto';
    if (activeQuality === 'auto') return 'Auto';
    const q = qualities.find(q => q.id === activeQuality);
    return q ? `${q.height}p` : 'Auto';
  };

  const getAudioLabel = () => {
    if (!hasNativeAudioSupport || audioTracks.length <= 1) return 'Default';
    return activeAudioTrack ? activeAudioTrack.label : 'Default';
  };

  const getSubtitleLabel = () => {
    if (subtitleTracks.length === 0) return 'Off';
    return activeSubtitle ? activeSubtitle.label : 'Off';
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) setActiveMenu('main');
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-full transition-all flex items-center justify-center cursor-pointer hover:scale-110 ${isOpen ? 'text-white bg-white/20' : 'text-white hover:text-gray-200 hover:bg-white/10'}`}
        aria-label="Settings"
      >
        <Settings className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-500 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-[280px] sm:w-[320px] h-[340px] rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden z-50 text-left pointer-events-auto transform transition-all animate-slide-up origin-bottom-right flex flex-col">
          
          <div className="relative w-full h-full overflow-hidden">
            {/* MAIN MENU */}
            <div className={`absolute inset-0 transition-transform duration-300 ease-out flex flex-col ${activeMenu === 'main' ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="px-5 py-4 border-b border-white/10 flex items-center">
                <span className="text-sm font-bold text-white tracking-wide">Settings</span>
              </div>
              <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                <button onClick={(e) => { e.stopPropagation(); setActiveMenu('quality'); }} className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-white/90 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Quality</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors">
                    <span className="text-xs">{getQualityLabel()}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setActiveMenu('audio'); }} className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-white/90 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Audio Track</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors">
                    <span className="text-xs">{getAudioLabel()}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setActiveMenu('subtitles'); }} className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-white/90 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Subtitles</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors">
                    <span className="text-xs">{getSubtitleLabel()}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>

            {/* QUALITY SUBMENU */}
            <div className={`absolute inset-0 transition-transform duration-300 ease-out flex flex-col ${activeMenu === 'quality' ? 'translate-x-0' : 'translate-x-full'}`}>
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu('main'); }} className="px-3 py-4 border-b border-white/10 flex items-center gap-2 text-white hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-5 h-5 text-white/70" />
                <span className="text-sm font-bold tracking-wide">Quality</span>
              </button>
              <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                {qualities.length === 0 ? (
                  <div className="px-4 py-8 text-center flex flex-col items-center justify-center h-full">
                    <HelpCircle className="w-8 h-8 text-white/30 mb-3" />
                    <p className="text-xs text-white/50 leading-relaxed">Manual quality selection is not available for this stream.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <button onClick={(e) => { e.stopPropagation(); onSelectQuality('auto'); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all ${activeQuality === 'auto' ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'}`}>
                      <span>Auto</span>
                      {activeQuality === 'auto' && <Check className="w-4 h-4" />}
                    </button>
                    {[...qualities].reverse().map(q => (
                      <button key={q.id} onClick={(e) => { e.stopPropagation(); onSelectQuality(q.id); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all ${activeQuality === q.id ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'}`}>
                        <span>{q.height}p</span>
                        {activeQuality === q.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AUDIO SUBMENU */}
            <div className={`absolute inset-0 transition-transform duration-300 ease-out flex flex-col ${activeMenu === 'audio' ? 'translate-x-0' : 'translate-x-full'}`}>
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu('main'); }} className="px-3 py-4 border-b border-white/10 flex items-center gap-2 text-white hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-5 h-5 text-white/70" />
                <span className="text-sm font-bold tracking-wide">Audio Track</span>
              </button>
              <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                {!hasNativeAudioSupport || audioTracks.length <= 1 ? (
                  <div className="px-4 py-8 text-center flex flex-col items-center justify-center h-full">
                    <HelpCircle className="w-8 h-8 text-white/30 mb-3" />
                    <p className="text-xs text-white/50 leading-relaxed">No additional audio tracks are available.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {audioTracks.map(t => (
                      <button key={t.id} onClick={(e) => { e.stopPropagation(); onSelectAudioTrack(t.id); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all ${t.enabled ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'}`}>
                        <div className="flex flex-col text-left gap-0.5">
                          <span>{t.label}</span>
                          {t.language && t.language !== 'und' && <span className="text-[10px] text-white/40 font-normal uppercase tracking-wider">{t.language}</span>}
                        </div>
                        {t.enabled && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SUBTITLES SUBMENU */}
            <div className={`absolute inset-0 transition-transform duration-300 ease-out flex flex-col ${activeMenu === 'subtitles' ? 'translate-x-0' : 'translate-x-full'}`}>
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu('main'); }} className="px-3 py-4 border-b border-white/10 flex items-center gap-2 text-white hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-5 h-5 text-white/70" />
                <span className="text-sm font-bold tracking-wide">Subtitles</span>
              </button>
              <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                {subtitleTracks.length === 0 ? (
                  <div className="px-4 py-8 text-center flex flex-col items-center justify-center h-full">
                    <HelpCircle className="w-8 h-8 text-white/30 mb-3" />
                    <p className="text-xs text-white/50 leading-relaxed">No subtitles are available.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <button onClick={(e) => { e.stopPropagation(); onSelectSubtitleTrack(null); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all ${!activeSubtitle ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'}`}>
                      <span>Off</span>
                      {!activeSubtitle && <Check className="w-4 h-4" />}
                    </button>
                    {subtitleTracks.map(t => (
                      <button key={t.id} onClick={(e) => { e.stopPropagation(); onSelectSubtitleTrack(t.id); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all ${t.enabled ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'}`}>
                        <div className="flex flex-col text-left gap-0.5">
                          <span>{t.label}</span>
                          {t.language && <span className="text-[10px] text-white/40 font-normal uppercase tracking-wider">{t.language}</span>}
                        </div>
                        {t.enabled && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
