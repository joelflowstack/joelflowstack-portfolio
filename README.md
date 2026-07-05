# Joel Flowstack — Website

A multi-page, 3D-interactive static site. No build step — plain HTML/CSS/JS, so it deploys straight from GitHub to Vercel with zero configuration.

## Pages
- `index.html` — Home
- `about.html` — About
- `services.html` — Services
- `work.html` — Work / Portfolio
- `contact.html` — Contact (Formspree form)

## The signature object
`js/cube.js` renders one Three.js scene: a glass "shell" cube (`MeshPhysicalMaterial`, transmission/iridescence) wrapped around an inner "core" cube textured with the looping video at `assets/cube-video.mp4`. Every page loads the exact same module with the exact same `CONFIG` values — same colors, same lights, same materials — so it reads as one continuous object site-wide. Mouse movement and scroll only ever change **rotation/position** (parallax tilt, idle spin, a slight scroll-linked drift); no interaction ever changes color or material.

Note on "persistence": because this is a true multi-page site (as requested) rather than a single-page app, each page load restarts the video and the animation loop fresh — there's no way around that without a full SPA rebuild. Visually it's identical on every page, which is what gives the continuity.

## Deploying (GitHub + Vercel, no CLI)
1. Create a new GitHub repository (e.g. `joelflowstack-portfolio`) and upload every file in this folder to the repo root, keeping the folder structure (`assets/`, `css/`, `js/`, `partials/`) intact. You can do this entirely in the GitHub web UI: **Add file → Upload files**, drag the whole folder in, commit.
2. Go to [vercel.com](https://vercel.com), **Add New → Project**, and import that GitHub repo.
3. Framework preset: choose **Other** (static site) — no build command, no output directory needed. Leave "Build Command" and "Output Directory" blank/default.
4. Click **Deploy**. Vercel serves the files as-is.
5. Any future change: edit files in GitHub (web editor or a new upload), commit to `main` — Vercel redeploys automatically.

## Before going live
- **Contact form**: in `contact.html`, replace `YOUR_FORM_ID` in the form's `action` with your real [Formspree](https://formspree.io) endpoint.
- **Social links**: update the X/Instagram/YouTube URLs in `partials/nav.html` and `partials/footer.html` if they change.
- **Fonts/CDNs**: the site loads Google Fonts and the Three.js module from `cdn.jsdelivr.net` — both are public CDNs with no key required, nothing to configure.
- **Video file size**: `assets/cube-video.mp4` is ~360KB, fine for web delivery as-is.

## Customizing the cube
All tunable values live at the top of `js/cube.js` in the `CONFIG` object — video source, colors, spin speed, parallax strength. Change a number there and it updates on every page at once, since every page imports the same file.
