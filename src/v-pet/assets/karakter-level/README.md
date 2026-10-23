# Character art by level

Only the supported species keys `nila`, `gurame`, and `kangkung` are allowed in this V-Pet feature. All three species have supplied GIFs for levels 1–4, with conditions `normal`, `senang`, `sedih`, `kepanasan`, and `kedinginan`. Species or levels without matching artwork use the plain placeholder.

Use `karakter-level/<species-key>/level-<first>-<last>__<title-slug>.png` for a PNG level range or `level-<level>__<title-slug>.png` for one level. Condition GIFs use `level-<level>__<expression>.gif`. Keep user-provided image bytes unchanged. Run `npm run cek:aset` to validate the allowed species and artwork.
