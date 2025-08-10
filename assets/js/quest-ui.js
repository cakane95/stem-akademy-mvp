// assets/js/quest-ui.js
// Rendu UI + logiques MCQ & Rapid‑MCQ
import { addXP, getIndex } from './quest-xp.js';

export function renderCell(cellData, cellIndex) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('quest-cell');
  wrapper.dataset.cellIndex = String(cellIndex);

  switch (cellData.type) {
    case 'markdown':
      wrapper.innerHTML = renderMarkdown(cellData);
      break;
    case 'code-py':
      wrapper.innerHTML = renderPyCell(cellData, 'run');
      break;
    case 'exercice-py':
      wrapper.innerHTML = renderPyCell(cellData, 'verify');
      break;
    case 'mcq':
      wrapper.innerHTML = renderMcq(cellData, cellIndex);
      break;
    case 'rapid-mcq':
      wrapper.innerHTML = renderRapidShell(cellIndex, cellData);
      break;
    default:
      wrapper.innerHTML = `<div class="bg-white p-4 rounded-lg border">
        <p class="text-red-600">Type inconnu : ${cellData.type}</p></div>`;
  }
  return wrapper;
}

/* ---------- Rapid‑MCQ ---------- */
export function startRapidMcq(cardElement, cellData, onFinish) {
  let idx = 0;
  let score = 0;
  const timeLimit = Number(cellData.timeLimit ?? 15);

  const cellIndex = Number(cardElement.closest('.quest-cell')?.dataset.cellIndex || '0');
  const contentEl = cardElement.querySelector(`#rapid-mcq-content-${cellIndex}`);
  const timerEl   = cardElement.querySelector(`#timer-display-${cellIndex}`);
  const flipInner = cardElement.querySelector('.flip-card-inner');

  let timerId = null;

  const showQuestion = () => {
    clearInterval(timerId);
    if (!cellData.questions || idx >= cellData.questions.length) {
      return endQuiz();
    }
    const q = cellData.questions[idx];
    let timeLeft = timeLimit;
    timerEl.textContent = `⏳ ${timeLeft}s`;

    contentEl.innerHTML = `
      <p class="text-slate-700 mb-3 font-semibold">${q.question}</p>
      <div class="space-y-3">
        ${q.options.map(opt => `
          <label class="flex items-center p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="rapid-${getIndex()}-${idx}" value="${opt}" class="h-4 w-4 text-blue-600">
            <span class="ml-3 text-slate-700">${opt}</span>
          </label>`).join('')}
      </div>
    `;

    const front = cardElement.querySelector('.flip-card-front > div');
    flipInner.style.height = `${front.offsetHeight}px`;

    timerId = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `⏳ ${timeLeft}s`;
      if (timeLeft <= 0) handleAnswer(null);
    }, 1000);
  };

  const handleAnswer = (val) => {
    const q = cellData.questions[idx];
    if (val && val === q.correctAnswer) score++;
    idx++;
    showQuestion();
  };

  const endQuiz = () => {
    clearInterval(timerId);
    const scoreEl = cardElement.querySelector(`#rapid-mcq-score-${cellIndex}`);
    const feedbackEl = cardElement.querySelector(`#rapid-mcq-feedback-${cellIndex}`);
    scoreEl.textContent = `${score}/${cellData.questions.length}`;
    feedbackEl.textContent = score >= Math.ceil(cellData.questions.length * 0.7)
      ? 'Bien joué !'
      : 'Continue à t’entraîner 👊';

    addXP(score * 20);

    const back = cardElement.querySelector('.flip-card-back > div');
    const inner = cardElement.querySelector('.flip-card-inner');
    inner.style.height = `${back.offsetHeight}px`;
    setTimeout(() => { cardElement.classList.add('is-flipped'); }, 180);

    onFinish && onFinish(score);
  };

  cardElement.addEventListener('click', (e) => {
    const radio = e.target.closest('input[type="radio"]');
    if (radio) handleAnswer(radio.value);
  });

  showQuestion();
}

