import { Channel, Program, ProgramInstance, BroadcastState, ProgramType } from '../types';
import channelsData from '../config/channels.json';
import scheduleData from '../config/schedule.json';
import { PRODUCTION_SINGLE_CHANNEL_MODE } from '../config/mode';

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
  const realProgramIds = ['x-men-6', 'spiderman-brand-new-day-trailer-1', 'spiderman-brand-new-day-trailer-2', 'neno-butterfly'];
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

export function getProductionScheduleForDay(): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  const cycleMinutes = 155;
  const numCycles = 9; // 9 * 155 = 1395 minutes (23h 15m)

  const items = [
    { offset: 0, programId: 'neno-butterfly' },
    { offset: 5, programId: 'spiderman-brand-new-day-trailer-1' },
    { offset: 8, programId: 'spiderman-brand-new-day-trailer-2' },
    { offset: 11, programId: 'neno-butterfly' },
    { offset: 16, programId: 'x-men-6' }
  ];

  for (let c = 0; c < numCycles; c++) {
    const cycleStartMin = c * cycleMinutes;
    for (const item of items) {
      const totalMin = cycleStartMin + item.offset;
      const hours = Math.floor(totalMin / 60);
      const minutes = totalMin % 60;
      const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      entries.push({ startTime, programId: item.programId });
    }
  }

  // Add the last partial cycle to fill up to midnight (starts at 23:15, i.e. 1395 mins)
  const lastCycleStartMin = numCycles * cycleMinutes;
  for (const item of items) {
    const totalMin = lastCycleStartMin + item.offset;
    if (totalMin >= 1440) break;
    const hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;
    const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    entries.push({ startTime, programId: item.programId });
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
    videoUrl: "/media/acm-tv/standby.mp4",
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
  } catch (error) {
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
export function getBroadcastState(channel: Channel, localTimestampMs: number): BroadcastState {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const date = new Date(localTimestampMs);
  const dayOfWeek = days[date.getDay()];
  
  // Find start of today in milliseconds
  const startOfToday = new Date(localTimestampMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  // Current local time in seconds since midnight
  const currentSeconds = Math.floor((localTimestampMs - startOfTodayMs) / 1000);

  // Helper to get daily schedule entries
  const getEntriesForDay = (dayName: string): ScheduleEntry[] => {
    if (PRODUCTION_SINGLE_CHANNEL_MODE && channel.id === 'acm-tv') {
      return getProductionScheduleForDay();
    }
    const channelSchedule = typedSchedule[channel.id] || {};
    return channelSchedule[dayName] || [];
  };

  const dailyEntries = getEntriesForDay(dayOfWeek);

  if (dailyEntries.length === 0) {
    throw new Error(`No scheduled programs for channel ${channel.name} on ${dayOfWeek}`);
  }

  // Sort entries chronologically by start time
  const sortedEntries = [...dailyEntries].sort((a, b) => 
    timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)
  );

  // Find active program
  let activeIndex = -1;
  for (let i = 0; i < sortedEntries.length; i++) {
    const entryStart = timeStringToSeconds(sortedEntries[i].startTime);
    const entryEnd = i < sortedEntries.length - 1 
      ? timeStringToSeconds(sortedEntries[i + 1].startTime) 
      : 86400; // Last entry runs until midnight (86400s)
    
    if (currentSeconds >= entryStart && currentSeconds < entryEnd) {
      activeIndex = i;
      break;
    }
  }

  // Fallback if current time is before the first entry (should not happen if first entry is 00:00)
  if (activeIndex === -1) {
    activeIndex = 0;
  }

  const activeEntry = sortedEntries[activeIndex];
  const program = findProgramById(activeEntry.programId, channel);

  // Calculate concrete slot start/end timestamps
  const slotStartMs = startOfTodayMs + timeStringToSeconds(activeEntry.startTime) * 1000;
  const slotEndSec = activeIndex < sortedEntries.length - 1 
    ? timeStringToSeconds(sortedEntries[activeIndex + 1].startTime)
    : 86400;
  const slotEndMs = startOfTodayMs + slotEndSec * 1000;

  // Calculate playback position (loop within the assigned slot to fill gaps)
  const elapsedSeconds = (localTimestampMs - slotStartMs) / 1000;
  const playbackPosition = Math.max(0, elapsedSeconds) % (program.duration || 1);

  const currentProgram: ProgramInstance = {
    instanceId: `${activeEntry.programId}-${slotStartMs}`,
    program,
    startTime: slotStartMs,
    endTime: slotEndMs,
    startTimeFormatted: formatSecondsToTime(timeStringToSeconds(activeEntry.startTime)),
    endTimeFormatted: formatSecondsToTime(slotEndSec)
  };

  // Calculate UP NEXT
  let upNextEntry: ScheduleEntry;
  let upNextStartMs: number;
  let upNextEndMs: number;
  let upNextStartSec: number;
  let upNextEndSec: number;

  if (activeIndex < sortedEntries.length - 1) {
    // Next entry is on the same day
    upNextEntry = sortedEntries[activeIndex + 1];
    upNextStartSec = timeStringToSeconds(upNextEntry.startTime);
    upNextEndSec = activeIndex + 2 < sortedEntries.length
      ? timeStringToSeconds(sortedEntries[activeIndex + 2].startTime)
      : 86400;

    upNextStartMs = startOfTodayMs + upNextStartSec * 1000;
    upNextEndMs = startOfTodayMs + upNextEndSec * 1000;
  } else {
    // Next entry is the first program of tomorrow
    const tomorrowIndex = (date.getDay() + 1) % 7;
    const tomorrowDay = days[tomorrowIndex];
    const tomorrowEntries = getEntriesForDay(tomorrowDay);
    const tomorrowSorted = [...tomorrowEntries].sort((a, b) => 
      timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)
    );

    upNextEntry = tomorrowSorted[0] || { startTime: "00:00", programId: activeEntry.programId };
    upNextStartSec = timeStringToSeconds(upNextEntry.startTime);
    upNextEndSec = tomorrowSorted.length > 1
      ? timeStringToSeconds(tomorrowSorted[1].startTime)
      : 86400;

    const tomorrow = new Date(startOfTodayMs);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrowMs = tomorrow.getTime();
    upNextStartMs = startOfTomorrowMs + upNextStartSec * 1000;
    upNextEndMs = startOfTomorrowMs + upNextEndSec * 1000;
  }

  const upNextProgramDef = findProgramById(upNextEntry.programId, channel);
  const upNext: ProgramInstance = {
    instanceId: `${upNextEntry.programId}-${upNextStartMs}`,
    program: upNextProgramDef,
    startTime: upNextStartMs,
    endTime: upNextEndMs,
    startTimeFormatted: formatSecondsToTime(upNextStartSec),
    endTimeFormatted: formatSecondsToTime(upNextEndSec)
  };

  // Calculate LATER TONIGHT (up to 8 slots)
  const laterTonight: ProgramInstance[] = [];
  let currentIdx = activeIndex + 2;
  let runningDayOffsetDays = 0;

  for (let i = 0; i < 8; i++) {
    let entry: ScheduleEntry;
    let startSec: number;
    let endSec: number;
    let startMs: number;
    let endMs: number;

    const currentDayIndex = (date.getDay() + runningDayOffsetDays) % 7;
    const currentDay = days[currentDayIndex];
    const entries = getEntriesForDay(currentDay);
    const sorted = [...entries].sort((a, b) => 
      timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)
    );

    if (currentIdx < sorted.length) {
      entry = sorted[currentIdx];
      startSec = timeStringToSeconds(entry.startTime);
      endSec = currentIdx + 1 < sorted.length
        ? timeStringToSeconds(sorted[currentIdx + 1].startTime)
        : 86400;

      const targetDay = new Date(startOfTodayMs);
      targetDay.setDate(targetDay.getDate() + runningDayOffsetDays);
      const targetDayMs = targetDay.getTime();
      startMs = targetDayMs + startSec * 1000;
      endMs = targetDayMs + endSec * 1000;
      
      currentIdx++;
    } else {
      // Roll over to next day
      runningDayOffsetDays++;
      currentIdx = 0;
      
      const nextDayIndex = (date.getDay() + runningDayOffsetDays) % 7;
      const nextDay = days[nextDayIndex];
      const nextEntries = getEntriesForDay(nextDay);
      const nextSorted = [...nextEntries].sort((a, b) => 
        timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)
      );

      if (nextSorted.length === 0) break; // Safeguard

      entry = nextSorted[currentIdx];
      startSec = timeStringToSeconds(entry.startTime);
      endSec = nextSorted.length > 1
        ? timeStringToSeconds(nextSorted[1].startTime)
        : 86400;

      const targetDay = new Date(startOfTodayMs);
      targetDay.setDate(targetDay.getDate() + runningDayOffsetDays);
      const targetDayMs = targetDay.getTime();
      startMs = targetDayMs + startSec * 1000;
      endMs = targetDayMs + endSec * 1000;

      currentIdx = 1;
    }

    const progDef = findProgramById(entry.programId, channel);
    laterTonight.push({
      instanceId: `${entry.programId}-${startMs}`,
      program: progDef,
      startTime: startMs,
      endTime: endMs,
      startTimeFormatted: formatSecondsToTime(startSec),
      endTimeFormatted: formatSecondsToTime(endSec)
    });
  }

  return {
    currentProgram,
    playbackPosition,
    upNext,
    laterTonight,
    serverTime: localTimestampMs
  };
}

