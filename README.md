# night-vault

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/yanxiaoxv/night-vault/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/yanxiaoxv/night-vault/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Night Vault** is a top-down stealth caper in three nights. You are a burglar inside the lantern-lit Meridian Vault: read the guards' patrols, stay out of their vision cones (walls and crates block the light), melt into shadow pools where you are only half-seen, and toss decoy coins to pull a guard off his route — then reach the green vault door unseen. Suspicion fills while you are in a cone and drains when you break sight; a full meter means a chase, and a chase that touches you restarts the night. Finish a night never fully spotted for the GHOST bonus. The third night adds a rotating sentry who never leaves the vault door. Everything is hand-written vanilla JavaScript on a canvas — no libraries, no build step, no network — with synthesised WebAudio sound (footsteps, coin pings, the alarm sting).

Controls: WASD / arrow keys move · SHIFT sneaks (silent, slower) · click or F tosses a coin toward the pointer · P pauses · M mutes · R restarts the night.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in desktop Chrome — or just open game/index.html

# the hand-in program (Node 22): copies game/ and screenshots/ and writes the dossier
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
