# Character art by level

This directory is reserved for original PNGs supplied by the user. Keep each image unchanged.

Use `karakter-level/<species-key>/level-<first>-<last>__<title-slug>.png` for an inclusive level range, or `level-<level>__<title-slug>.png` for one exact level.

Examples:

- `nila/level-1-2__benih.png`
- `nila/level-3__nila-muda.png`

The V-Pet renderer selects an image by the pet species and current level. An exact-level image takes priority over a broader matching range. Until a level image is supplied, the existing species image remains the fallback; species without any supplied art keep the plain placeholder.
