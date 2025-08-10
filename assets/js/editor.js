// js/editor.js
//
// Gestion de l'éditeur de code (Monaco ou CodeMirror)
// - initEditor(initialCode) : crée l'éditeur et injecte le code initial
// - getEditorValue()        : récupère le code courant
// - setEditorValue(code)    : met à jour le contenu
// - focusEditor()           : met le curseur dans l'éditeur
//
// Dépend de : state.js

import { state } from './state.js';

/**
 * Initialise l'éditeur pour un questcell
 * @param {string} initialCode - Code Python initial
 * @param {HTMLElement|string} mountTarget - Élément DOM ou ID où monter l'éditeur
 */
export async function initEditor(initialCode = '', mountTarget = 'editor-container') {
  let containerEl = null;
  if (typeof mountTarget === 'string') {
    containerEl = document.getElementById(mountTarget);
  } else {
    containerEl = mountTarget;
  }
  if (!containerEl) {
    console.error('[editor] mount target not found:', mountTarget);
    return;
  }

  // Nettoyage éventuel
  containerEl.innerHTML = '';

  // Ici on peut choisir Monaco, CodeMirror, Ace, etc.
  // Par défaut : Monaco Editor via CDN
  if (!window.monaco) {
    await loadMonacoFromCDN();
  }

  const editor = monaco.editor.create(containerEl, {
    value: initialCode || '',
    language: 'python',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    scrollBeyondLastLine: false,
    tabSize: 4,
  });

  state.editor = editor;
  state.getEditorCode = () => editor.getValue();
  state.setEditorCode = (code) => editor.setValue(code ?? '');
  state.focusEditor   = () => editor.focus();
}

/** Récupère le code actuel de l'éditeur */
export function getEditorValue() {
  return state.editor?.getValue?.() ?? '';
}

/** Définit le code dans l'éditeur */
export function setEditorValue(code) {
  if (state.editor?.setValue) {
    state.editor.setValue(code ?? '');
  }
}

/** Met le focus dans l'éditeur */
export function focusEditor() {
  state.editor?.focus?.();
}

/* ----------------------------- Loader Monaco ----------------------------- */
async function loadMonacoFromCDN() {
  return new Promise((resolve, reject) => {
    if (window.monaco) {
      resolve();
      return;
    }

    const monacoLoader = document.createElement('script');
    monacoLoader.src =
      'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js';
    monacoLoader.onload = () => {
      require.config({
        paths: {
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs',
        },
      });
      require(['vs/editor/editor.main'], () => {
        resolve();
      });
    };
    monacoLoader.onerror = (err) => reject(err);
    document.head.appendChild(monacoLoader);
  });
}
