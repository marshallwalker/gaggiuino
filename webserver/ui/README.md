# ui — redesigned web interface

In-progress redesign of the web UI. Coexists with `../web-interface/` so the
current production UI keeps working while this one is being built. Drop your
Vite/React (or whatever) project files into this directory.

## Build → flash pipeline

The ESP32 webserver firmware serves whatever static bundle is sitting in
`../webroot/` (packed into LittleFS at flash time). Both `ui/` and
`web-interface/` build into the **same** `../webroot/` directory, so only one
of them is live at a time — whichever was built last.

```
ui/  ──► (pnpm build, vite outDir = ../webroot)  ──►  webserver/webroot/  ──► LittleFS upload  ──► ESP32
```

To deploy this UI to the device:

```bash
# 1. From this folder, build the static bundle into webserver/webroot/
pnpm install        # first time only
pnpm build

# 2. From the project root, on the build PC with PlatformIO + esptool:
pio run -t uploadfs -e webserver
```

To go back to the legacy UI, do step 1 from `../web-interface/` instead.

## Vite config requirements

For the build to land in the right place, your `vite.config.ts` must set:

```ts
build: {
  outDir: '../webroot',
  emptyOutDir: true,
},
```

The dev server (`pnpm dev`) should also proxy `/api` and `/ws` to the live
ESP — copy the proxy block from `../web-interface/vite.config.ts` (the
target IP changes when the ESP moves networks).

## Why a separate folder

- Keeps the legacy UI buildable as a fallback during the redesign.
- Lets the new app pick its own dependency tree (different shadcn version,
  different icon set, no migration cruft) without fighting the existing
  `web-interface/package.json`.
- One-line switch back: `cd ../web-interface && pnpm build`.
