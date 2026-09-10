# CLEOPOODLA — $CLEOP landing page

Static site. No build step, no dependencies, no external audio files.
Open `index.html` or serve the folder (`python3 -m http.server`) and deploy the
folder as-is to Netlify / Vercel / Cloudflare Pages / GitHub Pages.

```
index.html          markup + copy
css/style.css       styling
js/audio.js         Web Audio engine — music & SFX are synthesized live
js/main.js          interactions (gate, parallax, pump mode, particles)
assets/             cleopoodla.jpg (portrait), og.jpg (social card), favicon.png
```

## Type
- **Bodoni Moda** 700/900 — display (wordmark, section headings, stats, pyramid numbers,
  the carved "DO NOT SELL"). Extreme stroke contrast, so the gold gradient reads as
  engraved metal rather than a gradient sitting on top of a letter.
- **Inter Tight** — body copy and buttons, slightly negative tracking.
- **JetBrains Mono** 500 uppercase, wide tracking — every small label (eyebrow, CA box,
  stat captions, ticker, gallery captions, footer). This is the layer that makes a
  crypto site read as considered rather than thrown together.

Loaded from Google Fonts; falls back to Didot/Georgia + system sans if offline.

## Sound
The soundtrack is **generated in the browser** — a looping 104 BPM desert-house
groove in D Phrygian dominant (the "Egyptian" scale) with a synthesized darbuka,
oud-style pluck, bass and pad. SFX (bark, coin, gong, stone thud, riser, fanfare)
are synthesized too. Nothing is downloaded, so it works offline and can't 404.

Browsers block autoplay, which is why the site opens with the **ENTER THE TOMB**
gate — that click is what starts the audio. Both music and SFX can be toggled
from the buttons in the bottom-right corner.

## Easter eggs
- Pet the dog **10 times** → PUMP MODE (laser eyes, screen quake, coin rain, fanfare)
- Type **`cleo`** anywhere → same
- The SWAP NOW button also triggers it (until you point it at a real swap URL)

## Before launch — things to replace
| What | Where |
|---|---|
| Contract address | `index.html` → `<code id="caText">` |
| Swap link | `index.html` → `#bigBuy` and `.btn-gold` in the hero |
| Chart link | `index.html` → the `VIEW CHART` anchor (`href="#chart"`) |
| Socials | `index.html` → `.foot-links` anchors |
| Supply / tax / LP numbers | hero `data-count` attributes + the `.pyramid` tiers |
| Domain in OG tags | `<meta property="og:image">` → absolute URL once hosted |

The disclaimer in the footer is deliberate — keep it.
