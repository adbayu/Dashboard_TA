# Virtual Pet artwork

Only user-supplied character images are displayed. No generated fish, facial overlays, accessories, speech-bubble art, or illustrated aquarium backgrounds are kept.

## Current user-supplied character

- `karakter-arcade/nila/body.png` is the original tilapia image supplied by the user. Keep it unchanged.
- Other species have no image until the user supplies one. The UI displays “Karakter belum ditambahkan” instead of substituting generated art.

## Adding a species image

Place each user-provided base PNG at `karakter-arcade/<species-key>/body.png`. The current V-Pet level renderer uses that image as a fallback until a level-specific image is supplied.

## Adding level-specific images

Place each user-provided PNG at `karakter-level/<species-key>/level-<first>-<last>__<title-slug>.png` for an inclusive range, or `level-<level>__<title-slug>.png` for one level. The renderer selects by the pet's species and current level; an exact-level image wins over a matching range. The displayed level and growth stage still come from the pet's saved level. Preserve each supplied image unchanged.

Other species or levels without supplied images keep the existing base image when available, otherwise the UI shows “Karakter belum ditambahkan”. Sensor and care conditions remain text outside the character image. Run `npm run cek:aset` to validate all user-supplied assets.
