# Journal de trading — instructions projet

Site statique (un seul `index.html` + `rules.html` + `sessions/*.html`),
publié sur GitHub Pages (`scaryseb-afk.github.io/journal-trading`) depuis
la branche `main`. Pas de build : ce qui est commité est ce qui est publié.

## Design / cohérence

`index.html` et `rules.html` partagent la même palette de couleurs (mêmes
variables CSS : `--bg`, `--panel`/`--surface`, `--line`/`--border`, `--txt`,
`--muted`, `--red`, `--gold`/`--amber`, `--green`), la même police système
(pas de police externe), et la même barre de navigation en haut de page.
Toute nouvelle page doit reprendre ces mêmes tokens plutôt que d'introduire
sa propre palette.

## Données CSV — voir [csv/README.md](csv/README.md)

Quand l'utilisateur envoie des exports Tradovate (CSV), toujours :
1. Sauvegarder le fichier brut dans `csv/AAAA-MM-JJ/` avant tout calcul.
2. Recalculer les chiffres affichés (win rate, R:R, nombre de trades, taille
   des lots...) depuis ce fichier plutôt que depuis un résumé déjà écrit
   ailleurs dans le journal.
3. Committer le CSV en même temps que la mise à jour HTML.
4. Signaler à l'utilisateur toute incohérence détectée (ex. nombre de trades
   ou de lots qui semble anormal) plutôt que de la lisser silencieusement.

## Pages de session (`sessions/*.html`)

Nouvelle session → partir de [sessions/_template.html](sessions/_template.html), jamais
d'un ancien fichier copié-collé. Le template s'appuie sur `_systeme/style.css`
et `_systeme/session.js` (logique partagée : captures d'écran, notes par
trade, relecture) — ne pas dupliquer ce CSS/JS dans le fichier de session.

- Captures d'écran : redimensionnées et compressées côté navigateur avant
  stockage (voir `SJ_IMG_MAX_WIDTH`/`SJ_IMG_QUALITY` dans `session.js`) pour
  éviter de saturer le quota localStorage. Stockage 100% local au navigateur
  — invisible pour Claude, donc ne pas s'appuyer dessus pour les calculs.
- Relecture ("Erreur commise" / "Ce que j'aurais dû faire" / "Ce qui a bien
  fonctionné") : à remplir par Sébastien après la séance, bouton "Copier
  pour Claude" pour recopier ces notes dans le chat — c'est comme ça
  qu'elles remontent jusqu'à la session suivante et nourrissent le Brief
  séance. Sans ce copier-coller, Claude ne les voit jamais (localStorage
  n'est lisible que dans le navigateur de l'utilisateur).
- Import CSV (bloc "📤 Importer un CSV") : calcule tout dans le navigateur
  dès qu'un export Tradovate est déposé — compte détecté via
  `SJ_ACCOUNT_PREFIXES` dans `session.js` (8 premiers chiffres du
  `buyFillId`, mêmes plages que `csv/README.md`), P&L, dédoublonnage exact.
  Le R:R ne peut pas être déduit du CSV (Tradovate n'exporte ni stop ni
  objectif) — l'utilisateur les saisit dans les champs à côté de chaque
  trade, le R:R se recalcule alors tout seul. **100% local au navigateur**,
  ne modifie jamais `index.html`/la page de session tant que Claude n'a pas
  relu et validé — ne pas considérer ce contenu comme publié.

## Avant de commiter/pousser

Les changements sur `index.html`/`rules.html` sont visibles immédiatement
en local, mais ne sont publiés sur le site en ligne qu'après
`git commit` + `git push`. Toujours confirmer avec l'utilisateur avant de
pousser (ça republie le site immédiatement).
