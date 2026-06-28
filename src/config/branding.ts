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
      primaryColor: "#0f172a", // Dark Charcoal
      accentColor: "#f97316", // Orange
      logoAnimUrl: "/branding/acm-tv-logo-anim.mp4",
      fallbackImage: "/branding/acm-tv-fallback.jpg"
    }
  },
  "acm-movies": {
    id: "acm-movies",
    defaultTheme: {
      primaryColor: "#1a1311", // Dark Brown / Black
      accentColor: "#fbbf24", // Gold
    }
  },
  "acm-music": {
    id: "acm-music",
    defaultTheme: {
      primaryColor: "#4c1d95", // Purple
      accentColor: "#ec4899", // Pink
    }
  },
  "acm-rcu": {
    id: "acm-rcu",
    defaultTheme: {
      primaryColor: "#000000", // Black
      accentColor: "#dc2626", // Deep Red
    }
  }
};
