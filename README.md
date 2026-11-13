# Mindgame

## Run locally

Requires Node.js 18 or newer.

```powershell
npm.cmd install
npm.cmd start
```

Open http://localhost:3000. Enter a name and join the live room to see other players, play the shared game, and follow the global high scores. High scores are saved in `data/leaderboard.json` on the server.

## Deploy for other players

GitHub Pages can host the static files but cannot run the live game server. The Render Blueprint uses its free web-service plan, which can sleep when idle. Scores are shared while the server is running, but its local score file may reset after a restart. Use a paid persistent disk or an external database if scores must survive restarts.