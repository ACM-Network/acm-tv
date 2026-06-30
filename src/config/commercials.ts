export const CommercialConfig = {
  /** Channels that support dynamic commercial insertion during playback */
  enabledChannels: ['acm-movies'],
  
  /** How often a commercial break should trigger (e.g. every 15 minutes) */
  breakIntervalMs: 15 * 60 * 1000, 
  
  /** Maximum number of commercial assets (trailers) to play sequentially per break */
  maxCommercialsPerBreak: 2,
  
  /** Total maximum duration of a single break (e.g. 60 seconds) */
  maxBreakDurationMs: 60 * 1000,

  /** The types of assets to pull from the channel's schedule payload to act as commercials */
  commercialAssetPool: ['trailer', 'promo'],

  /** Crossfade duration when switching into and out of commercial breaks */
  transitionDurationMs: 1500,

  /** Only trigger commercials if the current program is longer than this duration (e.g. 30 mins) */
  minProgramDurationMs: 30 * 60 * 1000,

  /** How long the "Back in X..." countdown graphic should display during a commercial */
  countdownDurationSeconds: 30,

  /** If false, uses standard fade. If true, uses specialized premium broadcast graphics */
  usePremiumAnimations: true,

  /** Placeholder for future sponsor ad server integration */
  futureSponsorSupport: false,
};
