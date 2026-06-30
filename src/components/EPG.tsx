"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tv, Play, Info, Clock, AlertCircle, Radio } from 'lucide-react';
import { Channel, ProgramInstance } from '@/types';
import { getDailyTimeline } from '@/utils/scheduleEngine';

// Configuration
const PIXELS_PER_MINUTE = 8;
const TIMELINE_START_OFFSET_MINUTES = 60; // Show 1 hour before current time

interface EPGProps {
  channels: Channel[];
}

export default function EPG({ channels }: EPGProps) {
  const router = useRouter();
  
  // Base time states
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [timelineStartMs, setTimelineStartMs] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  
  // Data state
  const [epgData, setEpgData] = useState<{ channel: Channel; timeline: ProgramInstance[] }[]>([]);

  // Hover state
  const [hoveredProgram, setHoveredProgram] = useState<{
    program: ProgramInstance;
    channel: Channel;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize and update time
  useEffect(() => {
    setIsMounted(true);
    const initTime = Date.now();
    setCurrentTimeMs(initTime);
    // Start timeline 1 hour before current time, rounded down to nearest half hour
    const date = new Date(initTime);
    date.setMinutes(date.getMinutes() >= 30 ? 30 : 0, 0, 0);
    const baseStart = date.getTime() - (TIMELINE_START_OFFSET_MINUTES * 60 * 1000);
    setTimelineStartMs(baseStart);

    // Initial data fetch
    const data = channels.map(ch => ({
      channel: ch,
      timeline: getDailyTimeline(ch, initTime)
    }));
    setEpgData(data);

    // Update current time line every minute
    const timeInterval = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60000);

    return () => clearInterval(timeInterval);
  }, [channels]);

  // Center timeline on "NOW" on mount
  useEffect(() => {
    if (isMounted && containerRef.current && currentTimeMs > 0 && timelineStartMs > 0) {
      const minutesSinceStart = (currentTimeMs - timelineStartMs) / (60 * 1000);
      const scrollPos = (minutesSinceStart * PIXELS_PER_MINUTE) - (containerRef.current.clientWidth / 3);
      if (scrollPos > 0) {
        containerRef.current.scrollLeft = scrollPos;
      }
    }
  }, [isMounted, timelineStartMs]); // Run only once when ready

  if (!isMounted) {
    return (
      <div className="w-full h-96 bg-signal-surface border border-signal-border rounded-lg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-signal-border-active border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    );
  }

  // Generate Time Ruler Markers (24 hours from start)
  const timeMarkers = [];
  for (let i = 0; i <= 48; i++) {
    const markerTime = timelineStartMs + (i * 30 * 60 * 1000); // every 30 mins
    const date = new Date(markerTime);
    timeMarkers.push({
      time: markerTime,
      label: i % 2 === 0 ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      offsetPx: i * 30 * PIXELS_PER_MINUTE
    });
  }

  const nowOffsetPx = Math.max(0, (currentTimeMs - timelineStartMs) / (60 * 1000) * PIXELS_PER_MINUTE);

  const handleProgramClick = (instance: ProgramInstance, channelId: string) => {
    const isLive = currentTimeMs >= instance.startTime && currentTimeMs < instance.endTime;
    if (isLive) {
      router.push(`/live?channel=${channelId}`);
    } else {
      // Placeholder for future details page/modal
      alert(`Program Details: ${instance.program.title}\nStarts: ${instance.startTimeFormatted}`);
    }
  };

  const getProgramStyle = (type: string, category: string) => {
    // Subtle visual identities based on type/category
    const catLower = category?.toLowerCase() || '';
    if (type === 'trailer' || type === 'promo') return 'bg-signal-border/40 hover:bg-signal-border/60 border-signal-border';
    if (type === 'ident') return 'bg-signal-black/80 hover:bg-signal-black border-signal-border-active';
    if (type === 'song' || catLower.includes('music')) return 'bg-signal-green-dim/20 hover:bg-signal-green-dim/40 border-signal-green/20';
    if (catLower.includes('news')) return 'bg-blue-900/20 hover:bg-blue-900/40 border-blue-500/20';
    if (catLower.includes('movie')) return 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-500/20';
    
    // Default content
    return 'bg-signal-surface-raised hover:bg-signal-surface-hover border-signal-border';
  };

  return (
    <div className="relative w-full bg-signal-black border-y md:border border-signal-border md:rounded-lg overflow-hidden flex flex-col h-[70vh] min-h-[500px]">
      
      {/* Header */}
      <div className="flex-none px-4 py-3 bg-signal-surface-raised border-b border-signal-border flex justify-between items-center z-30 relative shadow-sm">
        <h2 className="text-sm font-bold text-signal-text-primary tracking-wide uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-signal-amber" />
          Electronic Program Guide
        </h2>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-signal-red animate-pulse-live"></span>
           <span className="text-[10px] font-mono text-signal-text-secondary uppercase tracking-wider">Sync: UTC Auto</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-hidden flex relative bg-signal-surface/30">
        
        {/* Sticky Channel Column */}
        <div className="w-24 sm:w-36 md:w-48 flex-none border-r border-signal-border bg-signal-surface z-20 flex flex-col shadow-md">
          {/* Empty corner cell for timeline ruler */}
          <div className="h-12 border-b border-signal-border bg-signal-surface-raised sticky top-0 z-30"></div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            {epgData.map(({ channel }) => (
              <div key={`ch-${channel.id}`} className="h-24 md:h-28 border-b border-signal-border flex flex-col justify-center px-2 md:px-4 group hover:bg-signal-surface-hover transition-colors">
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="hidden md:inline-block px-1.5 py-0.5 rounded-sm bg-signal-black border border-signal-border text-[9px] font-mono text-signal-text-tertiary">
                    {channel.channelNumber || 'CH'}
                  </span>
                  {channel.logoUrl ? (
                    <img src={channel.logoUrl} alt={channel.name} className="h-8 md:h-10 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
                  ) : (
                    <span className="text-xs md:text-sm font-bold uppercase truncate text-signal-text-primary">{channel.name}</span>
                  )}
                </div>
                <span className="hidden md:block mt-1 text-[9px] font-mono text-signal-text-tertiary truncate px-1">
                  {channel.category || 'General Entertainment'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto relative custom-scrollbar scroll-smooth"
          onScroll={(e) => {
            // Sync vertical scroll of channels
            const target = e.currentTarget;
            const channelCol = target.previousElementSibling?.lastElementChild;
            if (channelCol) {
              channelCol.scrollTop = target.scrollTop;
            }
          }}
        >
          <div className="relative min-h-full" style={{ width: `${48 * 30 * PIXELS_PER_MINUTE}px` }}>
            
            {/* Sticky Time Ruler */}
            <div className="h-12 border-b border-signal-border bg-signal-surface-raised sticky top-0 z-10 flex">
              {timeMarkers.map((marker, i) => (
                <div 
                  key={`marker-${i}`}
                  className="absolute h-full border-l border-signal-border/50 text-[10px] font-mono text-signal-text-tertiary pt-2 pl-2"
                  style={{ left: `${marker.offsetPx}px` }}
                >
                  {marker.label && <span className="font-bold text-signal-text-secondary">{marker.label}</span>}
                </div>
              ))}
            </div>

            {/* Background vertical grid lines */}
            <div className="absolute top-12 bottom-0 left-0 right-0 pointer-events-none z-0">
              {timeMarkers.map((marker, i) => (
                <div 
                  key={`grid-${i}`}
                  className="absolute top-0 bottom-0 border-l border-signal-border/10"
                  style={{ left: `${marker.offsetPx}px` }}
                />
              ))}
            </div>

            {/* NOW Indicator */}
            {nowOffsetPx > 0 && nowOffsetPx < 48 * 30 * PIXELS_PER_MINUTE && (
              <div 
                className="absolute top-0 bottom-0 z-20 pointer-events-none transition-all duration-1000 ease-linear"
                style={{ left: `${nowOffsetPx}px` }}
              >
                {/* Red Line */}
                <div className="absolute top-0 bottom-0 w-[1px] bg-signal-red shadow-[0_0_8px_rgba(224,64,64,0.8)]"></div>
                {/* Header Badge */}
                <div className="absolute top-1 -translate-x-1/2 px-1.5 py-0.5 bg-signal-red text-white text-[9px] font-bold font-mono rounded-sm shadow-md">
                  NOW
                </div>
              </div>
            )}

            {/* Programs Matrix */}
            <div className="absolute top-12 left-0 right-0">
              {epgData.map(({ channel, timeline }, rowIndex) => (
                <div key={`row-${channel.id}`} className="h-24 md:h-28 border-b border-signal-border relative hover:bg-signal-surface/20 transition-colors">
                  {timeline.map((instance) => {
                    // Calculate start position and width
                    const startOffsetMs = instance.startTime - timelineStartMs;
                    if (startOffsetMs + (instance.program.duration * 1000) < 0) return null; // Fully before timeline start
                    
                    const startPx = Math.max(0, startOffsetMs / (60 * 1000) * PIXELS_PER_MINUTE);
                    const widthPx = (instance.program.duration / 60) * PIXELS_PER_MINUTE;
                    
                    // Adjust width if start was cut off
                    const adjustedWidthPx = startOffsetMs < 0 
                      ? widthPx + (startOffsetMs / (60 * 1000) * PIXELS_PER_MINUTE)
                      : widthPx;

                    // Skip rendering if it's way past the viewport (optimization) - simplistic approach
                    if (startPx > 48 * 30 * PIXELS_PER_MINUTE) return null;

                    const isLive = currentTimeMs >= instance.startTime && currentTimeMs < instance.endTime;
                    const isPast = currentTimeMs >= instance.endTime;
                    const progressPercent = isLive ? ((currentTimeMs - instance.startTime) / (instance.program.duration * 1000)) * 100 : 0;

                    const baseStyle = getProgramStyle(instance.program.type, instance.program.category);

                    return (
                      <div
                        key={instance.instanceId}
                        className={`absolute top-1.5 md:top-2 bottom-1.5 md:bottom-2 rounded-md border p-2 overflow-hidden cursor-pointer transition-all duration-200 group ${
                          isLive 
                            ? 'bg-signal-surface-raised border-signal-amber shadow-[0_4px_15px_rgba(232,162,48,0.15)] z-10 scale-[1.02]' 
                            : isPast
                              ? 'bg-signal-black/40 border-signal-border/50 text-signal-text-tertiary hover:bg-signal-surface/60'
                              : `${baseStyle} text-signal-text-secondary hover:text-signal-text-primary`
                        }`}
                        style={{ left: `${startPx}px`, width: `${adjustedWidthPx - 2}px` }} // -2 for margin
                        onClick={() => handleProgramClick(instance, channel.id)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredProgram({
                            program: instance,
                            channel: channel,
                            x: rect.left + (rect.width / 2),
                            y: rect.top
                          });
                        }}
                        onMouseLeave={() => setHoveredProgram(null)}
                      >
                        {/* Live specific UI */}
                        {isLive && (
                          <>
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-signal-surface">
                              <div 
                                className="h-full bg-signal-amber transition-all duration-1000 ease-linear"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse-live shadow-[0_0_5px_rgba(224,64,64,0.8)]"></span>
                            </div>
                          </>
                        )}
                        
                        <div className="flex flex-col h-full justify-between">
                          <h4 className={`text-xs md:text-sm font-bold truncate ${isLive ? 'text-signal-amber' : ''}`}>
                            {instance.program.title}
                          </h4>
                          
                          {/* Only show metadata if box is wide enough */}
                          {adjustedWidthPx > 60 && (
                            <div className="flex items-center gap-2 mt-auto">
                              <span className={`text-[9px] font-mono uppercase truncate ${isLive ? 'text-signal-text-primary' : 'text-signal-text-tertiary group-hover:text-signal-text-secondary'}`}>
                                {instance.startTimeFormatted}
                              </span>
                              {adjustedWidthPx > 100 && (
                                <span className="text-[9px] font-mono text-signal-border bg-signal-black/30 px-1 rounded-sm hidden md:inline-block">
                                  {Math.round(instance.program.duration / 60)}m
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Rich Hover Tooltip (Portal-like behavior but kept simple using absolute) */}
      {hoveredProgram && (
        <div 
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-[110%] w-72 bg-signal-surface-raised border border-signal-border-active rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in"
          style={{ left: hoveredProgram.x, top: hoveredProgram.y }}
        >
          {/* Backdrop/Thumbnail */}
          <div className="h-32 bg-signal-black relative border-b border-signal-border">
            <img 
              src={hoveredProgram.program.program.backdrop || hoveredProgram.program.program.thumbnail || hoveredProgram.channel.standbyArtwork || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400"}
              alt=""
              className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-signal-surface-raised to-transparent"></div>
            
            {/* Badges overlay */}
            <div className="absolute top-2 left-2 flex gap-1.5">
              {(currentTimeMs >= hoveredProgram.program.startTime && currentTimeMs < hoveredProgram.program.endTime) ? (
                 <span className="px-1.5 py-0.5 bg-signal-red/20 border border-signal-red text-signal-red text-[8px] font-mono font-bold uppercase rounded-sm shadow-sm flex items-center gap-1">
                   <Radio className="w-2 h-2" /> LIVE
                 </span>
              ) : null}
              <span className="px-1.5 py-0.5 bg-signal-black/80 border border-signal-border text-signal-text-secondary text-[8px] font-mono font-bold uppercase rounded-sm">
                {hoveredProgram.program.program.category}
              </span>
            </div>
            
            {/* Channel Logo overlay */}
            {hoveredProgram.channel.logoUrl && (
              <img src={hoveredProgram.channel.logoUrl} className="absolute bottom-2 right-2 h-6 object-contain drop-shadow-md" alt="" />
            )}
          </div>

          <div className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-signal-text-primary leading-tight">
              {hoveredProgram.program.program.title}
            </h3>
            
            <div className="flex items-center gap-2 text-[10px] font-mono text-signal-text-tertiary">
              <span className="text-signal-amber font-bold">{hoveredProgram.program.startTimeFormatted} - {hoveredProgram.program.endTimeFormatted}</span>
              <span>•</span>
              <span>{Math.round(hoveredProgram.program.program.duration / 60)} MIN</span>
            </div>

            <p className="text-xs text-signal-text-secondary leading-relaxed line-clamp-3">
              {hoveredProgram.program.program.description || "No description available for this broadcast segment."}
            </p>

            <div className="pt-2 flex items-center gap-2">
               {(currentTimeMs >= hoveredProgram.program.startTime && currentTimeMs < hoveredProgram.program.endTime) ? (
                 <div className="text-[10px] font-bold text-signal-black bg-white px-2 py-1 rounded-sm uppercase flex items-center gap-1">
                   <Play className="w-3 h-3" /> Click to Watch
                 </div>
               ) : (
                 <div className="text-[10px] font-bold text-signal-text-primary bg-signal-border px-2 py-1 rounded-sm uppercase flex items-center gap-1">
                   <Info className="w-3 h-3" /> Click for Details
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
