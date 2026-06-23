/**
 * Utility to parse video URLs.
 * Simplified for local self-contained media hosting architecture.
 */

// Branded standby fallback video path (remote URL fallback to prevent local media dependence)
export const STANDBY_FALLBACK_VIDEO_URL = "https://hv-cartoons.online:8443/62028/6224194d.mp4?hash=AgAD8p&stream=true";

/**
 * Returns the video URL directly.
 * Google Drive parsing has been removed.
 */
export function getDirectVideoUrl(url: string): string {
  return url || STANDBY_FALLBACK_VIDEO_URL;
}
