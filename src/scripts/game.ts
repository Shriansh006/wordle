import { ANSWERS } from "../data/answers";

const ROWS = 6;
const COLS = 5;
const STATS_KEY = "wordle.stats";
const EPOCH = Date.UTC(2024, 0, 1);

type Mark = "correct" | "present" | "absent";

interface Guess {
  word: string;
  marks: Mark[];
}

interface Stats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  distribution: number[];
}

const board = document.getElementById("board") as HTMLElement;
const keyboard = document.getElementById("keyboard") as HTMLElement;
const toastEl = document.getElementById("toast") as HTMLElement;
const statsModal = document.getElementById("stats-modal") as HTMLElement;

let answer = "";
let rowIndex = 0;
let current = "";
let guesses: Guess[] = [];
let gameOver = false;
let validWords = new Set<string>();
let tileRows: HTMLElement[][] = [];
let keyEls: Record<string, HTMLButtonElement> = {};
const keyScore: Record<string, number> = {};

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stats;
      if (Array.isArray(parsed.distribution)) return parsed;
    }
  } catch {}
  return { played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0] };
}

function saveStats(stats: Stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function gameNumber(): number {
  return Math.floor((Date.now() - EPOCH) / 86400000);
}

function pickAnswer(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

function buildBoard() {
  board.innerHTML = "";
  tileRows = [];
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement("div");
    row.className = "row";
    const tiles: HTMLElement[] = [];
    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = '<span class="letter"></span>';
      row.appendChild(tile);
      tiles.push(tile);
    }
    board.appendChild(row);
    tileRows.push(tiles);
  }
}

const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"],
];

function buildKeyboard() {
  keyboard.innerHTML = "";
  keyEls = {};
  for (const keys of KEY_ROWS) {
    const row = document.createElement("div");
    row.className = "key-row";
    for (const k of keys) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key";
      btn.dataset.key = k;
      if (k === "enter") {
        btn.classList.add("wide");
        btn.textContent = "Enter";
      } else if (k === "backspace") {
        btn.classList.add("wide");
        btn.setAttribute("aria-label", "Backspace");
        btn.textContent = "Del";
      } else {
        btn.textContent = k.toUpperCase();
      }
      btn.addEventListener("click", () => pressKey(k));
      row.appendChild(btn);
      keyEls[k] = btn;
    }
    keyboard.appendChild(row);
  }
}

function judge(guess: string, solution: string): Mark[] {
  const marks: Mark[] = Array(COLS).fill("absent");
  const counts: Record<string, number> = {};
  for (const ch of solution) counts[ch] = (counts[ch] ?? 0) + 1;
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === solution[i]) {
      marks[i] = "correct";
      counts[guess[i]]--;
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (marks[i] === "correct") continue;
    const ch = guess[i];
    if (counts[ch] > 0) {
      marks[i] = "present";
      counts[ch]--;
    }
  }
  return marks;
}

let toastTimer = 0;

function toast(message: string, duration = 1400) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), duration);
}

function shakeRow() {
  const row = tileRows[rowIndex];
  if (!row) return;
  const parent = row[0].parentElement;
  if (!parent) return;
  parent.classList.add("shake");
  window.setTimeout(() => parent.classList.remove("shake"), 500);
}

function pressKey(key: string) {
  if (gameOver) return;
  if (key === "enter") {
    submit();
  } else if (key === "backspace") {
    if (current.length > 0) {
      current = current.slice(0, -1);
      renderCurrent();
    }
  } else if (/^[a-z]$/.test(key) && current.length < COLS) {
    current += key;
    renderCurrent();
  }
}

function renderCurrent() {
  const row = tileRows[rowIndex];
  if (!row) return;
  for (let c = 0; c < COLS; c++) {
    const letter = row[c].querySelector(".letter") as HTMLElement;
    const ch = current[c] ?? "";
    letter.textContent = ch.toUpperCase();
    row[c].classList.toggle("filled", Boolean(ch));
  }
}

function submit() {
  if (current.length < COLS) {
    toast("Not enough letters");
    shakeRow();
    return;
  }
  if (!validWords.has(current)) {
    toast("Not in word list");
    shakeRow();
    return;
  }

  const marks = judge(current, answer);
  guesses.push({ word: current, marks });

  const row = tileRows[rowIndex];
  const word = current;
  for (let c = 0; c < COLS; c++) {
    const tile = row[c];
    (tile.querySelector(".letter") as HTMLElement).textContent = word[c].toUpperCase();
    tile.classList.add("filled");
    window.setTimeout(() => {
      tile.dataset.state = marks[c];
      tile.classList.add("reveal");
      updateKey(word[c], marks[c]);
    }, c * 280);
  }

  const done = marks.every((m) => m === "correct");
  const last = rowIndex === ROWS - 1;
  current = "";
  rowIndex++;

  window.setTimeout(() => {
    if (done) finish(true);
    else if (last) finish(false);
  }, COLS * 280 + 260);
}

