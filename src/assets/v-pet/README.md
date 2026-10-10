# Virtual Pet artwork

Only user-supplied character images are displayed. No generated fish, facial overlays, accessories, speech-bubble art, or illustrated aquarium backgrounds are kept.

## Current character assets

Nila level 1 currently has user-supplied GIF assets for `senang` and `sedih` at `karakter-level/nila/level-1__senang.gif` and `karakter-level/nila/level-1__sedih.gif`. Nila's former PNG sheets and base image were removed at the user's request. Both current GIFs contain identical visual frames, so they display as still images. Other Nila levels and expressions remain placeholders until matching art is supplied.

## Adding a species image

Place each user-provided base PNG at `karakter-arcade/<species-key>/body.png`. The current V-Pet level renderer uses that image as a fallback until a level-specific image is supplied.

## Adding level-specific images

Place a user-provided PNG at `karakter-level/<species-key>/level-<first>-<last>__<title-slug>.png` for an inclusive range, or `level-<level>__<title-slug>.png` for one level. For an expression-specific animated GIF, use `karakter-level/<species-key>/level-<level>__<expression>.gif`, where expression is `senang`, `sedih`, `kepanasan`, or `kedinginan`. The renderer prefers a GIF matching species, level, and expression; it otherwise uses a compatible generic PNG sheet, base image, or plain placeholder. Verified animated GIFs are not rendered when reduced motion is preferred; static GIF images remain visible. Keep every supplied image byte-for-byte unchanged.

Other species, levels, or expressions without supplied images keep an existing base image when available; otherwise the UI shows “Karakter belum ditambahkan”. Sensor and care details stay as text outside the art. Expression-specific GIFs appear only for matching conditions; verified animated GIFs are hidden when reduced motion is preferred while static GIFs remain visible. Run `npm run cek:aset` to validate all user-supplied assets.
