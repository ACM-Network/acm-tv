# ACM TV - Local Media Setup Guide

ACM TV is configured to run entirely on self-contained local media hosting. Follow these steps to set up and deploy your television network channels with your own video assets.

---

## 📁 Step 1: Copy Videos Into Local Directories

Place your video files (MP4 format is recommended) into the corresponding subdirectories inside the project's `public/media/` folder:

* **ACM TV Flagship Channel**:
  `public/media/acm-tv/`
* **ACM Movies Channel**:
  `public/media/acm-movies/`
* **ACM Music Channel**:
  `public/media/acm-music/`
* **ACM Trailers Channel**:
  `public/media/acm-trailers/`
* **ACM RCU Channel**:
  `public/media/acm-rcu/`

*Note: Ensure filenames are lowercase and alphanumeric for URL compatibility (e.g. `neno-butterfly.mp4`, `sintel-trailer.mp4`).*

---

## ⚙️ Step 2: Add Entries to `channels.json`

Open [channels.json](file:///C:/Users/Venkataramana/Downloads/ACM%20TV/src/config/channels.json) under `src/config/channels.json` and configure your program blocks.

Map the `videoUrl` directly to the public path of the copied video files:

```json
{
  "id": "neno-butterfly",
  "title": "Neno Butterfly Lyric Video",
  "description": "The official lyric video presentation. An elegant musical visualizer experience.",
  "duration": 245,
  "videoUrl": "/media/acm-music/neno-butterfly.mp4",
  "type": "song",
  "category": "SONG",
  "thumbnail": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400"
}
```

### Key Parameters:
1. `duration`: Exact duration of the video in **seconds**. This is critical for the synchronization engine.
2. `type`: Program category tags (`content` | `promo` | `ident` | `trailer` | `song`).
3. `videoUrl`: The local relative path from the public folder (e.g., `/media/acm-movies/my-movie.mp4`).

---

## 🛠️ Step 3: Run the Development Server

Start your local broadcast console:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
* The player will automatically run client-side validation.
* If a referenced media file is missing, the player will overlay a clean **"Media File Not Found"** notification and display the specific path that needs to be created.
* Once the file is copied, click **Re-sync with Storage** to instantly play.

---

## 🚀 Step 4: Deploy to Vercel

To deploy your self-contained broadcast network to production:

1. Push your project files (including the media files in `public/media/`) to your GitHub/GitLab repository.
2. Link the repository to your Vercel Dashboard.
3. Vercel will build the project and host the media files directly via Vercel's global CDN edge.
4. Your virtual network is now live and synchronized worldwide!
