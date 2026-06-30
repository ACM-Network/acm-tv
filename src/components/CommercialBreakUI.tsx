import React, { useEffect, useState } from 'react';

interface CommercialBreakUIProps {
  countdownDuration: number;
}

export default function CommercialBreakUI({ countdownDuration }: CommercialBreakUIProps) {
  const [timeLeft, setTimeLeft] = useState(countdownDuration);

  useEffect(() => {
    setTimeLeft(countdownDuration);
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownDuration]);

  if (timeLeft <= 0) return null;

  return (
    <div className="absolute top-8 left-8 z-50 animate-slide-in-right">
      <div className="relative overflow-hidden bg-signal-black/80 backdrop-blur-xl border border-signal-border/50 rounded-sm shadow-[0_0_30px_rgba(255,176,0,0.15)] flex items-center overflow-hidden group">
        
        {/* Subtle animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-signal-amber/20 via-transparent to-transparent opacity-50 animate-pulse-slow pointer-events-none" />

        <div className="px-4 py-3 border-r border-signal-border/50 bg-signal-surface/40">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-signal-text-secondary drop-shadow-md block mb-0.5">
            Back In
          </span>
          <span className="text-xl font-black font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            00:{timeLeft.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="px-4 py-3 flex items-center justify-center">
          <span className="text-xs font-bold text-signal-amber uppercase tracking-wider animate-pulse-slow">
            Commercial Break
          </span>
        </div>

        {/* Premium light sweep effect */}
        <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 animate-sweep" />
      </div>
    </div>
  );
}
