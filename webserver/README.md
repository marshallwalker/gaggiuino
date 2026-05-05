## Webserver (ESP32)

The ESP32 sits between the STM32 firmware and the user. It runs a small
HTTP + WebSocket server, hosts a React app from LittleFS, and forwards
commands and telemetry to/from the STM over UART.

```
webserver/
├── src/        ← ESP32 C++ webserver code (REST + WS + STM comms)
├── ui/         ← React app (Next.js 16 + Tailwind 4 + shadcn). See ui/README.md.
├── webroot/    ← Static build artifacts that get packed into LittleFS
└── tools/      ← mklittlefs binaries + replace_fs.py
```

### To flash the device

1. From `ui/`, build the UI: `pnpm install && pnpm build`. The static
   export lands in `../webroot/`.
2. From the project root, on the build PC: `pio run -t uploadfs -e webserver`
   (PlatformIO's *Upload Filesystem Image* task). Packs `webroot/` into
   the LittleFS image and flashes it.
3. If the C++ firmware in `src/` changed: `pio run -t upload -e webserver`.

### To connect to WiFi

1. Connect to the `Gaggiuino` AP.
2. Open `http://192.168.4.1` in your browser.
3. Go to Settings and select your network / enter the password.

### Local development

`pnpm dev` from `ui/` starts the dev server at `localhost:3000`. HTTP
requests to `/api` are proxied to a hardcoded ESP IP set in
`ui/next.config.mjs` — update it when the ESP moves networks. WebSocket
proxying needs a separate path; see `ui/README.md` for the workaround.
