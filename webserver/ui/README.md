# ui — redesigned web interface

In-progress redesign of the web UI. Coexists with `../web-interface/` so the
current production UI keeps working while this one is being built.

Stack: **Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui + recharts**.

## Build → flash pipeline

The ESP32 webserver firmware serves whatever static bundle is sitting in
`../webroot/` (packed into LittleFS at flash time). Both `ui/` and
`web-interface/` build into that same directory, so only one of them is
live at a time — whichever was built last.

```
ui/  ──► (pnpm build → next export, distDir = ../webroot)  ──►  webserver/webroot/  ──► LittleFS upload  ──► ESP32
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

## next.config requirements (already wired up)

For the build to land in the right place, `next.config.mjs` sets:

- `output: 'export'` — pure static HTML/CSS/JS, no Node runtime
- `distDir: '../webroot'` — output overwrites `webserver/webroot/`
- `trailingSlash: true` — routes export as `route/index.html`
- `images.unoptimized: true` — LittleFS can't do dynamic image processing

## Local dev server

```bash
pnpm dev
```

Runs Next dev at `localhost:3000`. The config has a `rewrites()` block that
proxies `/api/*` HTTP requests to a hardcoded ESP IP — update that IP in
`next.config.mjs` when the ESP moves networks (legacy `web-interface/` does
the same thing in `vite.config.ts`).

### WebSocket dev gotcha

Next.js dev **does not proxy WebSockets** the way Vite does — there's no
`ws: true` equivalent for `rewrites()`. Workarounds:

1. **Point WS at the ESP directly during dev.** In the WS client code,
   detect `process.env.NODE_ENV === 'development'` and connect to
   `ws://192.168.2.6/ws` directly instead of `ws://${window.location.host}/ws`.
2. **Run a tiny Node WS proxy** alongside `next dev` if the direct
   connection is awkward (CORS, etc.).

In production (served from the ESP) `window.location.host` already points
at the device, so the same code path Just Works.

## Why a separate folder

- Keeps the legacy UI buildable as a fallback during the redesign.
- Lets the new app pick its own dependency tree (Next 16, React 19, Tailwind 4)
  without fighting the existing `web-interface/package.json`.
- One-line switch back: `cd ../web-interface && pnpm build`.
