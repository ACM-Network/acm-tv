import React from 'react';
import { Program } from '../types';

interface BroadcastArtworkModeProps {
  program: Program;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const BroadcastArtworkMode: React.FC<BroadcastArtworkModeProps> = ({
  program,
  isPlaying,
  currentTime,
  duration
}) => {
  const artwork = program.artwork || program.thumbnail || '/branding/acm-tv-logo.svg';
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const timeRemaining = Math.max(0, duration - currentTime);

  // Generate some deterministic particles
  const particles = React.useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${10 + Math.random() * 20}s`,
      animationDelay: `-${Math.random() * 20}s`,
      size: `${2 + Math.random() * 4}px`,
      opacity: 0.1 + Math.random() * 0.4
    }));
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex flex-col justify-center pointer-events-none select-none z-20">
      <style>{`
        @keyframes ba-waveform {
          0% { height: 20%; opacity: 0.4; }
          50% { height: 100%; opacity: 1; }
          100% { height: 20%; opacity: 0.4; }
        }
        @keyframes ba-cinematic-zoom {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.15); }
        }
        @keyframes ba-ambient-drift {
          0% { transform: translate(0, 0) scale(1.1); }
          33% { transform: translate(2%, 2%) scale(1.15); }
          66% { transform: translate(-2%, 1%) scale(1.12); }
          100% { transform: translate(0, 0) scale(1.1); }
        }
        @keyframes ba-particle-up {
          0% { transform: translateY(10vh) scale(1); opacity: 0; }
          20% { opacity: var(--target-opacity); }
          80% { opacity: var(--target-opacity); }
          100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* 1. Blurred Background Layer */}
      <div 
        className="absolute inset-0 w-full h-full bg-center bg-cover blur-3xl opacity-60"
        style={{
          backgroundImage: `url(${artwork})`,
          animation: 'ba-ambient-drift 40s ease-in-out infinite alternate',
          transformOrigin: 'center center'
        }}
      />

      {/* 2. Dark Overlay & Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      {/* 3. Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute bottom-0 rounded-full bg-white blur-[1px]"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              '--target-opacity': p.opacity,
              animation: `ba-particle-up ${p.animationDuration} linear infinite`,
              animationDelay: p.animationDelay
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* 4. Main Content Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center h-full px-8 md:px-24 gap-8 md:gap-16">
        
        {/* Artwork Display */}
        <div className="relative w-48 h-48 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0">
          <div 
            className="absolute inset-0 w-full h-full bg-center bg-cover transition-transform duration-[20000ms]"
            style={{
              backgroundImage: `url(${artwork})`,
              animation: 'ba-cinematic-zoom 30s ease-out infinite alternate'
            }}
          />
          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]" />
        </div>

        {/* Typography & Waveform */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-2xl">
          {program.artist && (
            <h3 className="text-white/70 text-lg md:text-xl lg:text-2xl font-medium tracking-widest uppercase mb-2">
              {program.artist}
            </h3>
          )}
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight drop-shadow-lg mb-4 line-clamp-2">
            {program.title}
          </h1>
          {(program.album || program.year) && (
            <p className="text-white/50 text-base md:text-lg mb-8">
              {[program.album, program.year].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Simulated Premium Waveform */}
          <div className="flex items-end gap-[3px] h-12 md:h-16 mb-8 opacity-80">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 md:w-2 bg-gradient-to-t from-white/30 to-white rounded-t-full transition-all duration-300"
                style={{
                  height: isPlaying ? '20%' : '4px',
                  animation: isPlaying 
                    ? `ba-waveform ${0.6 + (Math.random() * 0.8)}s ease-in-out infinite alternate`
                    : 'none',
                  animationDelay: isPlaying ? `-${Math.random() * 2}s` : '0s'
                }}
              />
            ))}
          </div>

          {/* Progress Tracking (Optional, could just rely on player's timeline but doing it here is nice for broadcast layout) */}
          <div className="w-full flex items-center gap-4 text-white/50 text-sm font-mono tracking-wider">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-white/80 rounded-full transition-all duration-500 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>-{formatTime(timeRemaining)}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
