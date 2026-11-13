var onlineSocket = typeof io === "function" ? io() : null;
var onlineMode = false;
var onlineJoined = false;
var startAfterJoin = false;

if (onlineSocket) {
  onlineSocket.on("connect", function() {
    onlineMode = true;
    $("#presence-light").addClass("is-connected");
    $("#connection-status").text("Connected to the live room.");

    if (currentPlayerName) {
      joinOnlineRoom(false);
    }
  });

  onlineSocket.on("connect_error", function() {
    $("#connection-status").text("Live room unavailable. Solo play is ready.");
  });

  onlineSocket.on("disconnect", function() {
    onlineMode = false;
    onlineJoined = false;
    started = false;
    acceptingInput = false;
    $("#presence-light").removeClass("is-connected");
    $("#connection-status").text("Disconnected. Solo play is ready.");
    $("#join-room-button").prop("disabled", false).text("Join live room");
    $("#start-button").prop("hidden", false).text("Start game");
    $(".btn").prop("disabled", true);
  });

  onlineSocket.on("player:joined", function(player) {
    onlineJoined = true;
    currentPlayerName = player.name;
    $("#player-name").val(player.name).prop("disabled", true);
    $("#best-score").text(formatScore(player.bestScore));
    $("#join-room-button").prop("disabled", true).text("Joined live room");
    $("#connection-status").text("You are in the shared game room.");
    $("#start-button").text("Start shared game");

    if (startAfterJoin) {
      startAfterJoin = false;
      onlineSocket.emit("game:start");
    }
  });

  onlineSocket.on("presence:update", renderOnlinePlayers);
  onlineSocket.on("leaderboard:update", renderLiveLeaderboard);
  onlineSocket.on("game:state", applySharedGameState);

  onlineSocket.on("game:cue", function(cue) {
    playSound(cue.color);
    animatePress(cue.color);
  });

  onlineSocket.on("game:over", function(result) {
    started = false;
    acceptingInput = false;
    $(".btn").prop("disabled", true);
    $("body").addClass("game-over");
    $("#game-status").text(result.playerName + " missed the pattern.");
    showOverlay("GAME OVER", result.score, result.playerName + " missed. The room cleared " + result.score + " rounds.", "Play again", "game-over");
  });

  onlineSocket.on("server:error", function(message) {
    $("#connection-status").text(message);
  });
}

$("#join-room-button").click(function() {
  joinOnlineRoom(false);
});

function joinOnlineRoom(startGameAfterJoining) {
  if (!onlineSocket || !onlineSocket.connected) {
    $("#connection-status").text("Live room unavailable. Solo play is ready.");
    return;
  }

  var name = (currentPlayerName || $("#player-name").val() || "").trim();
  if (!name) {
    $("#game-status").text("Enter your name before joining the live room.");
    $("#player-name").trigger("focus");
    return;
  }

  startAfterJoin = startGameAfterJoining;
  onlineSocket.emit("player:join", { name: name });
}

function renderOnlinePlayers(players) {
  var list = $("#online-players").empty();
  $("#online-count").text(players.length);

  if (!players.length) {
    list.append($("<li>").addClass("online-empty").text("Waiting for players"));
    return;
  }

  players.forEach(function(player) {
    var item = $("<li>").text(player.name);
    if (onlineSocket && player.id === onlineSocket.id) {
      item.append($("<span>").addClass("you-label").text("YOU"));
    }
    list.append(item);
  });
}

function renderLiveLeaderboard(entries) {
  var list = $("#live-highscores").empty();
  var playerBest = 0;

  entries.slice(0, 5).forEach(function(entry) {
    var item = $("<li>");
    item.append($("<span>").text(entry.name));
    item.append($("<strong>").text(formatScore(entry.score)));
    list.append(item);

    if (onlineJoined && entry.name.toLowerCase() === currentPlayerName.toLowerCase()) {
      playerBest = entry.score;
    }
  });

  if (!entries.length) {
    list.append($("<li>").addClass("online-empty").text("No scores yet"));
  }

  if (onlineJoined) {
    $("#best-score").text(formatScore(playerBest));
  }
}

function applySharedGameState(state) {
  onlineMode = true;
  started = state.active;
  acceptingInput = onlineJoined && state.active && state.acceptingInput;
  level = state.round;
  score = state.score;
  $("#score").text(formatScore(state.score));
  $("#round-number, #board-round").text(formatScore(state.round));
  $("#game-status").text(state.status);
  $(".btn").prop("disabled", !acceptingInput);

  if (state.active) {
    $("body").removeClass("game-over");
    $("#start-button").prop("hidden", true);
  } else {
    $("#start-button").prop("hidden", false).text(onlineJoined ? "Start shared game" : "Join to play live");
  }
}