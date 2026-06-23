/**
 * Utility to parse video URLs.
 * Simplified for local self-contained media hosting architecture.
 */

// Branded standby fallback video path inside the local public folder
export const STANDBY_FALLBACK_VIDEO_URL = "/media/acm-tv/standby.mp4";

/**
 * Returns the video URL directly for local media hosting.
 * Google Drive parsing has been removed.
 */
export function getDirectVideoUrl(url: string): string {
  return url || STANDBY_FALLBACK_VIDEO_URL;
}
