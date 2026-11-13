var leaderboardRows = document.getElementById("leaderboard-rows");
var leaderboardTable = document.getElementById("leaderboard-table");
var emptyState = document.getElementById("empty-state");

renderLeaderboard();

function renderLeaderboard() {
  var entries = loadLeaderboard();
  emptyState.hidden = entries.length > 0;
  leaderboardTable.hidden = entries.length === 0;

  entries.forEach(function(entry, index) {
    var row = document.createElement("tr");
    row.appendChild(createCell(String(index + 1).padStart(2, "0")));
    row.appendChild(createCell(entry.name));
    row.appendChild(createCell(String(entry.score)));
    row.appendChild(createCell(formatDate(entry.date)));
    leaderboardRows.appendChild(row);
  });
}

function loadLeaderboard() {
  try {
    var entries = JSON.parse(localStorage.getItem("simonLeaderboard") || "[]");
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .filter(function(entry) {
        return entry && typeof entry.name === "string" && Number.isFinite(Number(entry.score)) && Number(entry.score) > 0;
      })
      .sort(function(first, second) {
        return Number(second.score) - Number(first.score) || new Date(first.date) - new Date(second.date);
      })
      .slice(0, 10);
  } catch (error) {
    return [];
  }
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