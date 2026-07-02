/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

const channelsData = JSON.parse(fs.readFileSync('./src/config/channels.json', 'utf8'));
const scheduleData = JSON.parse(fs.readFileSync('./src/config/schedule.json', 'utf8'));

const moviesChannel = channelsData.channels.find(c => c.id === 'acm-movies');
const movies = moviesChannel.programs;

// Tag movies by type/demand
const tags = {
  lighter: ['paagal', 'sita-ramam', 'ek-mini-katha', 'radhe-shyam', 'middle-class-melodies'],
  morning: ['jathi-ratnalu', 'middle-class-melodies', 'sarkaru-vaari-paata', 'ek-mini-katha', 'whistle'],
  afternoon: ['varasudu', 'acharya', 'the-family-star', 'vakeel-saab', 'maharshi', 'narappa'],
  prime: ['adipurush', 'jailer', 'yashoda', 'varasudu', 'sita-ramam', 'operation-valentine'],
  primeWeekend: ['adipurush', 'jailer', 'train-to-busan', 'yashoda', 'maharshi', 'operation-valentine', 'varasudu'],
  late: ['drushyam-2', 'hit-first-case', 'train-to-busan', 'yashoda', 'narappa']
};

const allMovieIds = movies.map(m => m.id);

// Fallback logic
for (const key of Object.keys(tags)) {
  tags[key] = tags[key].filter(id => allMovieIds.includes(id));
}

function getMovieForSlot(slot, isWeekend, previousMovies) {
  let list = tags[slot] || allMovieIds;
  if (isWeekend && slot === 'prime') {
    list = tags.primeWeekend;
  }
  
  // Filter out recently played (last 5 movies) to avoid immediate repeats
  let available = list.filter(id => !previousMovies.slice(-5).includes(id));
  
  if (available.length === 0) {
    available = list; // fallback
  }

  // Pick random from available
  const chosen = available[Math.floor(Math.random() * available.length)];
  return movies.find(m => m.id === chosen) || movies[0];
}

function getSlot(dateStr) {
  const date = new Date(dateStr);
  const hour = date.getUTCHours();
  
  if (hour >= 2 && hour < 6) return 'lighter';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'prime';
  return 'late'; // 23 to 2
}

function formatTime(date) {
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const newSchedule = { ...scheduleData };
newSchedule['acm-movies'] = {
  sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
};

// Start at a Sunday 00:00:00 UTC (using a fixed date for calculation)
// Jan 4, 1970 was a Sunday.
let currentTime = new Date('1970-01-04T00:00:00Z').getTime();
const endTime = currentTime + 7 * 24 * 60 * 60 * 1000;

let previousMovies = [];

while (currentTime < endTime) {
  const currentDate = new Date(currentTime);
  const dayIndex = currentDate.getUTCDay();
  const dayName = daysOfWeek[dayIndex];
  const isWeekend = dayIndex === 0 || dayIndex === 6;
  
  const slot = getSlot(currentDate.toISOString());
  const movie = getMovieForSlot(slot, isWeekend, previousMovies);
  
  newSchedule['acm-movies'][dayName].push({
    startTime: formatTime(currentDate),
    programId: movie.id
  });
  
  previousMovies.push(movie.id);
  // Advance time by movie duration
  currentTime += movie.duration * 1000;
}


fs.writeFileSync('./src/config/schedule.json', JSON.stringify(newSchedule, null, 2));
console.log('Schedule generated successfully.');
