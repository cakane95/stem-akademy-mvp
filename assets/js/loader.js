// js/loader.js
//
// API publique :
//   showLoader()               → affiche l’overlay et démarre le gate “animation jouée 6s”
//   markPyReady()              → à appeler quand le worker envoie 'ready'
//   whenBothReadyThenHide()    → Promise qui masque l’overlay quand (6s + pyReady) sont vrais
//
// Hypothèses HTML (quest-player.html) :
//   - overlay : <div id="loader-overlay" class="fixed inset-0 z-50 bg-[#001F3D] flex items-center justify-center transition-opacity duration-300 opacity-100 hidden" data-done="0">
//   - animation : <dotlottie-wc id="loader-anim" ... autoplay loop></dotlottie-wc>
//
// Notes :
//  - On utilise à la fois un timer 6s ET (optionnel) l’événement 'complete' si tu retires "loop".
//  - Le fade-out s’aligne sur `duration-300` (300 ms). Ajuste si tu changes la durée Tailwind.

let _resolvePyReady, _resolveAnimPlayed;
const _pyReadyP = new Promise(res => (_resolvePyReady = res));
const _animPlayedP = new Promise(res => (_resolveAnimPlayed = res));

/** Affiche l’overlay et arme le gate “animation a tourné ≥ 6s”. */
export function showLoader() {
  const overlay = document.getElementById('loader-overlay');
  if (!overlay) return;

  // reset state
  overlay.dataset.done = '0';
  overlay.classList.remove('hidden', 'opacity-0');
  overlay.classList.add('opacity-100');

  // Gate #1 : 6 secondes mini d’animation
  // (on garde aussi un listener 'complete' si jamais tu enlèves loop)
  const anim = document.getElementById('loader-anim');
  let animResolved = false;

  const resolveAnimSafely = () => {
    if (!animResolved) {
      animResolved = true;
      _resolveAnimPlayed(true);
    }
  };

  // Timer "au moins 6s"
  setTimeout(resolveAnimSafely, 6000);

  // Si tu retires 'loop' sur <dotlottie-wc>, ce complete sera utile (sinon il ne se déclenche pas)
  if (anim) {
    anim.addEventListener('complete', resolveAnimSafely, { once: true });
  }
}

/** À appeler quand le worker envoie 'ready' (Pyodide chargé). */
export function markPyReady() {
  _resolvePyReady(true);
}

/** Masque l’overlay une seule fois (avec fade-out). */
function _hideLoaderOnce() {
  const overlay = document.getElementById('loader-overlay');
  if (!overlay) return;
  if (overlay.dataset.done === '1') return; // déjà masqué
  overlay.dataset.done = '1';

  // Tenter d’arrêter l’anim (si dispo)
  try {
    document.getElementById('loader-anim')?.stop?.();
  } catch {}

  // Fade-out (doit matcher duration-300)
  overlay.classList.remove('opacity-100');
  overlay.classList.add('opacity-0');

  // Retrait visuel complet après la transition
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
}

/**
 * Renvoie une Promise qui masque l’overlay quand les DEUX conditions sont vraies :
 *  1) Pyodide prêt  (markPyReady())
 *  2) Animation 6s jouée (showLoader() → timer)
 */
export function whenBothReadyThenHide() {
  return Promise.all([_pyReadyP, _animPlayedP]).then(_hideLoaderOnce);
}

/* Optionnel : helper combiné si tu préfères un one-liner côté main
export function runLoaderLifecycleUntilReady(markReadyPromise) {
  showLoader();
  return Promise.all([markReadyPromise, _animPlayedP]).then(_hideLoaderOnce);
}
*/
