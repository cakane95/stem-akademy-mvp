// js/state.js
//
// Ce module contient l'état global de l'application
// Importé partout avec :
//   import { state } from './state.js';
//
// Évite de polluer le scope global avec des variables séparées.

export const state = {
    // --- QuestCell courante ---
    questcell: null,              // données du JSON (titre, description, initialCode, etc.)
    questCells: [],               // tableau complet si besoin
    currentCellIndex: 0,          // index dans le tableau
    activeDomain: localStorage.getItem('last-domain') || null, //domaine choisi (telecoms, finance)
  
    // --- Terminal / xterm.js ---
    term: null,                   // instance Terminal
    fit: null,                    // instance FitAddon
    inputBuffer: '',              // texte tapé par l’utilisateur (non envoyé)
    isCapturingInput: false,      // true pendant un input() Python bloquant
    currentCaptureDisposable: null,
  
    // --- Éditeur ---
    editor: null,                 // instance CodeMirror (ou Monaco si évolue)
    editorContent: '',            // contenu courant du code dans l'éditeur
  
    // --- Pyodide Worker ---
    pyodideWorker: null,          // instance Web Worker
    pyodideWorkerReady: false,    // true quand 'ready' reçu
    pyodideStdinCtrl: null,       // vue Int32Array sur sabCtrl
    pyodideStdinData: null,       // vue Uint8Array sur sabData
  
    // --- SAB bruts (facultatif si tu veux les stocker aussi) ---
    sabCtrl: null,                // SharedArrayBuffer pour ctrl
    sabData: null,                // SharedArrayBuffer pour data
  
    // --- Flags UI ---
    isRunningCode: false,         // true si exécution en cours
    loaderVisible: false,         // true si overlay affiché
    buttonsDisabled: false,       // pour désactiver exécuter/stop en cours
  };
  