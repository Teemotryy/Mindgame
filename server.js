const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = Number(process.env.PORT) || 3000;
const dataDirectory = path.join(__dirname, "data");
const leaderboardFile = path.join(dataDirectory, "leaderboard.json");
const colors = ["red", "blue", "green", "yellow"];
const players = new Map();

const game = {
  active: false,
  acceptingInput: false,
  pattern: [],
  inputIndex: 0,
  round: 0,
  score: 0,
  status: "Join the room to play together."
};

fs.mkdirSync(dataDirectory, { recursive: true });
if (!fs.existsSync(leaderboardFile)) {
  fs.writeFileSync(leaderboardFile, "[]\n");
}

const publicFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/highscores.html", "highscores.html"],
  ["/styles.css", "styles.css"],
  ["/game.js", "game.js"],
  ["/online.js", "online.js"],
  ["/highscores.js", "highscores.js"]
]);

app.get("/health", (request, response) => {
  response.json({ status: "ok", online: players.size });
});

for (const [url, filename] of publicFiles) {
  app.get(url, (request, response) => {
    response.sendFile(path.join(__dirname, filename));
  });
}

app.get("/sounds/:filename", (request, response) => {
  if (!/^(red|blue|green|yellow|wrong)\.mp3$/.test(request.params.filename)) {
    response.sendStatus(404);
    return;
  }

  response.sendFile(path.join(__dirname, "sounds", request.params.filename));
});

function readLeaderboard() {
  try {
    const entries = JSON.parse(fs.readFileSync(leaderboardFile, "utf8"));
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

let leaderboard = readLeaderboard();

function sortLeaderboard() {
  leaderboard.sort((first, second) => second.score - first.score || first.date.localeCompare(second.date));
  leaderboard = leaderboard.slice(0, 10);
}

function getBestScore(name) {
  const entry = leaderboard.find(item => item.name.toLowerCase() === name.toLowerCase());
  return entry ? entry.score : 0;
}

function saveScore(name, score) {
  const existing = leaderboard.find(item => item.name.toLowerCase() === name.toLowerCase());
  if (existing && existing.score >= score) {
    return false;
  }

  leaderboard = leaderboard.filter(item => item.name.toLowerCase() !== name.toLowerCase());
  leaderboard.push({ name, score, date: new Date().toISOString() });
  sortLeaderboard();
  fs.writeFileSync(leaderboardFile, JSON.stringify(leaderboard, null, 2) + "\n");
  io.emit("leaderboard:update", leaderboard);
  return true;
}

function getPresence() {
  return Array.from(players.entries()).map(([id, player]) => ({
    id,
    name: player.name
  }));
}

function broadcastPresence() {
  io.emit("presence:update", getPresence());
}

function getGameState() {
  return {
    active: game.active,
    acceptingInput: game.acceptingInput,
    round: game.round,
    score: game.score,
    status: game.status
  };
}

function broadcastGameState() {
  io.emit("game:state", getGameState());
}

function queueNextRound() {
  if (!game.active) {
    return;
  }

  game.round++;
  game.pattern.push(colors[Math.floor(Math.random() * colors.length)]);
  game.inputIndex = 0;
  game.acceptingInput = false;
  game.status = "Watch for the new color.";
  broadcastGameState();

  const currentRound = game.round;
  setTimeout(() => {
    if (!game.active || game.round !== currentRound) {
      return;
    }

    io.emit("game:cue", { color: game.pattern[game.pattern.length - 1], round: currentRound });
    setTimeout(() => {
      if (!game.active || game.round !== currentRound) {
        return;
      }

      game.acceptingInput = true;
      game.status = "Your turn. Anyone online can repeat the pattern.";
      broadcastGameState();
    }, 350);
  }, 650);
}

function startGame(player) {
  if (game.active) {
    return;
  }

  game.active = true;
  game.acceptingInput = false;
  game.pattern = [];
  game.inputIndex = 0;
  game.round = 0;
  game.score = 0;
  game.status = player.name + " started a shared game.";
  queueNextRound();
}

io.on("connection", socket => {
  socket.emit("presence:update", getPresence());
  socket.emit("leaderboard:update", leaderboard);
  socket.emit("game:state", getGameState());

  socket.on("player:join", payload => {
    const name = String(payload && payload.name || "").replace(/\s+/g, " ").trim().slice(0, 18);
    if (!name) {
      socket.emit("server:error", "Enter a name to join the live room.");
      return;
    }

    players.set(socket.id, { name });
    socket.data.name = name;
    socket.emit("player:joined", { name, bestScore: getBestScore(name) });
    socket.emit("game:state", getGameState());
    broadcastPresence();
  });

  socket.on("game:start", () => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit("server:error", "Join the room before starting a shared game.");
      return;
    }

    startGame(player);
  });

  socket.on("game:input", payload => {
    const player = players.get(socket.id);
    if (!player || !game.active || !game.acceptingInput || !colors.includes(payload && payload.color)) {
      return;
    }

    game.acceptingInput = false;
    if (game.pattern[game.inputIndex] !== payload.color) {
      game.active = false;
      game.status = player.name + " missed the pattern.";
      io.emit("game:over", { score: game.score, playerName: player.name });
      broadcastGameState();
      return;
    }

    game.inputIndex++;
    if (game.inputIndex === game.pattern.length) {
      game.score = game.round;
      game.status = player.name + " cleared round " + game.round + ".";
      saveScore(player.name, game.score);
      broadcastGameState();
      setTimeout(queueNextRound, 850);
      return;
    }

    game.acceptingInput = true;
    game.status = player.name + " played. " + (game.pattern.length - game.inputIndex) + " left.";
    broadcastGameState();
  });

  socket.on("leaderboard:get", () => {
    socket.emit("leaderboard:update", leaderboard);
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    broadcastPresence();

    if (players.size === 0 && game.active) {
      game.active = false;
      game.acceptingInput = false;
      game.status = "Waiting for a player.";
      broadcastGameState();
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log("Timothy's Simon live server listening on port " + port);
});