/* ---------- MCQ ---------- */
export function handleMcqCheck(cellWrapper, cellData) {
  const cellIdx = Number(cellWrapper.dataset.cellIndex || '0');
  const feedback  = cellWrapper.querySelector('.feedback-area');
  const btn       = cellWrapper.querySelector('.check-mcq-btn');
  const selected  = cellWrapper.querySelector(`input[name="mcq-${cellIdx}"]:checked`);

  feedback.classList.remove('hidden');

  if (!selected) {
    feedback.textContent = 'Veuillez sélectionner une réponse.';
    feedback.className = 'feedback-area mt-4 p-3 rounded-lg text-center font-semibold bg-yellow-100 text-yellow-800';
    return;
  }

  if (selected.value === cellData.correctAnswer) {
    feedback.textContent = 'Correct !';
    feedback.className = 'feedback-area mt-4 p-3 rounded-lg text-center font-semibold bg-green-100 text-green-800';
    // Lock radios
    cellWrapper.querySelectorAll('input[type="radio"]').forEach(i => i.disabled = true);
    addXP(20);
    btn.textContent = 'Continuer';
    btn.classList.remove('check-mcq-btn');
    btn.classList.add('next-step-btn');
  } else {
    feedback.textContent = 'Incorrect. Essayez encore !';
    feedback.className = 'feedback-area mt-4 p-3 rounded-lg text-center font-semibold bg-red-100 text-red-800';
  }
}

/* ---------- Helpers UI ---------- */
export function showMissionChooser() {
  document.getElementById('mission-chooser')?.classList.remove('hidden');
}
export function hideMissionChooser() {
  document.getElementById('mission-chooser')?.classList.add('hidden');
}

/* ---------- Rendu HTML ---------- */
function renderMarkdown(cell) {
  return `
    <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
      ${cell.title ? `<h2 class="text-lg font-bold mb-4">${cell.title}</h2>` : ''}
      <div class="prose prose-slate max-w-none">${cell.content || ''}</div>
      ${cell.staticCode ? `
        <div class="mt-4 bg-slate-100 p-4 rounded-md overflow-auto">
          <pre><code class="language-python">${cell.staticCode}</code></pre>
        </div>` : ''}
      <div class="mt-6 text-right">
        <button class="next-step-btn bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Continuer</button>
      </div>
    </div>`;
}

function renderPyCell(cell, mode) {
  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-6 space-y-4">
        ${cell.title ? `<h2 class="text-lg font-bold text-slate-900">${cell.title}</h2>` : ''}
        <div>
          <label class="text-sm text-slate-600">Code à exécuter :</label>
          <textarea class="w-full mt-2 p-3 border border-slate-300 rounded-lg font-mono text-sm" rows="8" data-role="editor">${cell.initialCode || ''}</textarea>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-replay px-3 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300">↺ Réinitialiser</button>
          <button class="btn-run px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">${mode === 'verify' ? 'Vérifier' : 'Exécuter'}</button>
        </div>
      </div>
      <div class="bg-[#001F3D] p-3">
        <div class="bg-[#001F3D] rounded-xl p-3 border border-slate-700">
          <div class="terminal-root" style="height: clamp(180px, 38vh, 380px)"></div>
        </div>
      </div>
    </div>`;
}

function renderMcq(cell, cellIndex) {
  const optionsHtml = (cell.options || []).map(opt => `
    <label class="flex items-center p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
      <input type="radio" name="mcq-${cellIndex}" value="${opt}" class="h-4 w-4 text-blue-600">
      <span class="ml-3 text-slate-700">${opt}</span>
    </label>`).join('');
  return `
    <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
      <p class="text-slate-700 mb-4 font-semibold">${cell.question || ''}</p>
      <div class="space-y-3">${optionsHtml}</div>
      <div class="feedback-area mt-4 p-3 rounded-lg text-center font-semibold hidden"></div>
      <div class="mt-4 text-right">
        <button class="check-mcq-btn bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Vérifier</button>
      </div>
    </div>`;
}

function renderRapidShell(cellIndex, cellData) {
  return `
    <div class="flip-card">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 relative">
            <div class="absolute top-4 right-4 font-bold text-lg text-brand-orange" id="timer-display-${cellIndex}">
              ⏳ ${(cellData.timeLimit ?? 15)}s
            </div>
            <h2 class="text-lg font-bold mb-4">Quiz Rapide</h2>
            <p class="text-slate-500 mb-2">${(cellData.questions || []).length} question(s)</p>
            <div id="rapid-mcq-content-${cellIndex}"></div>
          </div>
        </div>
        <div class="flip-card-back">
          <div class="bg-slate-800 text-white rounded-xl shadow-xl p-6 flex flex-col items-center justify-center h-full">
            <h2 class="text-2xl font-bold">Score Final</h2>
            <p id="rapid-mcq-score-${cellIndex}" class="text-5xl font-extrabold text-brand-orange my-4">0/${(cellData.questions || []).length}</p>
            <p id="rapid-mcq-feedback-${cellIndex}" class="mb-6">Félicitations !</p>
            <button class="next-step-btn bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600">Continuer</button>
          </div>
        </div>
      </div>
    </div>`;
}
