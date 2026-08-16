# Badge sound

Drop a file here named **`badge`** with one of these extensions:

- `badge.mp3`  ← best compatibility, use this if unsure
- `badge.ogg`
- `badge.wav`

It plays automatically when a player earns a badge. No code change needed —
the game tries each format in turn and uses the first one the browser can
decode.

If none of these files exist, the game falls back to a built-in synthesised
chime, so badges are never silent.

## Tips
- Keep it **short** — about 1 to 2 seconds. Badges can fire back to back.
- Keep it **small** — under ~100 KB. It ships to every player.
- Playback volume is set to 0.65 in `Game._playBadgeSound()`; adjust there
  if your file is too loud or too quiet.
