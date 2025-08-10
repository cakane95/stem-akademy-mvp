// js/workers/py-worker.js
// Contexte Python PERSISTANT entre cellules d'une même quête
// - init       : charge Pyodide + branche fake I/O
// - setup_stdin: reçoit les SAB pour input() bloquant
// - run        : exécute du Python dans le même globals (persistance)
// - reset      : recrée un globals propre (bouton “Réinitialiser Python”)

const PYODIDE_VERSION = 'v0.28.1';
importScripts(`https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`);

let py = null;                  // Instance Pyodide
let pyodideReady = null;        // Promise de readiness
let globalScope = null;         // dict Python (PyProxy) partagé entre runs

// stdin via SharedArrayBuffer
let ctrl = null;                // Int32Array view (index 0 = longueur, -1 = attente)
let dataBytes = null;           // Uint8Array view (octets UTF-8)

const textDec = new TextDecoder('utf-8');

/* -------------------------- Gestion du contexte Python -------------------------- */
function destroyGlobalScope() {
  if (globalScope && typeof globalScope.destroy === 'function') {
    try { globalScope.destroy(); } catch {}
  }
  globalScope = null;
}

function createGlobalScope() {
  destroyGlobalScope();
  globalScope = py.globals.get("dict")();   // nouveau dict()
  globalScope.set("__name__", "__main__");
  globalScope.set("__package__", null);

  const builtins = py.globals.get("__builtins__");
  globalScope.set("__builtins__", builtins);
  if (typeof builtins.destroy === 'function') builtins.destroy();
}

/* -------------------------- Initialisation de Pyodide --------------------------- */
async function initPyodideAndIO() {
  if (pyodideReady) return pyodideReady;

  pyodideReady = (async () => {
    postMessage({ type: 'stdout', data: 'Chargement de Pyodide...\n' });

    py = await loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`,
    });

    // Crée le contexte global persistant
    createGlobalScope();

    // Redirection I/O vers le thread principal
    const jsStdout = {
      write: (s) => {
        postMessage({ type: 'stdout', data: String(s) });
        return s?.length ?? 0;
      },
      flush: () => {}
    };
    const jsStderr = {
      write: (s) => {
        postMessage({ type: 'stderr', data: String(s) });
        return s?.length ?? 0;
      },
      flush: () => {}
    };
    const jsStdin = {
      readline: () => {
        if (!ctrl || !dataBytes) {
          postMessage({ type: 'stderr', data: '[stdin] buffers non initialisés\n' });
          return '\n';
        }
        postMessage({ type: 'input_request' });

        // Bloque jusqu'à ce que le main remplisse dataBytes et notifie
        Atomics.store(ctrl, 0, -1);
        Atomics.wait(ctrl, 0, -1);

        const n = Atomics.load(ctrl, 0);
        if (n <= 0) {
          Atomics.store(ctrl, 0, -1);
          return '\n';
        }
        const tmp = new Uint8Array(n);
        tmp.set(dataBytes.subarray(0, n));

        let line = '';
        try {
          line = textDec.decode(tmp);
        } catch (e) {
          postMessage({ type: 'stderr', data: `[stdin] decode error: ${e}\n` });
        }
        if (!line.endsWith('\n')) line += '\n';
        Atomics.store(ctrl, 0, -1);
        return line;
      }
    };

    // Expose les streams dans un module JS côté Python
    py.registerJsModule('fakeio', {
      stdout: jsStdout,
      stderr: jsStderr,
      stdin:  jsStdin
    });

    // Bascule sys.std* vers fakeio (une seule fois)
    await py.runPythonAsync(`
import sys, fakeio
sys.stdout = fakeio.stdout
sys.stderr = fakeio.stderr
sys.stdin  = type('R', (), {'readline': fakeio.stdin.readline})()
    `.trim());

    return true;
  })();

  return pyodideReady;
}

/* -------------------------- Gestion des messages -------------------------- */
onmessage = async (event) => {
  const { type, code, sabCtrl, sabData } = event.data || {};

  if (type === 'init') {
    await initPyodideAndIO();
    postMessage({ type: 'ready' });
    return;
  }

  if (type === 'setup_stdin') {
    ctrl = new Int32Array(sabCtrl);
    dataBytes = new Uint8Array(sabData);
    postMessage({ type: 'stdout', data: '[stdin] buffers reçus\n' });
    return;
  }

  if (type === 'run') {
    try {
      await initPyodideAndIO();
      if (!globalScope) createGlobalScope();

      await py.runPythonAsync(code, { globals: globalScope });
    } catch (err) {
      postMessage({ type: 'stderr', data: String(err) + '\n' });
    } finally {
      postMessage({ type: 'done' });
    }
    return;
  }

  if (type === 'reset') {
    try {
      await initPyodideAndIO();
      createGlobalScope();
      await py.runPythonAsync('import gc; gc.collect()', { globals: globalScope });
      postMessage({ type: 'stdout', data: '[kernel] Contexte Python réinitialisé.\n' });
      postMessage({ type: 'reset_ok' });
    } catch (e) {
      postMessage({ type: 'stderr', data: `[reset] ${String(e)}\n` });
    }
    return;
  }
};
