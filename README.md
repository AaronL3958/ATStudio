# ATStudio

**Sound in motion. Music at your fingertips.**

ATStudio is a browser-based workspace for creating music visualizers and learning songs. Turn a track into a finished video, or explore its chords and build a playable piano arrangement.

## Studio

- Six spectrum styles with smooth, bass-only response and live preview.
- Custom background and center artwork with crop, blur, color, and typography controls.
- Independent circle motion, reactive particles, and intro/outro animations.
- Reusable presets, private projects, and an account-owned song library.
- MP4 export at 720p, 1080p, and 1440p, with 24, 30, or 60 fps output.

## Learn

- MusicX chord recognition with editable chord boundaries, key, and tempo estimates.
- Guitar chord diagrams and strumming guides with capo support.
- Simplified piano arrangements: a right-hand melody and left-hand chord voicings.
- Synchronized score playback, practice loops, speed and volume controls.
- MIDI, MusicXML, and printable sheet music export.

Automatic analysis provides an editable starting point. Dense recordings can obscure harmony and melody; review the result before practicing. Piano arrangement is not guaranteed note-for-note transcription.

## Accounts and appearance

Username/password accounts keep projects, songs, presets, and appearance preferences together. Beige, paper, and night themes apply throughout the website, with a custom accent and reduced-motion option. Keep the recovery key provided at registration; password recovery does not use email.

Press **Space** to play or pause in Studio and Learn. The shortcut stays inactive while editing text, using form controls, or working in a dialog. Preview volume does not alter exported audio.

## Local development

Requirements: **Node.js 24 recommended** (minimum 22.13), npm, and a modern desktop browser.

```sh
git clone https://github.com/AaronL3958/ATStudio.git
cd ATStudio
npm ci
npm run build
npm run db:migrate:local
npm run dev
```

Open the local URL printed by the server, normally `http://127.0.0.1:5173`. The repository is private, so cloning requires a GitHub account with access. Local accounts and uploaded files live in the ignored `.wrangler/` directory and are separate from production data.

`db:migrate:local` initializes a new local database and records applied migrations. Run it again after pulling new migrations. If upgrading an older development database that was initialized by manually executing SQL files, back it up first and migrate to a fresh local database; its migration journal was not recorded.

### Working on another computer

Clone the repository on the second computer and open that folder in your editor. Follow the setup above, then run `git pull` before starting new work. Commit and push finished changes to share them between computers. Source control carries the application code; it does not carry local databases or editor chat history.

### Checks

```sh
npx tsc --noEmit
node scripts/test-arrangement.mjs
node scripts/test-learning.mjs
node scripts/verify-audio.mjs
```

With the development server running and the local database initialized:

```sh
node scripts/verify-api.mjs
node scripts/test-accounts.mjs
node scripts/test-preferences.mjs
node scripts/test-motion-presets.mjs
```

Use a disposable local database for API tests. They create synthetic accounts and data. Rate-limit tests may require a cooldown before repeating.

## Architecture

| Area | Implementation |
| --- | --- |
| Interface | React, TypeScript, Vinext, Vite |
| Visualizer | Canvas 2D and Web Audio; deterministic analysis for preview and export |
| Video export | Mediabunny and WebCodecs; H.264 video and stereo AAC |
| Music analysis | Browser workers, MusicX ONNX models, and Basic Pitch |
| Application server | Cloudflare Workers |
| Persistence | D1 for account/project metadata; private R2 objects for uploaded files |

The main editor is in `app/studio.tsx`; learning playback and analysis controls are in `app/learn.tsx`. The canvas renderer is in `app/visualizer.ts`, and video export is in `app/export-video.ts`. API routes enforce account ownership. Database schema changes belong in `db/`; generated SQL migrations live in `drizzle/` and must remain immutable after deployment.

Models and their third-party licenses are included in `public/models/`. Analysis assets load only when needed, keeping normal Studio editing independent of transcription work.

## Deployment

The live site runs on Sites hosting. `.openai/hosting.json` is a required deployment manifest containing the existing site identifier and logical database/storage bindings. It contains no credentials and must remain tracked. The framework's hosting integration and legacy account compatibility are retained to keep the live site and existing projects working.

Publishing uses the hosting workflow to build, synchronize source, package, and deploy the same revision. Pushing to GitHub alone does **not** publish the website. Never commit credentials, local databases, generated build output, or personal audio files. The FL Studio plugin is maintained separately and is not part of this repository.

## Practical limits

- Tracks: up to 100 MB and 10 minutes. Artwork and fonts: up to 15 MB per file.
- Rendering runs on the visitor's device. Keep the tab open until export finishes.
- MP4 output requires working H.264/AAC WebCodecs encoders. Desktop Chrome or Edge is recommended.
- Long 1440p renders can require substantial memory. There is no server render queue or resumable export.
- Uploaded audio is required; streaming-service links are not supported.
