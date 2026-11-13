# Mindgame

## Run locally

Requires Node.js 18 or newer.

```powershell
npm.cmd install
npm.cmd start
```

Open http://localhost:3000. Enter a name and join the live room to see other players, play the shared game, and follow the global high scores. High scores are saved in `data/leaderboard.json` on the server.

## Deploy for other players

GitHub Pages can host the static files but cannot run the live game server. Deploy this Node app to a host that supports WebSockets and persistent disk storage, and run a single server instance so online presence and saved scores are shared.