# CLOUDBRAWL — design sheet (character & art continuity)

One sheet governs every drawn thing in the game, so the ship and the five pirate
classes read as one fleet in one sky. All art is canvas vector drawing in
`game/src/render.js`; this sheet is the contract that drawing follows.

## The sky (palette)

| Role | Colour | Notes |
|---|---|---|
| Sky top | `#124a8c` | saturated daylight blue |
| Sky upper | `#22609f` | |
| Sky middle | `#3a76b8` | the band most play happens in |
| Sky lower | `#6399d2` | |
| Horizon | `#eacf87` | warm cream, never white-hot |
| Sun | `#ffeeb0` core, `#ffd94d` rays | top-right, soft rays |
| Cloud body | `#dfeaf6` / shades `#b9d6f2`, `#d7e9fa`, `#e8f3fd` by layer | flat shapes, one shade step |
| Forge rock | `#8a6f55` / shade `#6e5741` | warm brown-grey |
| Forge fire | `#ff9d2e` / core `#ffd23e` | the landmark's glow |

Brightness discipline: the palette was deepened until the staged cover
measures in the target band (mean luminance 90–150, near-black ≤5%, edge
density ≥5 — measured with PIL on the shipped JPEG); hulls and shadows stay
mid-tone, and the only true dark is the navy outline `#1d2f4d` at 2–3 px.
Daylight is kept by saturation and the warm horizon, not by washing the
frame toward white.

## The Dawnbreaker (player airship) — the anchor

- Silhouette: one big cream-and-crimson balloon (length ~200 px, ≥15% of the
  1280 frame width), brass gondola hull beneath, twin fins at the stern, a
  propeller that spins, two cannon muzzles on the gondola's aim side.
- Colours: balloon cream `#f7ead2` with crimson `#d8402e` stripes, hull brass
  `#b07a3f`, accents gold `#f2b33d`. Friendly = warm and round.
- It always points its gondola cannon toward the aim; the balloon never rotates.

## The pirate fleet — one language, five silhouettes

Shared language: patched canvas balloons in desaturated violet/grey, dark wood
hulls, black flag with a white skull diamond. Hostile = angular and patched.

| Class | Silhouette | Balloon | Hull | Tell |
|---|---|---|---|---|
| Skiff | tiny dart, one small balloon | slate `#7d8aa0` | `#5b4632` | fast weave, no cannon flash until close |
| Bomber | fat balloon, hanging bomb bay | rust `#a05a3a` | `#4a3826` | slow, drops arcing bombs |
| Rammer | no balloon — rotor kite with a ram prow | — | iron `#6b7280`, prow `#c33` | telegraphs, then charges in a straight line |
| Sniper kite | tall thin kite sail, long barrel | pale `#b9c4cf` | `#54606e` | keeps 420 px, fires long tracer shots |
| Carrier | wide twin balloons, hangar belly | murk green `#5f7355` | `#3f4a3a` | launches a skiff every few seconds |
| Dreadnought | three balloons, armoured hull ~430 px, four turrets | war red `#8e2f28` panels | iron `#565d66` | boss bar, telegraphed broadsides and a bow beam |

## Typography & HUD

- Display font: system serif slab fallback stack in-canvas (`Georgia, 'Times New Roman', serif`)
  for the CLOUDBRAWL logotype; HUD in a clean sans (`Verdana, Geneva, sans-serif`).
- HUD furniture: parchment panels `#fdf6e0` at 92% alpha, navy text `#1d2f4d`,
  gold for money, crimson for danger. The objective line always reads:
  "Sink the Dreadnought to WIN — hull at zero is DEFEAT".
