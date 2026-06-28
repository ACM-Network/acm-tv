import { Channel, Program, ProgramInstance, BroadcastState } from '../types';
import channelsData from '../config/channels.json';
import scheduleData from '../config/schedule.json';
import { PRODUCTION_SINGLE_CHANNEL_MODE } from '../config/mode';
import { BrandingConfig, getActiveTheme } from '../config/branding';

interface ScheduleEntry {
  startTime: string; // "HH:MM" format
  programId: string;
}

// Strong type cast for the schedule JSON
const typedSchedule = scheduleData as Record<string, Record<string, ScheduleEntry[]>>;

export function getRuntimeChannels(): Channel[] {
  const allChannels = channelsData.channels as Channel[];
  if (!PRODUCTION_SINGLE_CHANNEL_MODE) {
    return allChannels;
  }

  // Filter to keep only ACM TV
  const masterChannel = allChannels.find(c => c.id === 'acm-tv');
  if (!masterChannel) return allChannels;

  // Search across all channels in the database to find the real program objects for the 4 assets
  const realProgramIds = [
    'x-men-6',
    'spiderman-brand-new-day-trailer-1',
    'spiderman-brand-new-day-trailer-2',
    'neno-butterfly'
  ];
  const filteredPrograms: Program[] = [];

  for (const id of realProgramIds) {
    let foundProg: Program | undefined;
    for (const ch of allChannels) {
      const p = ch.programs.find(prog => prog.id === id) ||
                (ch.idents && ch.idents.find(prog => prog.id === id)) ||
                (ch.promos && ch.promos.find(prog => prog.id === id));
      if (p) {
        foundProg = p;
        break;
      }
    }
    if (foundProg) {
      filteredPrograms.push(foundProg);
    }
  }

  return [{
    ...masterChannel,
    programs: filteredPrograms,
    idents: [],
    promos: []
  }];
}

export function getDynamicScheduleForChannel(channelId: string, channel: Channel): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  let items: { programId: string, durationMinutes: number }[] = [];

  if (channelId === 'acm-tv') {
    // ACM TV: Loop Trailer Block
    const blockProg = channel.programs.find(p => p.id === 'acm-tv-trailer-block');
    if (blockProg) {
      items = [
        { programId: blockProg.id, durationMinutes: Math.max(1, Math.ceil(blockProg.duration / 60)) }
      ];
    }
  } else if (channelId === 'acm-music') {
    // ACM Music: Loop all songs
    const songs = channel.programs.filter(p => p.type === 'song');
    if (songs.length > 0) {
      items = songs.map(s => ({
        programId: s.id,
        durationMinutes: Math.max(1, Math.ceil(s.duration / 60))
      }));
    }
  }

  if (items.length === 0) return []; // Fallback handled by stitcher

  let currentMin = 0;
  let idx = 0;

  // Generate 24 hours of schedule (1440 minutes)
  while (currentMin < 1440) {
    const item = items[idx % items.length];
    const hours = Math.floor(currentMin / 60);
    const minutes = currentMin % 60;
    const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    entries.push({ startTime, programId: item.programId });
    currentMin += item.durationMinutes;
    idx++;
  }

  return entries;
}

/**
 * Finds program metadata by ID inside the channels database
 */
export function findProgramById(programId: string, activeChannel: Channel): Program {
  // 1. Check in the current active channel's programs, idents, promos
  let found = activeChannel.programs.find(p => p.id === programId) ||
                (activeChannel.idents && activeChannel.idents.find(p => p.id === programId)) ||
                (activeChannel.promos && activeChannel.promos.find(p => p.id === programId));
  
  if (found) return found;

  // 2. Fallback: Search all other channels in the database
  const allChannels = getRuntimeChannels();
  for (const ch of allChannels) {
    found = ch.programs.find(p => p.id === programId) ||
            (ch.idents && ch.idents.find(p => p.id === programId)) ||
            (ch.promos && ch.promos.find(p => p.id === programId));
    if (found) return found;
  }

  // 3. Last resort fallback: return a default placeholder
  return {
    id: programId,
    title: `Scheduled Program (${programId})`,
    description: "Broadcast details are being loaded from the library.",
    duration: 300,
    videoUrl: "https://hv-cartoons.online:8443/62028/6224194d.mp4?hash=AgAD8p&stream=true",
    type: "content",
    category: "General Block",
    thumbnail: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400"
  };
}

/**
 * Parses time string like "21:30" into seconds since midnight
 */
export function timeStringToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 3600 + (minutes || 0) * 60;
}

/**
 * Formats a local timestamp into "HH:MM AM/PM" format
 */
export function formatLocalTime(timestampMs: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestampMs));
  } catch {
    const d = new Date(timestampMs);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}

/**
 * Formats seconds since midnight into 12h formatted time (e.g. "09:30 PM")
 */
