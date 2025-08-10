// assets/js/quest-xp.js
let currentIndex = 0;
let totalCells   = 0;
let xp           = 0;

export function resetProgress() {
  currentIndex = 0;
  xp = 0;
}

export function setTotalCells(n) {
  totalCells = Math.max(0, Number(n || 0));
}

export function getIndex() { return currentIndex; }
export function nextCell() { currentIndex += 1; }
export function addXP(v)   { xp += Number(v || 0); }

export function updateProgressBar(done = currentIndex, total = totalCells) {
  const bar = document.getElementById('progress-bar'); // optionnel si tu l’ajoutes plus tard
  if (!bar) return;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  bar.style.width = `${pct}%`;
}
