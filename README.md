# STEM AKADEMY - Cahier des Charges du MVP

> **Version :** 1.5
> **Slogan :** Apprendre autrement. Réussir durablement.

Ce document sert de cahier des charges (Product Requirements Document) pour le développement de la première version (MVP) de la plateforme d'apprentissage STEM AKADEMY.

---

## 1. Vision du Produit

**STEM AKADEMY** est une plateforme EdTech conçue pour enseigner les compétences technologiques (Python, IA, Machine Learning) de manière intuitive, pratique et culturellement pertinente. L'objectif est de valider une approche pédagogique innovante via un **notebook interactif ("Quest Notebook")** qui fonctionne entièrement dans le navigateur, sans aucune installation requise.

Notre philosophie, l'**"Approche du Baobab"**, privilégie l'intuition avant la théorie, et la théorie avant l'application, pour construire des compétences solides et pérennes.

---

## 2. Architecture & Technologies

Le projet est conçu pour être **100% "serverless"**, évolutif et facile à maintenir.

| Catégorie | Technologie | Rôle |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Tailwind CSS, JavaScript (ES6+) | Structure, style et interactivité de l'interface utilisateur. |
| **Exécution Python** | Pyodide | Exécution de code Python côté client, dans un **Web Worker** pour ne pas geler l'interface. |
| **IA (Chatbot)** | API Google Gemini (Flash/Pro) | Génération de réponses pour le tuteur IA, en utilisant le niveau gratuit. |
| **Hébergement** | Netlify | Déploiement et hébergement des fichiers statiques. |
| **Domaine** | Squarespace | Gestion du nom de domaine `stemakademy.com`. |
| **Identité Visuelle**| **Police :** Inter & Playfair Display. **Couleurs :** `brand-dark-blue` (#001F3D), `brand-blue` (#005EA0), `brand-orange` (#E87A00), `brand-light-blue` (#DBF0FF), `brand-peach` (#F8DCBF). |

---

## 3. Structure du Projet

L'arborescence des fichiers est conçue pour séparer le contenu, la logique et la présentation.

```
/
├── .gitignore
├── index.html             // Page d'accueil
├── parcours.html          // Page listant tous les parcours
├── quest-player.html      // Le "lecteur" de quête universel
├── LICENSE                // Licence propriétaire (Copyright)
├── README.md              // Ce document
│
├── assets/
│   └── js/
│       ├── quest-player.js  // Logique principale de l'interface du notebook
│       └── pyodide-worker.js// Code pour Pyodide, exécuté en arrière-plan
│
└── data/
    ├── corpus_senegal.txt   // Contexte culturel pour le chatbot RAG
    ├── parcours.json        // Décrit la structure des cours
    └── quests/
        └── intro-python/
            └── demo-quest-v1.json // Le contenu de la première quête
```

---

## 4. Spécifications Fonctionnelles

### 4.1. Page d'Accueil (`index.html`)

Page de présentation statique conçue avec Tailwind CSS. Elle doit être entièrement responsive.

* **Header :** Fixe, avec logo et bouton "Lancer la démo".
* **Section Héros :** Titre principal et slogan.
* **Section Cours :** Grille de 3 cartes présentant les cours et leurs projets, avec une étiquette "Bientôt".
* **Section Démo :** Appel à l'action "Je me lance !".
* **Section Masterclasses :** Met en avant le support en groupe.
* **Section Approche du Baobab :** Explique la philosophie pédagogique.
* **Section Liste d'attente :** Formulaire Netlify pour capturer les prospects (Nom, Email, Rôle).

### 4.2. Notebook de Quête (`quest-player.html`)

C'est l'environnement d'apprentissage interactif.

* **Architecture Non-Bloquante :** Toutes les opérations Pyodide s'exécutent dans un **Web Worker** pour garantir une interface fluide. La communication se fait par messages (`postMessage`/`onmessage`).
* **Affichage Progressif :** Les cellules de la quête apparaissent une par une au fur et à mesure de la complétion, pour une expérience focalisée.
* **Terminal Interactif :** Une zone `<pre>` affiche en temps réel la sortie de `print()` et les erreurs (`stderr`) grâce à la redirection de `sys.stdout` et `sys.stderr`.
* **`input()` Transparent :** L'utilisateur peut écrire `input()` sans `await`. Un champ de saisie HTML apparaît dynamiquement dans le terminal. L'exécution est gérée par `pyodide.code.eval_code()` pour un "top-level await" transparent.

### 4.3. Types de Cellules de Quête (`Quest Cells`)

Le contenu de chaque quête est défini dans un fichier JSON. Chaque cellule est un objet avec un `type` spécifique.

| Type de Cellule | Description | Objectif Pédagogique |
| :--- | :--- | :--- |
| **`markdown`** | Affiche du contenu textuel formaté pour les explications et instructions. | Compréhension |
| **`code-py`** | Cellule de démonstration avec un script complet et fonctionnel. | Observation |
| **`exercice-py`** | Cellule de pratique où l'étudiant doit modifier ou écrire du code pour résoudre un problème. | Application |
| **`mcq`** | Question à choix multiples simple pour valider un concept. | Validation |
| **`rapid-mcq`** | Quiz rapide avec un temps imparti pour tester les réflexes et la mémorisation. | Rétention |

### 4.4. Tuteur IA "Bideew"

* **Interface :** Un chatbot flottant, responsive (plein écran sur mobile, fenêtre sur desktop).
* **Message d'accueil :** Doit jouer sur le nom "Bideew" (étoile en wolof). Ex: *"Bonjour ! Je suis Bideew, votre étoile guide. Un concept vous semble flou ? Demandez-moi de l'éclairer."*
* **Logique RAG (Retrieval-Augmented Generation) :**
    * **Contexte :** Le chatbot ne répond qu'en se basant sur le contenu de la leçon actuelle et un fichier `corpus_senegal.txt`.
    * **Règles (Prompt Engineering) :**
        1.  **Ancrage Strict :** Ne jamais utiliser de connaissances externes.
        2.  **Refus Poli :** Refuser de répondre aux questions hors sujet.
        3.  **Pseudo-code Uniquement :** Ne jamais générer de code Python fonctionnel, seulement des explications et du pseudo-code.
* **Contrôle des Coûts :** Une limitation de débit côté client sera implémentée pour rester dans le quota gratuit de l'API Gemini.

---

## 5. Stratégie SEO

* **Technique :** Utiliser des balises meta, du HTML sémantique, des attributs `alt` et optimiser les performances.
* **Contenu :** Intégrer des mots-clés pertinents et localisés ("apprendre Python Sénégal", "cours IA Dakar").
* **Off-Page :** Créer une fiche Google My Business et partager sur les réseaux sociaux.