export function formatSecondsToTime(seconds: number): string {
  const hours24 = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Calculates the exact state of the broadcast for a given channel at a specific local time.
 */

/**
 * Deterministic shuffle array based on seed string
 */
function shuffleArray<T>(array: T[], seedStr: string): T[] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < seedStr.length; i++) {
      k = seedStr.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 2716044179);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 951274213);
  h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
  let seed = h1 >>> 0;
  
  const rand = () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Stitch 3 days of schedule (yesterday, today, tomorrow) into absolute seconds relative to startOfTodayMs.
 */
function getStitchedEntries(channel: Channel, localTimestampMs: number) {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const date = new Date(localTimestampMs);
  
  const startOfToday = new Date(localTimestampMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const getEntriesForDay = (dayName: string) => {
    if (channel.id === 'acm-tv' || channel.id === 'acm-music') {
      return getDynamicScheduleForChannel(channel.id, channel);
    }
    const typedSchedule = scheduleData as any;
    const channelSchedule = typedSchedule[channel.id] || {};
    return channelSchedule[dayName] || [];
  };

  const stitched: { programId: string, subProgramId?: string, startMs: number, endMs: number, startTimeStr: string, isFallback?: boolean }[] = [];
  
  // We span dayOffset -1 (yesterday) to +7 (next week) to be absolutely safe for any lookaheads
  let currentAbsoluteMs = 0;
  
  for (let dayOffset = -1; dayOffset <= 2; dayOffset++) {
    const targetDate = new Date(startOfTodayMs);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const targetDayName = days[targetDate.getDay()];
    const entries = getEntriesForDay(targetDayName);
    
    // Sort just in case
    const sorted = [...entries].sort((a, b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime));
    
    sorted.forEach((entry, idx) => {
      const startSec = timeStringToSeconds(entry.startTime);
      const startMs = targetDate.getTime() + startSec * 1000;
      
      const prog = findProgramById(entry.programId, channel);
      
      if (prog.type === 'block' && prog.contentIds && prog.contentIds.length > 0) {
        // Flatten the block
        let currentSubStartMs = startMs;
        const seedStr = `${entry.programId}-${startMs}`;
        const contentIds = prog.blockShuffle ? shuffleArray(prog.contentIds, seedStr) : prog.contentIds;
        
        for (const subId of contentIds) {
          const subProg = findProgramById(subId, channel);
          const subDurationMs = (subProg.duration || 3600) * 1000;
          const subEndMs = currentSubStartMs + subDurationMs;
          stitched.push({
            programId: entry.programId,
            subProgramId: subId,
            startMs: currentSubStartMs,
            endMs: subEndMs,
            startTimeStr: entry.startTime
          });
          currentSubStartMs = subEndMs;
        }
      } else {
        const durationMs = (prog.duration || 3600) * 1000;
        const endMs = startMs + durationMs;
        
        stitched.push({
          programId: entry.programId,
          startMs,
          endMs,
          startTimeStr: entry.startTime
        });
      }
    });
  }
  
  // Sort the massive stitched array
  stitched.sort((a, b) => a.startMs - b.startMs);
  
  // Fix end times to eliminate ANY gaps or overlaps mathematically.
  // The schedule generation should be perfect, but this guarantees the player never glitches.
  for (let i = 0; i < stitched.length - 1; i++) {
    stitched[i].endMs = stitched[i + 1].startMs;
  }
  
  return stitched;
}

export function getBroadcastState(channel: Channel, localTimestampMs: number): BroadcastState {
  const startOfToday = new Date(localTimestampMs);
  startOfToday.setHours(0, 0, 0, 0);
  
  const stitched = getStitchedEntries(channel, localTimestampMs);
  
  if (stitched.length === 0) {
      if (channel.programs && channel.programs.length > 0) {
        const fallbackProg = channel.programs[0];
        const startOfTodayMs = startOfToday.getTime();
        const fallbackInst: ProgramInstance = {
          instanceId: `${fallbackProg.id}-${startOfTodayMs}`,
          program: fallbackProg,
          startTime: startOfTodayMs,
          endTime: startOfTodayMs + 86400 * 1000,
          startTimeFormatted: "12:00 AM",
          endTimeFormatted: "12:00 AM"
        };
        const currentTheme = getActiveTheme(BrandingConfig[channel.id], localTimestampMs);
        return {
          channelId: channel.id,
          currentProgram: fallbackInst,
          playbackPosition: Math.floor((localTimestampMs - startOfTodayMs)/1000) % (fallbackProg.duration || 86400),
          upNext: {
            ...fallbackInst,
            instanceId: `${fallbackProg.id}-${startOfTodayMs + 86400 * 1000}`,
            startTime: startOfTodayMs + 86400 * 1000,
            endTime: startOfTodayMs + 2 * 86400 * 1000
          },
          laterTonight: [],
          serverTime: localTimestampMs,
          currentTheme
        };
      }
      throw new Error(`No scheduled programs for channel ${channel.name}`);
  }

  // Find active program
  let activeIndex = -1;
  for (let i = 0; i < stitched.length; i++) {
    if (localTimestampMs >= stitched[i].startMs && localTimestampMs < stitched[i].endMs) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex === -1) {
    // If we somehow missed it, find the closest one
    activeIndex = stitched.findIndex(s => s.startMs > localTimestampMs) - 1;
    if (activeIndex < 0) activeIndex = 0;
  }

  const activeEntry = stitched[activeIndex];
  const program = findProgramById(activeEntry.programId, channel);

  // Playback position
  const elapsedSeconds = (localTimestampMs - activeEntry.startMs) / 1000;
  const playbackPosition = Math.max(0, elapsedSeconds);

  const currentProgram: ProgramInstance = {
    instanceId: `${activeEntry.programId}-${activeEntry.subProgramId || '0'}-${activeEntry.startMs}`,
    program,
    subProgram: activeEntry.subProgramId ? findProgramById(activeEntry.subProgramId, channel) : undefined,
    startTime: activeEntry.startMs,
    endTime: activeEntry.endMs,
    startTimeFormatted: formatSecondsToTime(Math.floor((activeEntry.startMs - startOfToday.getTime())/1000)),
    endTimeFormatted: formatSecondsToTime(Math.floor((activeEntry.endMs - startOfToday.getTime())/1000))
  };

  // UP NEXT
  const upNextEntry = stitched[activeIndex + 1] || stitched[activeIndex];
  const upNextProg = findProgramById(upNextEntry.programId, channel);
  const upNext: ProgramInstance = {
    instanceId: `${upNextEntry.programId}-${upNextEntry.subProgramId || '0'}-${upNextEntry.startMs}`,
    program: upNextProg,
    subProgram: upNextEntry.subProgramId ? findProgramById(upNextEntry.subProgramId, channel) : undefined,
    startTime: upNextEntry.startMs,
    endTime: upNextEntry.endMs,
    startTimeFormatted: formatSecondsToTime(Math.floor((upNextEntry.startMs - startOfToday.getTime())/1000)),
    endTimeFormatted: formatSecondsToTime(Math.floor((upNextEntry.endMs - startOfToday.getTime())/1000))
  };

  // LATER TONIGHT
  const laterTonight: ProgramInstance[] = [];
  for (let i = activeIndex + 2; i < activeIndex + 10 && i < stitched.length; i++) {
    const lEntry = stitched[i];
    const lProg = findProgramById(lEntry.programId, channel);
    laterTonight.push({
      instanceId: `${lEntry.programId}-${lEntry.subProgramId || '0'}-${lEntry.startMs}`,
      program: lProg,
      subProgram: lEntry.subProgramId ? findProgramById(lEntry.subProgramId, channel) : undefined,
      startTime: lEntry.startMs,
      endTime: lEntry.endMs,
      startTimeFormatted: formatSecondsToTime(Math.floor((lEntry.startMs - startOfToday.getTime())/1000)),
      endTimeFormatted: formatSecondsToTime(Math.floor((lEntry.endMs - startOfToday.getTime())/1000))
    });
  }

  const currentTheme = getActiveTheme(BrandingConfig[channel.id], localTimestampMs);

  return {
    channelId: channel.id,
    currentProgram,
    playbackPosition,
    upNext,
    laterTonight,
    serverTime: localTimestampMs,
    currentTheme
  };
}

export function getDailyTimeline(channel: Channel, dayTimestampMs: number): ProgramInstance[] {
  const startOfDay = new Date(dayTimestampMs);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();
  const endOfDayMs = startOfDayMs + 86400 * 1000;
  
  const stitched = getStitchedEntries(channel, dayTimestampMs);
  
  const timeline: ProgramInstance[] = [];
  
  for (const entry of stitched) {
    // Only include entries that overlap with this day
    if (entry.endMs > startOfDayMs && entry.startMs < endOfDayMs) {
      const prog = findProgramById(entry.programId, channel);
      timeline.push({
        instanceId: `${entry.programId}-${entry.subProgramId || '0'}-${entry.startMs}`,
        program: prog,
        subProgram: entry.subProgramId ? findProgramById(entry.subProgramId, channel) : undefined,
        startTime: entry.startMs,
        endTime: entry.endMs,
        startTimeFormatted: formatSecondsToTime(Math.floor((entry.startMs - startOfDayMs)/1000)),
        endTimeFormatted: formatSecondsToTime(Math.floor((entry.endMs - startOfDayMs)/1000))
      });
    }
  }
  
  return timeline;
}
