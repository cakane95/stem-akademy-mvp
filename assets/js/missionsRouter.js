// assets/js/missionsRouter.js
// Associe un slug de mission au bon JSON (chemins relatifs à la racine)
const BASE = '/data/quests/intro-python';

const MAP = {
  telecoms:   `${BASE}/telecoms.json`,
  finance:    `${BASE}/finance.json`,
  ecommerce:  `${BASE}/ecommerce.json`,
  agriculture:`${BASE}/agriculture.json`,
  sante:      `${BASE}/sante.json`,
};

export function resolveQuestJson(domain) {
  if (domain && MAP[domain]) return MAP[domain];
  // défaut : la démo générique
  return `${BASE}/demo-quest-v1.json`;
}
