var leaderboardRows = document.getElementById("leaderboard-rows");
var leaderboardTable = document.getElementById("leaderboard-table");
var emptyState = document.getElementById("empty-state");
var leaderboardStatus = document.getElementById("leaderboard-status");
var leaderboardSocket = typeof io === "function" ? io() : null;

if (leaderboardSocket) {
  leaderboardSocket.on("connect", function() {
    leaderboardStatus.textContent = "Live leaderboard connected.";
    leaderboardSocket.emit("leaderboard:get");
  });

  leaderboardSocket.on("leaderboard:update", renderLeaderboard);
  leaderboardSocket.on("disconnect", function() {
    leaderboardStatus.textContent = "Live leaderboard disconnected.";
  });
} else {
  leaderboardStatus.textContent = "Live scores require the game server.";
}

function renderLeaderboard(entries) {
  leaderboardRows.replaceChildren();
  emptyState.hidden = entries.length > 0;
  leaderboardTable.hidden = entries.length === 0;
  leaderboardStatus.hidden = entries.length === 0;

  entries.forEach(function(entry, index) {
    var row = document.createElement("tr");
    row.appendChild(createCell(String(index + 1).padStart(2, "0")));
    row.appendChild(createCell(entry.name));
    row.appendChild(createCell(String(entry.score)));
    row.appendChild(createCell(formatDate(entry.date)));
    leaderboardRows.appendChild(row);
  });
}

function createCell(value) {
  var cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function formatDate(value) {
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}