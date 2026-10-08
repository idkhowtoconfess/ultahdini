# AGENTS.md

Static single-page birthday site. No build step; Netlify publishes `public/` (see `netlify.toml`).

## Structure
- `public/index.html` — seven "scenes" (`<section class="scene">`), only the one with `.is-active` is shown.
  Order: sorry → cake → journey (timeline + days counter) → scratch → letter → wishes jar → end.
- `public/style.css` — all styles; design tokens in `:root` (plum/rose/gold palette, Fraunces + Caveat + Nunito).
- `public/app.js` — one IIFE, sections in scene order: particle canvas, Web Audio music box, scene navigation
  (`show(id)` + optional `enter[id]` hook), then per-scene interactions.
- `public/img/` — the user's photos. `selfie.jpg` and `photobox.jpg` were rotated upright (selfie also brightened).

## Conventions / decisions
- Copy is Indonesian, casual, addressed to Dini from Eiffel. Letter text lives in `LETTER` and wishes in `WISHES` in `app.js`.
- Images are always referenced through `/.netlify/images?url=/img/<file>&w=<w>&fm=webp`.
- Music only starts after the first user click (browser autoplay rules); it's synthesized, no audio files.
- Navigation buttons use `data-next="<scene-id>"`; gated "next" buttons start `hidden` and are revealed when the scene's interaction is done.
- Friendship day counter assumes TK started ~July 2010 (`since` in `app.js`).
