// assets/js/quest-python.js
// Gestion du runtime Python (Pyodide) + intégration terminal par cellule

//import { createTerminalIn } from './terminal.js';
import { createIOForTerminal } from './termHelpers.js';

/* -------------------------------------------------------------------------- */
/*                ÉTAT GLOBAL PARTAGÉ ENTRE TOUTES LES CELLULES               */
/* -------------------------------------------------------------------------- */
let pyWorker = null;
let resolvePyReady;
export const pyReadyP = new Promise(res => (resolvePyReady = res));

// SAB (SharedArrayBuffer) pour stdin bloquant
const INPUT_CAP = 4096;
let sabCtrl, sabData, ctrl, dataBytes;

/* -------------------------------------------------------------------------- */
/*                   LANCEMENT PYODIDE EN ARRIÈRE-PLAN                        */
/* -------------------------------------------------------------------------- */
export function bootPyodideInBackground() {
  if (pyWorker) return; // déjà lancé

  pyWorker = new Worker('.assets/js/workers/py-worker.js');

  pyWorker.onmessage = (ev) => {
    const { type } = ev.data || {};
    if (type === 'ready') {
      resolvePyReady(true); // Pyodide prêt
    }
  };

  pyWorker.onerror = (e) => {
    console.error('[py-worker error]', e.message || e);
    // Débloquer pour éviter blocage UI
    resolvePyReady(true);
  };

  // Prépare SAB (stdin)
  sabCtrl = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  sabData = new SharedArrayBuffer(INPUT_CAP);
  ctrl = new Int32Array(sabCtrl);
  dataBytes = new Uint8Array(sabData);
  Atomics.store(ctrl, 0, -1); // -1 = attente

  // Envoie SAB au worker une seule fois
  pyWorker.postMessage({ type: 'setup_stdin', sabCtrl, sabData });

  // Lance le chargement de Pyodide
  pyWorker.postMessage({ type: 'init' });
}

/* -------------------------------------------------------------------------- */
/*       BRANCHEMENT TERMINAL + LOGIQUE EXECUTION POUR UNE CELLULE PYTHON      */
/* -------------------------------------------------------------------------- */
export function attachPythonRuntimeIfNeeded(cellEl, cellData) {
  if (cellData.type !== 'code-py' && cellData.type !== 'exercice-py') return;

  // 1) Installe le terminal
  const termRoot = cellEl.querySelector('.terminal-root');
  const { term } = window.createTerminalIn(termRoot); // initTerminal() en interne
  const io = createIOForTerminal(term);

  // 2) Récupère l’éditeur (textarea simple pour cette phase)
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

    // 3) Router TEMPORAIREMENT les messages du worker vers CETTE cellule
    const onMsg = (ev) => {
      const { type, data } = ev.data || {};
      switch (type) {
        case 'stdout':
          io.writeStdout(data);
          break;
        case 'stderr':
          io.writeStderr(data);
          break;
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
        case 'done': {
          io.flushStdIO();
          pyWorker.removeEventListener('message', onMsg);
          break;
        }
      }
    };

    pyWorker.addEventListener('message', onMsg);

    // 4) Lancer l’exécution
    term.writeln('\x1b[36m— Exécution —\x1b[0m');
    pyWorker.postMessage({ type: 'run', code: editorEl.value });
  });
}
