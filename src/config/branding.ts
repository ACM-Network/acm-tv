import { BrandingTheme } from '../types';

export interface DaypartBranding {
  id: string;
  name: string;
  startHour: number; // 0-23
  theme: BrandingTheme;
}

export interface EventBranding {
  id: string;
  name: string;
  activeFrom: number; // timestamp
  activeTo: number;   // timestamp
  theme: BrandingTheme;
}

export interface ChannelBranding {
  id: string;
  defaultTheme: BrandingTheme;
  dayparts?: DaypartBranding[];
  events?: EventBranding[];
}

// Helper to determine active theme for a channel at a given time
export function getActiveTheme(channelBranding: ChannelBranding | undefined, timestampMs: number): BrandingTheme {
  if (!channelBranding) {
    return {
      primaryColor: '#8a2be2',
      accentColor: '#ffd700'
    }; // Default fallback
  }

  // 1. Check Events First (Highest Priority)
  if (channelBranding.events && channelBranding.events.length > 0) {
    const activeEvent = channelBranding.events.find(e => timestampMs >= e.activeFrom && timestampMs <= e.activeTo);
    if (activeEvent) {
      return activeEvent.theme;
    }
  }

  // 2. Check Dayparts
  if (channelBranding.dayparts && channelBranding.dayparts.length > 0) {
    const date = new Date(timestampMs);
    const hour = date.getHours();
    
    // Sort dayparts by startHour descending to find the correct active one
    const sortedDayparts = [...channelBranding.dayparts].sort((a, b) => b.startHour - a.startHour);
    const activeDaypart = sortedDayparts.find(d => hour >= d.startHour) || sortedDayparts[0]; // Wrap around if before earliest
    
    if (activeDaypart) {
      return activeDaypart.theme;
    }
  }

  return channelBranding.defaultTheme;
}

export const BrandingConfig: Record<string, ChannelBranding> = {
  "acm-tv": {
    id: "acm-tv",
    defaultTheme: {
      primaryColor: "#000000",
      accentColor: "#f59e0b", // Amber
      logoAnimUrl: "/branding/acm-tv-logo-anim.mp4",
      fallbackImage: "/branding/acm-tv-fallback.jpg"
    },
    dayparts: [
      {
        id: "morning",
        name: "Morning",
        startHour: 6, // 6 AM
        theme: {
          primaryColor: "#0f172a", // Slate 900
          accentColor: "#38bdf8", // Light Blue
        }
      },
      {
        id: "afternoon",
        name: "Afternoon",
        startHour: 12, // 12 PM
        theme: {
          primaryColor: "#171717", // Neutral 900
          accentColor: "#f97316", // Orange
        }
      },
      {
        id: "evening",
        name: "Prime Time",
        startHour: 18, // 6 PM
        theme: {
          primaryColor: "#000000", // Black
          accentColor: "#f59e0b", // Amber (Premium)
        }
      },
      {
        id: "late-night",
        name: "Late Night",
        startHour: 23, // 11 PM
        theme: {
          primaryColor: "#020617", // Slate 950
          accentColor: "#818cf8", // Indigo
        }
      }
    ]
  },
  "acm-movies": {
    id: "acm-movies",
    defaultTheme: {
      primaryColor: "#000000",
      accentColor: "#e11d48", // Rose Red
    },
    dayparts: [
      {
        id: "prime-time-movies",
        name: "Prime Time Premiere",
        startHour: 20, // 8 PM
        theme: {
          primaryColor: "#050505",
          accentColor: "#fbbf24", // Gold
        }
      }
    ]
  },
  "acm-music": {
    id: "acm-music",
    defaultTheme: {
      primaryColor: "#09090b", // Zinc 950
      accentColor: "#2dd4bf", // Teal
    }
  }
};
