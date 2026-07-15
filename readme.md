# Joel Flowstack — Website

A multi-page, 3D-interactive static site. No build step — plain HTML/CSS/JS, deploys straight from GitHub to Vercel with zero configuration.

## Structure

Everything lives at the repo root (no subfolders for pages — flat structure, simplest to manage from the GitHub web UI):

- `index.html` — the cube portal / landing page
- `home.html`, `about.html`, `services.html`, `portfolio.html`, `blog.html`, `contact.html`
- `css/global.css` — shared design system (pure black/greyscale)
- `js/cube.js` — the Rubik's cube engine (shared by every page)
- `js/shared.js` — nav injection + scroll reveal for inner pages
- `js/flowbot.js` — floating Flow V3 chat widget
- `vercel.json`

## The signature object

`js/cube.js` renders a 26-piece Rubik's cube (hollow center) in glossy black/charcoal checkerboard — no video texture, no color, generated entirely with canvas textures.

On `index.html` it runs in **portal mode**: scroll drives one continuous stateless animation (tumble → zoom → lock face-forward), then the 8 outer front tiles become clickable navigation, and clicking one scatters the cube before navigating.

On every other page it runs in **decorative mode**: same engine and materials, gentle idle tumble + mouse parallax, no click behavior.

## Deploying (GitHub + Vercel, no CLI)

1. Edit or replace files directly in the GitHub web UI (**Add file → Upload files**, or the pencil icon on an existing file), commit to `main`.
2. Vercel is already connected to this repo and redeploys automatically on every push — nothing else to do.

## Before going live — outstanding TODOs

- **Contact form**: in `contact.html`, replace `YOUR_FORM_ID` in the form's `action` with your real [Formspree](https://formspree.io) endpoint.
- **Portfolio captions**: `portfolio.html`'s "Recent builds" gallery uses `assets/work-1.jpg`, `work-2.jpg`, `work-3.jpg` with placeholder captions — swap in the real project names/descriptions.
- **`assets/cube-video.mp4`** is still unused — the cube no longer needs a video texture (it's canvas-generated), safe to delete unless you repurpose it elsewhere.

## Flowbot ↔ Flow V3 connection

`js/flowbot.js` calls `https://flow-v3-mu.vercel.app/api/chat` directly. Two real bugs were found and fixed against the actual `Joel44118/flow-V3` source:

1. **Request shape** — the backend expects `{ messages: [{ role, content }, ...] }` (full OpenAI-style chat history, optionally with a leading `system` message), not `{ message: "..." }`. The widget now sends and maintains that full conversation array client-side (in memory, resets on reload).
2. **CORS** — `api/chat.js` already sends `Access-Control-Allow-Origin: *`, so no domain whitelisting was ever needed. The old "needs whitelisting" fallback message was based on a wrong assumption and has been removed.

The widget also sends its own lightweight system prompt (since anonymous site visitors aren't Joel — the full app's "Boss" persona doesn't apply here) and gracefully explains when Flow's model tries to use a tool that only exists in the full Flow app (camera, image generation, social posting).

## Assets now wired in

- `assets/logo.png` — nav bar, footer, and favicon on every page
- `assets/joel-portrait.png` — About page
- `assets/flow-v3-demo.mp4` + `flow-v3-poster.jpg` — embedded video in the Portfolio page's Flow V3 case study
- `assets/work-1/2/3.jpg` — Portfolio page gallery (captions are placeholders, see TODO above)

## Customizing the cube

Tunable values live in the `CONFIG` object near the top of `js/cube.js` — piece size, checker colors, boot/scatter animation durations. Nav tile labels/links live in the `NAV_ITEMS` array just below it.
