## Web interfaces

Two React apps live alongside this directory. Both build into `webroot/`, which
is what gets packed into LittleFS and flashed to the ESP32. Only one can be
the active UI at a time — whichever was built most recently wins.

| Folder | Purpose |
|---|---|
| [`web-interface/`](web-interface/) | Legacy / current production UI. Already migrated from MUI to Tailwind+shadcn. |
| [`ui/`](ui/) | In-progress redesign. See its own README for the build conventions. |

### To flash the device

1. Build the UI you want live: `cd web-interface && pnpm build` (or `cd ui && pnpm build`). Either writes to `../webroot/`.
2. From the project root, on the build PC: `pio run -t uploadfs -e webserver` (PlatformIO's *Upload Filesystem Image* task).
3. Then `pio run -t upload -e webserver` for the C++ firmware itself if it changed.

### To connect to WiFi

1. Connect to the `Gaggiuino` AP.
2. Open `http://192.168.4.1` in your browser.
3. Go to Settings and select your network / enter password.

### Local development

`pnpm dev` from either UI folder runs Vite at `localhost:3000`, proxying
`/api` and `/ws` to the real ESP IP hardcoded in `vite.config.ts`. Update
that IP when the ESP moves networks.
