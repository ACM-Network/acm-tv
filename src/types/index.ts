export type ProgramType = 'content' | 'promo' | 'ident' | 'trailer' | 'song' | 'block';

export interface MetadataAudioTrack {
  language: string;
  code: string;
  codec?: string;
  default?: boolean;
  url: string;
}

export interface MetadataSubtitle {
  language: string;
  code: string;
  format?: string;
  default?: boolean;
  url: string;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  videoUrl: string;
  type: ProgramType;
  category: string; // e.g. "RCU Promos", "Teaser", "Song", "Branding"
  thumbnail?: string;
  audioTracks?: MetadataAudioTrack[];
  subtitles?: MetadataSubtitle[];
  metadataUrl?: string;
  hls?: string | null;
  year?: number;
  language?: string;
  backdrop?: string;
  contentIds?: string[]; // Used for blocks to reference inner program IDs
  blockShuffle?: boolean; // Whether the block should shuffle its contents
}

export interface WeavingConfig {
  insertIdentEveryNPrograms?: number;
  insertPromoEveryNPrograms?: number;
}

export interface Channel {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string; // Path to main channel logo (e.g. /branding/acm-tv-logo.png)
  bugUrl?: string;  // Path to channel bug/watermark (e.g. /branding/acm-tv-bug.png)
  programs: Program[];
  idents: Program[];
  promos: Program[];
  weaving: WeavingConfig;
  themeColor?: string;
  category?: string;
  description?: string;
  channelNumber?: string | number;
  standbyArtwork?: string;
}

export interface ProgramInstance {
  instanceId: string;
  program: Program;
  subProgram?: Program;
  startTime: number; // UTC Epoch timestamp in milliseconds
  endTime: number;   // UTC Epoch timestamp in milliseconds
  startTimeFormatted: string; // Formatting for UI (e.g., "18:30 UTC")
  endTimeFormatted: string;
}

export interface BroadcastState {
  channelId: string;
  currentProgram: ProgramInstance;
  playbackPosition: number; // Current seek time in seconds
  upNext: ProgramInstance | null;
  laterTonight: ProgramInstance[];
  serverTime: number; // UTC timestamp when state was calculated
}
