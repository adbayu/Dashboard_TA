# Character art by level

This directory is reserved for original PNG/GIF images supplied by the user. Keep each file unchanged.

Use `karakter-level/<species-key>/level-<first>-<last>__<title-slug>.png` for a PNG level range or `level-<level>__<title-slug>.png` for an exact level. For condition-specific animation, use `level-<level>__<expression>.gif`, with `expression` set to `senang`, `sedih`, `kepanasan`, or `kedinginan`. The renderer selects by species, level, and expression; absent matching art uses a generic sheet/base image or placeholder. Verified animated GIFs are hidden in reduced-motion mode; static GIFs remain visible.

The user's Nila level 1 GIFs are `nila/level-1__senang.gif` and `nila/level-1__sedih.gif`. Both currently contain static duplicate frames. Other Nila levels and expressions remain intentionally absent until supplied.
