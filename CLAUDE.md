# Journal de trading — instructions projet

Site statique (un seul `index.html` + `sessions/*.html`), publié sur
GitHub Pages (`scaryseb-afk.github.io/journal-trading`) depuis la branche
`main`. Pas de build : ce qui est commité est ce qui est publié.

`index.html` regroupe Tableau de bord, Avant la séance (anciennement « Brief séance » ; id `#brief`), Analyses économiques
(contexte macro US/zone euro — CPI, Fed, NFP, PMI — et biais de marché sur
or/pétrole/EUR-USD, rédigés par Claude à partir de données publiques, à
rafraîchir sur demande ; a remplacé le Brouillon/« Plan du jour » le 01/10/2026),
Sessions et Règles dans une seule page
(`data-goto`/`.view` — pas de rechargement, l'onglet actif est dans le hash :
`#brief`, `#sessions`…). Le menu est une bannière fixe à gauche dès 960 px
(barre du haut en dessous), thème en bas du menu. Sur grand écran, les
sous-onglets du Tableau de bord et du Brief (`.subnav`/`.sn-btn`) sont
reproduits en sous-entrées du menu sous l'onglet actif (générées depuis
`.sn-btn` : un nouveau `.sn-btn` apparaît tout seul ; le premier, marqué
`data-nosidebar`, n'est pas répété : le lien parent du menu ouvre cette
sous-page) et la barre dans la page est masquée. Les quatre sous-menus (Tableau
de bord, Avant la séance, Analyses éco, Règles) restent toujours dépliés dans le menu, quel que soit
l'onglet actif — cliquer une sous-entrée ouvre d'abord son onglet parent puis la sous-page (`.nav-sub{display:flex}` inconditionnel dès 960px) — seul le
sous-élément survolé/actif est mis en évidence. Chaque entrée du menu (site et
pages de séance, `SJ_NAV` dans `session.js`) porte un emoji devant son nom. Chaque sous-page du Tableau de bord a son propre titre ; l'en-tête
et les widgets du haut (score de confluence, respect du plan, cartes) ne sont que
sur « Vue d'ensemble ». Juste en dessous du sous-titre, une bannière du jour (`#day-banner`) tire un message parmi 30 (bonne séance) / 30 (séance difficile) — sens et message tirés du P&L du jour dans `window.SESSIONS`, ou à défaut du compteur live `daytrack_AAAA-MM-JJ` (boutons +Gagnant/+Perdant/+Neutre de l'onglet Règles) ; sans donnée pour aujourd'hui, elle reste neutre. Un seul message par jour (index déterministe sur la date), pour rester stable au fil des visites. Les pages de séance
injectent le même menu (`.side-nav`, dans `session.js`) et partagent le thème
(`journal-theme`). Adaptations iOS/Safari mobile : meta
`apple-mobile-web-app-*` + `apple-touch-icon.png` (icône générée avec
`_systeme/` — à refaire avec le même script si la palette change), champs de
saisie forcés à 16px sous 700px (sinon Safari zoome au focus), marges
`env(safe-area-inset-*)` (encoche, barre gestuelle) sur `.nav`/`.side-nav`/
`.wrap`, `-webkit-tap-highlight-color:transparent` sur liens/boutons.
Les règles avaient leur propre fichier (`rules.html`) jusqu'au 23/09/2026 ;
tout son contenu et sa logique (score de confluence, checklist, trades du
jour, score de discipline, violations, streak, pause) vivent maintenant
dans `#view-regles`, découpé le 06/10/2026 en 5 sous-pages (`#regles-subnav`) : Outils du jour (trades du jour,
pause, score de confluence, calculette, checklist, types d'ordres) · Bilan & discipline (statistiques, streak,
objectif 50 %, discipline du soir, violations, infractions) · Règles communes (1 à 8) · Stratégie V2 iFVG M5
(règles V2.1 à V2.7 — numérotation propre à la stratégie, voulue par Sébastien le 07/10 : on ne continue pas à numéroter 12, 13… après les communes 1 à 8 ; une règle V2 se cite « règle V2.4 », plan type, repère timeframes) · Stratégie V1 (celle de Matthis ; la V2 est celle de Daxton, « je crois », Sébastien, 08/10). Pas de stratégie CL : Sébastien n'en veut pas
(le bloc « CL — plan séparé », M15 / fade du sweep, a été retiré le 06/10 ; il reste dans l'historique git, présent
jusqu'au commit `c0b3772`). L'onglet Règles porte aussi une « Calculette de lots — MNQ » (budget 250 / 300 / 500 $
en menu déroulant + stop en ticks → contrats = ⌊budget ÷ (ticks × 0,50 $)⌋, plafonné à
4 contrats par trade comme le plan (sauf en octobre 2026 : plafond levé par Sébastien le 08/10, la calculette ne plafonne plus ce mois-là — à rétablir en novembre), avec alerte V2 dès 400 ticks) ; le budget par défaut suit
le même barème par date que le KPI « Règle de séance » (à modifier aux deux endroits).
Le score de confluence existe en deux affichages
(widget compact du Dashboard + carte complète de l'onglet Règles) qui
partagent un seul état JS (`confluenceState`/`confluenceSet`/
`confluenceRender`) et la même clé localStorage (`trading_score`) — les
deux se mettent à jour en direct, sans rechargement.

## Design / cohérence

Une seule palette pour tout le site (`index.html` et `_systeme/style.css`) :
gris neutres, le rouge/vert du P&L (`--red`, `--green`) pour les résultats, et
un unique accent **bleu acier** (`--accent` : `#6B91C7` en nuit, `#335E99` en
jour ; texte dessus : `--on-accent`) pour les éléments actifs, liens, focus et
libellés — jamais sur un chiffre de résultat. `--gold` et `--blue` en sont de
simples alias. Pas de jaune/beige/orange/violet décoratif. Toute nouvelle
page/section doit reprendre ces tokens plutôt que d'introduire sa propre
palette, et jamais de couleur codée en dur pour un texte posé sur un fond
`--accent`.

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

- « Ce que j'aurais dû faire » : à côté de la capture de chaque trade (2 colonnes), une
  seconde zone avec capture + petite remarque (clés `imgs_<séance>__<compte>_<n>:fix` et
  `<compte>_<n>:fix`), ouverte d'office sur les trades perdants, derrière un bouton
  « ＋ Ce que j'aurais dû faire » pour les autres ; la remarque suit « Copier ce trade ». Deux colonnes
  identiques (zones de dépôt alignées), remarque pleine largeur dessous ; Ctrl+V colle dans la colonne
  survolée (elle est entourée) ; au survol d'une capture, l'aperçu montre les deux côte à côte
  (« ce qui s'est passé » à gauche, « ce que j'aurais dû faire » à droite).
- Captures d'écran : une seule zone, sous chaque trade
  (`imgs_<séance>__<compte>_<n>`, glisser/cliquer/Ctrl+V en survolant la
  ligne) — pas de zone générale au niveau de la séance (retirée le 28/09,
  redondante avec les zones par trade). Redimensionnées et compressées côté
  navigateur avant stockage (voir `SJ_IMG_MAX_WIDTH`/`SJ_IMG_QUALITY` dans
  `session.js`) pour éviter de saturer le quota localStorage. Stockage 100%
  local au navigateur — invisible pour Claude, donc ne pas s'appuyer dessus
  pour les calculs.
- Relecture ("Erreur commise" / "Ce que j'aurais dû faire" / "Ce qui a bien
  fonctionné") : à remplir par Sébastien après la séance, bouton "Copier
  pour Claude" pour recopier ces notes dans le chat — c'est comme ça
  qu'elles remontent jusqu'à la session suivante et nourrissent le Brief
  séance. Sans ce copier-coller, Claude ne les voit jamais (localStorage
  n'est lisible que dans le navigateur de l'utilisateur).
- Chaque séance ajoutée dans `window.SESSIONS` (index.html) porte `planOk`
  (true/false : ≤ 3 trades/jour, ≤ 4 contrats par trade, aucun trade après 2
  pertes ; le plafond de 4 contrats est levé pour octobre 2026 — décision de Sébastien le 08/10, à rétablir en novembre sauf avis contraire : plus évalué dans planOk/planWhy depuis le 01/10) et, si false, `planWhy` (raison courte) : le bandeau « Respect du
  plan » du tableau de bord se calcule tout seul depuis ces deux champs.
- À chaque séance ajoutée, lancer `node csv/calc-semaine.js` et recopier la
  ligne `rt:[trades, ré-entrées, P&L des ré-entrées]` du jour dans
  `window.SESSIONS` : la page « Progression » (semaine après semaine) en dépend.
- Trades dus à un bug de plateforme (signalés par Sébastien) : on ne supprime JAMAIS la ligne du CSV (trace,
  et le solde du compte les inclut) — on liste ses fill IDs dans `csv/exclus.json` ; les trois scripts
  (`calc-semaine`, `calc-instruments`, `calc-comptes`) les ignorent, donc ni trades, ni win rate, ni ré-entrées,
  ni plan, ni instruments, ni R. Dans la page de séance, la ligne est affichée en grisé (`bug:true`) sans zone de
  note, et le total précise « hors bug ». Premier cas : 13 allers-retours de 1 à 2 secondes sur le 001 le 05/10 (2 signalés par Sébastien, 11 de même signature rangés avec — « ne prends pas en compte les trades comme les deux derniers » ; à retirer d'`exclus.json` s'il dit que ce n'est pas un bug). Un vrai trade (22 min) du même compte le même soir reste compté.
- À chaque séance ajoutée, relancer aussi `node csv/calc-instruments.js` et
  remplacer la ligne `window.PAR_INSTRUMENT = {...}` d'`index.html` : la
  sous-page « Par instrument » du Tableau de bord (MNQ / or / pétrole / euro :
  P&L, win rate, moyenne par signal, pire trade — plus le comparatif Long / Short, global et par instrument) et ses phrases de synthèse en
  dépendent. Même total que les autres cartes (−7 224,25 $ / 186 signaux au 01/10).
- À chaque séance ajoutée, relancer aussi `node csv/calc-comptes.js` et remplacer la
  ligne `window.PAR_COMPTE = {...}` d'`index.html` : la table « R & % par compte »
  (Tableau de bord → Comptes & Analyse) en dépend. 1 R = le budget de risque du jour
  (`window.budgetOf`, défini dans le script Progression : ≈ 275 $ en septembre, 300 $
  jusqu'au 04/10, 500 $ dès le 05/10 ; août = pas de budget, donc hors R) — ce n'est
  pas le R réel de chaque trade, aucun stop n'étant enregistré. Les % viennent des
  soldes de `window.COMPTES` ; un écart avec le P&L des CSV est signalé (≠), pas lissé.
- Règles → « Objectif : 50 % de trades gagnants » : calculée dans la page depuis `window.PAR_INSTRUMENT`
  (gagnants, signaux, gain/perte moyens) — rien à recopier à la main ; elle suit `calc-instruments.js`.
- Tableau de bord → « Net P&L » = résultat des **comptes actifs** (règle de Sébastien, 08/10 : « quand un compte est cramé, ne le compte plus » ; ex. 4 comptes à 49 K, 51 K, 50 K et 52 K = +2 K sur 200 K de base) : Σ(solde − départ) des comptes de `window.COMPTES` qui ne sont ni cramés (`breached`), ni clos (`clos: true` : le 005, absent de la page Lucid du 30/09), ni sous leur seuil d'après le calcul (buffer ≤ 0 : le 003, « sûrement mort » selon Sébastien le 08/10), ni sans relevé depuis plus de 7 jours (sauf `actif: true` : le 005b, identifié vivant sur la page Lucid du 30/09). Objectif = **+3 000 $ par compte actif** (12 000 $ pour 4 comptes) ; à **−2 000 $ par compte, le compte est perdu** (seuil de 48 000 $ au départ) — règles de Sébastien du 08/10, calculées dans la page. Calculé dans la page (`window.netActifs()`), repris par la carte Net P&L, le KPI « Résultat des comptes actifs », l'objectif +12 000 $, « Total PnL » et la ligne « Comptes actifs » de la table R & %. À chaque séance, mettre à jour `solde`/`soldeDate`/`buffer` des comptes concernés dans `COMPTES` (dernière page Lucid collée : 08/10 au soir, pour 001, 003, 004b, 02b et 005b ; le A n'est pas sur Lucid, son solde est calculé depuis les CSV ; Lucid est ~30 $ sous le calcul CSV par compte actif : frais). Le 003 est breaché (Lucid, 08/10). Les stats de trades (win rate, profit factor, espérance, Par instrument) restent sur tous les signaux, comptes cramés compris.
- Tableau de bord → « Économie & risque » (💶) : espérance par signal et par groupe (instrument, Long/Short), buffers des comptes en budgets de risque et en pertes moyennes, risque simultané (perte du budget sur tous les comptes actifs + pires jours multi-comptes). Tout est calculé dans la page depuis `window.PAR_INSTRUMENT`, `window.COMPTES` (soldes/seuils), `window.PAR_COMPTE` et `window.budgetOf` — rien à recopier ; le budget affiché est celui du jour (500 $ dès le 05/10). Bloc « Coût des comptes » : 100 $ par compte (indiqué par Sébastien le 08/10) × 10 comptes Lucid achetés (001, 002, 003, 004a, 004b, 005, 005b, 006, 02b, A ; TopstepX hors calcul) — resets, activation, payouts et règles Lucid pas renseignés, donc pas de ROI ni de taux de réussite des évaluations.
- Avant la séance → Checklist : carte « Note du jour » (ressenti avant de trader).
  Saisie locale au navigateur (`daynote_AAAA-MM-JJ`) ; « Copier pour Claude »
  la remonte dans le chat, et Claude l'inscrit dans `window.DAY_NOTES`
  (`index.html`, clé `AAAA-MM-JJ`, `m` = bien | neutre | pas-bien) pour qu'elle
  soit rapprochée du P&L du jour. Sans ce copier-coller, Claude ne la voit pas.
- Pas d'import CSV dans les pages : c'est Claude qui crée la page de séance
  à partir des exports que l'utilisateur envoie dans le chat.
- Stop / objectif / R:R par trade : Tradovate n'exporte ni stop ni objectif,
  l'utilisateur les saisit dans les champs sous chaque trade, le R:R se
  recalcule alors tout seul. S'il ne les a pas notés, il peut saisir son R:R
  à la main (champ « R:R » sous chaque trade) : « Copier pour Claude » le remonte marqué « saisi à la main »
  — une donnée déclarée, pas recalculée. **100% local au navigateur**, ne
  modifie jamais `index.html`/la page de session tant que Claude n'a pas relu
  et validé — ne pas considérer ce contenu comme publié.

## Avant de commiter/pousser

Les changements sur `index.html` sont visibles immédiatement en local,
mais ne sont publiés sur le site en ligne qu'après `git commit` +
`git push`. Toujours confirmer avec l'utilisateur avant de pousser (ça
republie le site immédiatement).
