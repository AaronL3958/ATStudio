# ATStudio

A hosted music visualizer studio built with React, Vinext, Cloudflare Workers, D1, R2, Canvas 2D, Web Audio, and Mediabunny/WebCodecs.

## Features

- ChatGPT sign-in with server-enforced project and upload ownership.
- Persistent projects, original audio, background/center artwork, custom fonts, and visualizer settings.
- Fluid radial spectrum, radial bars, and mirrored linear spectrum.
- Independent bass/mid/treble response, overall gain, smoothing, glow, thickness, size, rotation, placement, pulse, and particles.
- Background blur/darkness and title/subtitle/font/color/position controls.
- Seekable preview and deterministic frame-by-frame MP4 export at 720p, 1080p, or 2560×1440, at 24/30/60 fps.
- H.264 plus stereo AAC, supported-bitrate negotiation, test clips, cancellation, progress, and downloadable output.
- A generated original 24-second demo beat; no third-party song or artwork is bundled.

## Run locally

Use Node 22.13+ (Node 24 recommended) and npm:

```sh
npm ci
npm run db:generate # only after changing the schema
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tough_tyrannus.sql
npm run dev
```

Apply each migration only once per local database. The development URL is printed by the server. Loopback development has a simulated sign-in user; production uses the Sites dispatcher. Never introduce a production fallback user.

## Verification

```sh
npx tsc --noEmit
node scripts/verify-audio.mjs
node scripts/verify-api.mjs
```

The audio test requires Node 24 for native TypeScript stripping. The API test requires the local development server and migrated database; it creates and removes its own test data. It checks anonymous requests, cross-origin writes, validation, project CRUD, upload bytes, private assets, conflict detection, and invalid asset associations.

Browser checks completed: playback, audio/image/custom-font import, save/reload/reopen with all assets, valid and invalid WebMCP inputs, desktop/mobile layout, and MP4 rendering. Downloaded 1080p/30 and 1440p/60 files were independently demuxed and verified to contain the expected H.264 frames and 48 kHz stereo AAC. A 720p/24 render also completed.

## Architecture

`app/studio.tsx` owns the editor and project UI. `app/visualizer.ts` performs 2048-point Hann-window FFT analysis into 96 logarithmic bands at 60 analysis frames/second. Temporal smoothing is computed from those frames, making preview, seeking, and export deterministic. `app/export-video.ts` draws the same canvas renderer with exact frame timestamps and interleaves original audio into MP4 output.

D1 stores project settings, version numbers, and asset metadata. R2 stores private file bytes. Every data endpoint checks the platform identity. Settings use prepared statements, uploads stream with an enforced length, and save uses optimistic concurrency. Production migrations are immutable once deployed.

## Current limits

- Audio: 100 MB and 10 minutes per track. Images/fonts: 15 MB per file.
- Export runs on the visitor's device; the tab must remain open. Desktop Chrome/Edge with working H.264 and AAC WebCodecs encoders is recommended. Unsupported configurations show an explicit error. There is no server render queue or resumable render.
- The completed MP4 is buffered in browser memory and downloaded locally. Long 1440p exports need substantial memory and are not yet stress-tested on all devices.
- Export preview is 1280×720 for responsiveness; output is redrawn at the selected resolution.
- The site is private to its owner at initial deployment. Authentication is Sign in with ChatGPT, not a separate password database.
- A custom hostname requires control of that hostname's DNS. ATStudio.beats.com cannot be attached without control of beats.com.

## Deployment

The existing Sites project identity and logical DB/BUCKET bindings are in `.openai/hosting.json`. Use the Sites workflow to push source, build, archive, and deploy the same commit. No runtime API keys are required. Local test data, files, previews, logs, and runtime shims remain in ignored directories and are not published.
