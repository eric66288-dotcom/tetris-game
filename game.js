const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: "#5bd9ff",
  J: "#5c7cff",
  L: "#ffad42",
  O: "#ffd84d",
  S: "#45dc7c",
  T: "#c66bff",
  Z: "#ff5d6c",
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const boardCanvas = document.querySelector("#board");
const boardCtx = boardCanvas.getContext("2d");
const nextCanvas = document.querySelector("#next");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const linesEl = document.querySelector("#lines");
const levelEl = document.querySelector("#level");
const pauseBtn = document.querySelector("#pauseBtn");
const restartBtn = document.querySelector("#restartBtn");

let arena;
let player;
let nextPiece;
let dropCounter;
let lastTime;
let isPaused;
let isGameOver;
let score;
let lines;
let level;
let animationId;

function createArena() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const matrix = SHAPES[type].map((row) => [...row]);
  return { type, matrix, x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2), y: 0 };
}

function resetGame() {
  arena = createArena();
  nextPiece = randomPiece();
  player = randomPiece();
  dropCounter = 0;
  lastTime = 0;
  isPaused = false;
  isGameOver = false;
  score = 0;
  lines = 0;
  level = 1;
  pauseBtn.textContent = "Pause";
  updateStats();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(update);
}

function collide(piece) {
  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (!piece.matrix[y][x]) continue;
      const boardY = piece.y + y;
      const boardX = piece.x + x;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS || arena[boardY]?.[boardX]) {
        return true;
      }
    }
  }
  return false;
}

function merge(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) arena[piece.y + y][piece.x + x] = piece.type;
    });
  });
}

function sweep() {
  let cleared = 0;
  for (let y = arena.length - 1; y >= 0; y -= 1) {
    if (arena[y].every(Boolean)) {
      arena.splice(y, 1);
      arena.unshift(Array(COLS).fill(""));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared) {
    const lineScores = [0, 100, 300, 500, 800];
    score += lineScores[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    updateStats();
  }
}

function rotate(matrix) {
  const rotated = matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
  return rotated;
}

function rotatePlayer() {
  const original = player.matrix;
  player.matrix = rotate(player.matrix);
  let offset = 1;
  while (collide(player)) {
    player.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > player.matrix[0].length + 1) {
      player.matrix = original;
      return;
    }
  }
}

function drop() {
  player.y += 1;
  if (collide(player)) {
    player.y -= 1;
    merge(player);
    sweep();
    player = nextPiece;
    nextPiece = randomPiece();
    if (collide(player)) {
      isGameOver = true;
    }
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(player)) {
    player.y += 1;
    score += 2;
  }
  player.y -= 1;
  drop();
  updateStats();
}

function move(dir) {
  player.x += dir;
  if (collide(player)) player.x -= dir;
}

function updateStats() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawCell(ctx, x, y, color, size = BLOCK) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawMatrix(ctx, matrix, offset, type, size = BLOCK) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(ctx, x + offset.x, y + offset.y, COLORS[type], size);
    });
  });
}

function drawBoard() {
  boardCtx.fillStyle = "#0a0c0f";
  boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  arena.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawCell(boardCtx, x, y, COLORS[type]);
    });
  });

  drawMatrix(boardCtx, player.matrix, { x: player.x, y: player.y }, player.type);

  if (isPaused || isGameOver) {
    boardCtx.fillStyle = "rgba(0,0,0,0.68)";
    boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    boardCtx.fillStyle = "#f4f6f8";
    boardCtx.font = "700 28px system-ui";
    boardCtx.textAlign = "center";
    boardCtx.fillText(isGameOver ? "Game Over" : "Paused", boardCanvas.width / 2, boardCanvas.height / 2);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "#0a0c0f";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const size = 24;
  const x = (5 - nextPiece.matrix[0].length) / 2;
  const y = (5 - nextPiece.matrix.length) / 2;
  drawMatrix(nextCtx, nextPiece.matrix, { x, y }, nextPiece.type, size);
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  if (!isPaused && !isGameOver) {
    dropCounter += deltaTime;
    const interval = Math.max(120, 900 - (level - 1) * 70);
    if (dropCounter > interval) drop();
  }

  drawBoard();
  drawNext();
  animationId = requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }
  if (isPaused || isGameOver) return;

  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
  if (event.key === "ArrowDown") drop();
  if (event.key === "ArrowUp") rotatePlayer();
  if (event.code === "Space") {
    event.preventDefault();
    hardDrop();
  }
});

function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
}

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);

document.querySelectorAll(".mobile-controls button").forEach((button) => {
  button.addEventListener("click", () => {
    if (isPaused || isGameOver) return;
    const action = button.dataset.action;
    if (action === "left") move(-1);
    if (action === "right") move(1);
    if (action === "rotate") rotatePlayer();
    if (action === "drop") drop();
  });
});

resetGame();
