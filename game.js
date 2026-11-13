
var buttonColours = ["red", "blue", "green", "yellow"];
var gamePattern = [];
var userClickedPattern = [];
var started = false;
var acceptingInput = false;
var level = 0;
var score = 0;
var bestScore = loadBestScore();
var currentPlayerName = "";
var overlayMode = "";

$("#best-score").text(formatScore(bestScore));

$("#start-button").click(startGame);

$(document).keydown(function(event) {
  if (!started && $("#game-overlay").prop("hidden") && event.target.id !== "player-name" && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    startGame();
  }
});

$(".btn").click(function() {
  if (!started || !acceptingInput) {
    return;
  }

  var userChosenColour = $(this).attr("id");
  userClickedPattern.push(userChosenColour);
  playSound(userChosenColour);
  animatePress(userChosenColour);
  checkAnswer(userClickedPattern.length - 1);
});

function checkAnswer(currentStep) {
  if (gamePattern[currentStep] !== userClickedPattern[currentStep]) {
    finishGame();
    return;
  }

  if (userClickedPattern.length === gamePattern.length) {
    acceptingInput = false;
    $(".btn").prop("disabled", true);
    score = level;
    var isNewBest = updateScore();
    $("#game-status").text(isNewBest ? "New personal best: " + formatScore(bestScore) : "Round cleared.");
    setTimeout(nextSequence, 850);
  }
}

function nextSequence() {
  userClickedPattern = [];
  level++;
  $("#round-number, #board-round").text(formatScore(level));
  $("#game-status").text("Listen for the new color.");

  var randomNumber = Math.floor(Math.random() * buttonColours.length);
  gamePattern.push(buttonColours[randomNumber]);
  acceptingInput = false;
  $(".btn").prop("disabled", true);
  setTimeout(function() {
    var newColour = gamePattern[gamePattern.length - 1];
    playSound(newColour);
    animatePress(newColour);
    setTimeout(function() {
      acceptingInput = true;
      $(".btn").prop("disabled", false);
      $("#game-status").text("Your turn. Repeat the pattern.");
    }, 350);
  }, 350);
}

function animatePress(currentColor) {
  $("#" + currentColor).addClass("pressed");
  setTimeout(function() {
    $("#" + currentColor).removeClass("pressed");
  }, 260);
}

function startGame() {
  if (started) {
    return;
  }

  currentPlayerName = $("#player-name").val().trim();
  if (!currentPlayerName) {
    $("#game-status").text("Enter your name before starting.");
    $("#player-name").trigger("focus");
    return;
  }

  started = true;
  acceptingInput = false;
  level = 0;
  score = 0;
  gamePattern = [];
  userClickedPattern = [];
  $("body").removeClass("game-over");
  $("#score, #round-number, #board-round").text("00");
  $("#game-status").text("Get ready.");
  $("#player-name").prop("disabled", true);
  $("#start-button").prop("hidden", true);
  nextSequence();
}

function finishGame() {
  acceptingInput = false;
  started = false;
  $(".btn").prop("disabled", true);
  playSound("wrong");
  $("body").addClass("game-over");
  $("#game-status").text(score > 0 ? "Game over. " + score + " rounds cleared." : "Not quite. Try again.");
  $("#player-name").prop("disabled", false);
  $("#start-button").text("Play again").prop("hidden", false);

  showOverlay("GAME OVER", score, score > 0 ? currentPlayerName + ", you cleared " + score + " rounds." : "One more try? The pattern is waiting.", "Play again", "game-over");

  if (score > 0) {
    saveLeaderboardEntry(currentPlayerName, score);
  }
}

function updateScore() {
  var isNewBest = false;
  $("#score").text(formatScore(score));

  if (score > bestScore) {
    bestScore = score;
    isNewBest = true;
    $("#best-score").text(formatScore(bestScore));
    animateBestScore();
    saveBestScore(bestScore);
  }

  return isNewBest;
}

function animateBestScore() {
  var scoreElement = $("#best-score");
  scoreElement.removeClass("is-new-best");
  scoreElement[0].offsetWidth;
  scoreElement.addClass("is-new-best");
  setTimeout(function() {
    scoreElement.removeClass("is-new-best");
  }, 700);
}

function showOverlay(kicker, value, message, actionLabel, mode) {
  overlayMode = mode;
  $("#overlay-kicker").text(kicker);
  $("#overlay-title").text("Game over.");
  $("#overlay-score").text(formatScore(value));
  $("#overlay-message").text(message);
  $("#overlay-action").text(actionLabel);
  $("#game-overlay").prop("hidden", false);
  $("#overlay-action").trigger("focus");
}

function hideOverlay() {
  $("#game-overlay").prop("hidden", true);
  $("#start-button").trigger("focus");
}

$("#overlay-action").click(function() {
  var shouldRestart = overlayMode === "game-over";
  hideOverlay();

  if (shouldRestart) {
    startGame();
  }
});

function formatScore(value) {
  return String(value).padStart(2, "0");
}

function loadBestScore() {
  try {
    return Number(localStorage.getItem("simonBestScore")) || 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem("simonBestScore", String(value));
  } catch (error) {
    return;
  }
}

function saveLeaderboardEntry(name, value) {
  try {
    var entries = JSON.parse(localStorage.getItem("simonLeaderboard") || "[]");
    entries.push({
      name: name,
      score: value,
      date: new Date().toISOString()
    });
    entries.sort(function(first, second) {
      return second.score - first.score || new Date(first.date) - new Date(second.date);
    });
    localStorage.setItem("simonLeaderboard", JSON.stringify(entries.slice(0, 10)));
  } catch (error) {
    return;
  }
}

function playSound(name) {
  var audio = new Audio("sounds/" + name + ".mp3");
  audio.play().catch(function() {});
}