function updateKey(letter: string, mark: Mark) {
  const score = mark === "correct" ? 3 : mark === "present" ? 2 : 1;
  if ((keyScore[letter] ?? 0) >= score) return;
  keyScore[letter] = score;
  const btn = keyEls[letter];
  if (btn) btn.dataset.state = mark;
}

const WIN_MESSAGES = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];

function finish(won: boolean) {
  gameOver = true;
  const stats = loadStats();
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.distribution[guesses.length - 1]++;
    toast(WIN_MESSAGES[guesses.length - 1], 1800);
  } else {
    stats.streak = 0;
    toast(answer.toUpperCase(), 3000);
  }
  saveStats(stats);
  window.setTimeout(() => openStats(), won ? 1800 : 2200);
}

function renderStats() {
  const stats = loadStats();
  const rate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  (document.getElementById("stat-played") as HTMLElement).textContent = String(stats.played);
  (document.getElementById("stat-rate") as HTMLElement).textContent = rate + "%";
  (document.getElementById("stat-streak") as HTMLElement).textContent = String(stats.streak);
  (document.getElementById("stat-max") as HTMLElement).textContent = String(stats.maxStreak);

  const dist = document.getElementById("distribution") as HTMLElement;
  const max = Math.max(1, ...stats.distribution);
  dist.innerHTML = "";
  stats.distribution.forEach((count, i) => {
    const bar = document.createElement("div");
    bar.className = "dist-row";
    const label = document.createElement("span");
    label.className = "dist-num";
    label.textContent = String(i + 1);
    const fill = document.createElement("span");
    fill.className = "dist-bar";
    fill.style.width = Math.max(6, (count / max) * 100) + "%";
    fill.textContent = String(count);
    bar.append(label, fill);
    dist.appendChild(bar);
  });

  (document.getElementById("share") as HTMLButtonElement).disabled = guesses.length === 0;
}

function openStats() {
  renderStats();
  statsModal.classList.remove("hidden");
  statsModal.setAttribute("aria-hidden", "false");
}

function closeStats() {
  statsModal.classList.add("hidden");
  statsModal.setAttribute("aria-hidden", "true");
}

async function share() {
  const grid = guesses
    .map((g) => g.marks.map((m) => (m === "correct" ? "\u{1F7E9}" : m === "present" ? "\u{1F7E8}" : "\u2B1B")).join(""))
    .join("\n");
  const won = guesses.length > 0 && guesses[guesses.length - 1].marks.every((m) => m === "correct");
  const score = won ? String(guesses.length) : "X";
  const text = "Wordle " + gameNumber() + " " + score + "/" + ROWS + "\n\n" + grid;
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied results to clipboard", 1600);
  } catch {
    toast("Copy failed", 1600);
  }
}

function newGame() {
  answer = pickAnswer();
  current = "";
  rowIndex = 0;
  guesses = [];
  gameOver = false;
  for (const k of Object.keys(keyScore)) delete keyScore[k];
  buildBoard();
  for (const k of Object.keys(keyEls)) delete keyEls[k].dataset.state;
  closeStats();
}

async function loadValidWords() {
  const base = import.meta.env.BASE_URL || "/";
  try {
    const res = await fetch(base + "valid-words.json");
    const words = (await res.json()) as string[];
    validWords = new Set(words);
  } catch {
    validWords = new Set(ANSWERS);
  }
  for (const w of ANSWERS) validWords.add(w);
}

function onKeyDown(e: KeyboardEvent) {
  if (statsModal.classList.contains("hidden") === false) {
    if (e.key === "Escape") closeStats();
    return;
  }
  if (e.key === "Enter") pressKey("enter");
  else if (e.key === "Backspace") pressKey("backspace");
  else if (/^[a-zA-Z]$/.test(e.key)) pressKey(e.key.toLowerCase());
}

function init() {
  buildBoard();
  buildKeyboard();
  loadValidWords();
  newGame();
  document.addEventListener("keydown", onKeyDown);
  document.getElementById("new-game")?.addEventListener("click", newGame);
  document.getElementById("open-stats")?.addEventListener("click", openStats);
  document.getElementById("close-stats")?.addEventListener("click", closeStats);
  document.getElementById("share")?.addEventListener("click", share);
  document.getElementById("play-again")?.addEventListener("click", newGame);
  statsModal.addEventListener("click", (e) => {
    if (e.target === statsModal) closeStats();
  });
}

init();
