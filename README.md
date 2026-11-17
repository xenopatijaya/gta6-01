[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/xenopatijaya/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/xenopatijaya/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar Bay — Make GTA 6 (make.fun · gta6-01)

A complete open-world crime game in the spirit of GTA 6, built for
[make.fun](https://make.fun/bounty/gta6-01) bounty **gta6-01 — "Make GTA 6"**
($1,666, top 100 paid). It runs offline in a desktop browser from static
files — no network request, no build step.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

**WASD** move / drive · **Mouse** look · **Shift** run · **Space** jump / brake ·
**E** steal / exit car · **Click** shoot · **F** punch · **R** reload · **P / Esc** pause.

## The game

Solmar Bay is an original sun-soaked coastal city: a procedural grid of
towers, plazas, lamps and palms beside the bay. Lena Voss needs a driver who
asks no questions — five story jobs take you from a plaza pickup to a bank
heist and a boat escape, while traffic cruises the roads, pedestrians
scatter, and the Solmar Bay police chase you down a 0–5 star wanted level.

- **Open world on foot and by car** — steal any parked car, arcade driving
- **Traffic** (12 AI cars) and **pedestrians** (20) who flee from crime
- **Wanted system + police** — pursuit cars that ram, BUSTED / WASTED, heat decay
- **5 story missions** with waypoints, dialogue, timers and cash rewards
- **Combat** — fists and a hitscan pistol with ammo and reload
- **HUD** — health, cash, wanted stars, clock, speed, objective banner and a live minimap
- **Start screen + save** — New Game / Continue, localStorage progress
- **Synthesised sound** — engine, sirens, gunshots and a bass loop (WebAudio, no files)

## Layout

- `game/index.html` — page, HUD and start/pause/end screens
- `game/src/main.js` — boot, game loop and screen flow
- `game/src/config.js` — tuning constants · `random.js` — seeded RNG
- `game/src/city.js` — procedural city · `player.js` — on-foot movement + camera
- `game/src/cars.js` — car factory + arcade driving · `traffic.js` — AI cars + pedestrians
- `game/src/police.js` — wanted level + police pursuit · `missions.js` — 5 story jobs
- `game/src/combat.js` — fists, pistol, mission guards · `hud.js` — HUD + minimap
- `game/src/audio.js` — synthesised sound · `shots.js` — staged screenshot scenes
- `game/src/save.js` — localStorage save/load · `game/vendor/three.min.js` — three.js 0.187.0

Screenshots are real renders of the game, staged deterministically with
`?shot=chase|street|mission|start&seed=7` (see `shots.json`).

## License

MIT — see [LICENSE](LICENSE). All city, character, vehicle, story, art,
sound and music are original; nothing is taken from Rockstar Games or any
other commercial game.