/**
 * Generates the EPG daily schedule timeline (00:00 to 24:00) for the Schedule Guide Page.
 */
export function getDailyTimeline(channel: Channel, dayTimestampMs: number): ProgramInstance[] {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDate = new Date(dayTimestampMs);
  const dayOfWeek = days[targetDate.getDay()];

  // Start of target day in milliseconds
  const startOfDay = new Date(dayTimestampMs);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  let dailyEntries: ScheduleEntry[] = [];
  if (PRODUCTION_SINGLE_CHANNEL_MODE && channel.id === 'acm-tv') {
    dailyEntries = getProductionScheduleForDay();
  } else {
    const channelSchedule = typedSchedule[channel.id] || {};
    dailyEntries = channelSchedule[dayOfWeek] || [];
  }

  if (dailyEntries.length === 0) return [];

  // Sort chronologically
  const sorted = [...dailyEntries].sort((a, b) => 
    timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)
  );

  return sorted.map((entry, idx) => {
    const startSec = timeStringToSeconds(entry.startTime);
    const endSec = idx < sorted.length - 1
      ? timeStringToSeconds(sorted[idx + 1].startTime)
      : 86400;

    const startMs = startOfDayMs + startSec * 1000;
    const endMs = startOfDayMs + endSec * 1000;

    const program = findProgramById(entry.programId, channel);

    return {
      instanceId: `${entry.programId}-${startMs}`,
      program,
      startTime: startMs,
      endTime: endMs,
      startTimeFormatted: formatSecondsToTime(startSec),
      endTimeFormatted: formatSecondsToTime(endSec)
    };
  });
}
