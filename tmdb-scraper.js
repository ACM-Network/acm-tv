const fs = require('fs');

const movies = [
  { id: 'the-family-star', title: 'The Family Star', year: 2024 },
  { id: 'adipurush', title: 'Adipurush', year: 2023 },
  { id: 'train-to-busan', title: 'Train to Busan', year: 2016 },
  { id: 'drushyam-2', title: 'Drushyam 2', year: 2021 },
  { id: 'narappa', title: 'Narappa', year: 2021 },
  { id: 'ek-mini-katha', title: 'Ek Mini Katha', year: 2021 },
  { id: 'middle-class-melodies', title: 'Middle Class Melodies', year: 2020 },
  { id: 'operation-valentine', title: 'Operation Valentine', year: 2024 }
];

async function fetchTMDB(movie) {
  try {
    const searchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(movie.title)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const searchHtml = await searchRes.text();
    
    // Find first movie link: <a class="result" href="/movie/12345-movie-name"
    // Or <a class="title" href="/movie/12345
    const linkMatch = searchHtml.match(/href="(\/movie\/\d+[^"]*)"/);
    if (!linkMatch) {
      console.log(`Could not find TMDB page for ${movie.title}`);
      return null;
    }
    
    const movieUrl = `https://www.themoviedb.org${linkMatch[1]}`;
    console.log(`Fetching ${movieUrl}`);
    const movieRes = await fetch(movieUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    const html = await movieRes.text();
    
    // Extract overview
    let overview = '';
    const overviewMatch = html.match(/<div class="overview" dir="auto">\s*<p>(.*?)<\/p>/s);
    if (overviewMatch) overview = overviewMatch[1].trim();
    
    // Extract poster
    let poster = '';
    const posterMatch = html.match(/image\.tmdb\.org\/t\/p\/w[a-zA-Z0-9_]+\/([^"]+\.jpg)/);
    if (posterMatch) poster = `https://image.tmdb.org/t/p/w1280/${posterMatch[1]}`;
    
    // Extract backdrop
    let backdrop = '';
    const backdropMatch = html.match(/image\.tmdb\.org\/t\/p\/(?:original|w1920_and_h800_multi_faces)\/([^"]+\.jpg)/);
    if (backdropMatch) backdrop = `https://image.tmdb.org/t/p/w1280/${backdropMatch[1]}`;
    if (!backdrop && poster) backdrop = poster; // fallback
    
    // Extract genres
    let genres = [];
    const genreMatches = [...html.matchAll(/\/genre\/\d+-[\w-]+">([^<]+)<\/a>/g)];
    genres = genreMatches.map(m => m[1]);
    if (genres.length === 0) genres = ['Drama'];

    return {
      title: movie.title,
      year: movie.year,
      description: overview,
      category: genres[0] || 'Drama',
      thumbnail: poster,
      backdrop: backdrop
    };
  } catch (e) {
    console.error(`Error with ${movie.title}: ${e.message}`);
    return null;
  }
}

async function run() {
  const results = {};
  for (const m of movies) {
    const data = await fetchTMDB(m);
    if (data) {
      results[m.id] = data;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  fs.writeFileSync('tmdb-metadata.json', JSON.stringify(results, null, 2));
  console.log('Saved tmdb-metadata.json');
}

run();
