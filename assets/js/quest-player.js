// assets/js/quest-player.js
// Orchestration : mission → loader (6s) → fetch JSON → rendu progressif
// Intègre Pyodide (worker persistant v0.28.1) + xterm par cellule Python

import { resolveQuestJson } from './missionsRouter.js';
import { renderCell, startRapidMcq, handleMcqCheck } from './quest-ui.js';
//import { createTerminalIn } from './terminal.js';
import { createIOForTerminal } from './termHelpers.js';
import { addXP, nextCell, getIndex, resetProgress, setTotalCells, updateProgressBar } from './quest-xp.js';

let questCells = [];

// Worker + stdin SAB (partagés entre cellules)
let pyWorker = null;
const INPUT_CAP = 4096;
let sabCtrl, sabData, ctrl, dataBytes;

// Précharge Pyodide en arrière-plan
let resolvePyReady;
const pyReadyP = new Promise(res => (resolvePyReady = res));

function bootPyodideInBackground() {
  if (pyWorker) return;
  pyWorker = new Worker('/assets/js/workers/py-worker.js');

  pyWorker.onmessage = (ev) => {
    const { type } = ev.data || {};
    if (type === 'ready') resolvePyReady(true);
  };
  pyWorker.onerror = (e) => {
    console.error('[py-worker error]', e);
    resolvePyReady(true); // on ne bloque pas l’UI
  };

  // SAB stdin
  sabCtrl = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  sabData = new SharedArrayBuffer(INPUT_CAP);
  ctrl = new Int32Array(sabCtrl);
  dataBytes = new Uint8Array(sabData);
  Atomics.store(ctrl, 0, -1);
  pyWorker.postMessage({ type: 'setup_stdin', sabCtrl, sabData });

  // init pyodide
  pyWorker.postMessage({ type: 'init' });
}

/* ------------------------- Loader helpers ------------------------- */
function showLoader() {
  const overlay = document.getElementById('loader-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  const host = document.getElementById('loader-anim-container');
  if (host) {
    host.innerHTML = `
      <dotlottie-wc
        id="loader-anim"
        src="https://lottie.host/26d1914f-e195-4e30-8253-df4417c5b3d4/R1VPlibtfh.lottie"
        style="width: 360px; height: 360px"
        autoplay
        loop
      ></dotlottie-wc>`;
  }
}
function hideLoader() {
  const overlay = document.getElementById('loader-overlay');
  if (!overlay) return;
  try { overlay.querySelector('#loader-anim')?.stop?.(); } catch {}
  overlay.classList.add('hidden');
}

/* ----------------------------- Runtime ---------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const chooser           = document.getElementById('mission-chooser');
  const notebookContainer = document.getElementById('notebook-container');
  const footer            = document.getElementById('footer');

  bootPyodideInBackground();     // dès l’arrivée
  chooser?.classList.remove('hidden');

  chooser?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-domain]');
    if (!btn) return;

    const domain = btn.dataset.domain;
    localStorage.setItem('last-domain', domain);
    chooser.classList.add('hidden');

    showLoader();

    let resolveAnimPlayed;
    const animPlayedP = new Promise(res => (resolveAnimPlayed = res));
    setTimeout(() => resolveAnimPlayed(true), 6000); // joue au moins 6s

    try {
      const url = resolveQuestJson(domain);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      await Promise.all([pyReadyP, animPlayedP]);

      hideLoader();
      startQuest(data);
    } catch (err) {
      hideLoader();
      console.error(err);
      notebookContainer.innerHTML = `<p class="text-red-600">Erreur de chargement: ${err.message}</p>`;
    }
  });

  // délégation boutons "Continuer" et check MCQ
  notebookContainer?.addEventListener('click', (e) => {
    const nextBtn = e.target.closest('.next-step-btn');
    if (nextBtn) {
      addXP(10);
      nextCell();
      renderNextCell();
      return;
    }
    const checkBtn = e.target.closest('.check-mcq-btn');
    if (checkBtn) {
      const cellWrapper = checkBtn.closest('.quest-cell');
      const idx = Number(cellWrapper?.dataset.cellIndex || '0');
      handleMcqCheck(cellWrapper, questCells[idx]);
    }
  });

  function startQuest(quest) {
    resetProgress();
    questCells = Array.isArray(quest.questCells) ? quest.questCells : [];
    setTotalCells(questCells.length);
    updateProgressBar(0, questCells.length);

    notebookContainer.innerHTML = '';
    renderNextCell();
  }

  function renderNextCell() {
    const idx   = getIndex();
    const total = questCells.length;

    if (idx >= total) {
      updateProgressBar(total, total);
      footer?.classList?.remove('translate-y-full');
      return;
    }

    updateProgressBar(idx, total);

    const cellData = questCells[idx];
    const el = renderCell(cellData, idx);
    notebookContainer.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (cellData.type === 'rapid-mcq') {
      startRapidMcq(el.querySelector('.flip-card'), cellData, () => {});
    }

    if (cellData.type === 'code-py' || cellData.type === 'exercice-py') {
      wirePythonCell(el);
    }
  }

  function wirePythonCell(cellEl) {
    const termRoot = cellEl.querySelector('.terminal-root');
    const { term } = window.createTerminalIn(termRoot);
    const io = createIOForTerminal(term);

    const editorEl = cellEl.querySelector('textarea[data-role="editor"]');
    const initial  = editorEl.value;

    const btnReplay = cellEl.querySelector('.btn-replay');
    const btnRun    = cellEl.querySelector('.btn-run');

    btnReplay?.addEventListener('click', () => {
      editorEl.value = initial;
      term.writeln('\x1b[36m— Code réinitialisé —\x1b[0m');
    });

    btnRun?.addEventListener('click', () => {
      if (!pyWorker) {
        term.writeln('\x1b[31m[erreur] Worker indisponible\x1b[0m');
        return;
      }
      const onMsg = (ev) => {
        const { type, data } = ev.data || {};
        switch (type) {
          case 'stdout': io.writeStdout(data); break;
          case 'stderr': io.writeStderr(data); break;
          case 'input_request': {
            io.flushStdoutPartial();
            io.requestOneLineFromTerminal().then((line) => {
              const enc   = new TextEncoder();
              const bytes = enc.encode(line);
              let len = bytes.length;
              if (len > dataBytes.byteLength) len = dataBytes.byteLength;
              dataBytes.set(bytes.subarray(0, len), 0);
              Atomics.store(ctrl, 0, len);
              Atomics.notify(ctrl, 0, 1);
            });
            break;
          }
          case 'done':
            io.flushStdIO();
            pyWorker.removeEventListener('message', onMsg);
            break;
        }
      };
      pyWorker.addEventListener('message', onMsg);

      term.writeln('\x1b[36m— Exécution —\x1b[0m');
      pyWorker.postMessage({ type: 'run', code: editorEl.value });
    });
  }
});
