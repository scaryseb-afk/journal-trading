# Journal de trading — instructions projet

Site statique (un seul `index.html` + `sessions/*.html`), publié sur
GitHub Pages (`scaryseb-afk.github.io/journal-trading`) depuis la branche
`main`. Pas de build : ce qui est commité est ce qui est publié.

`index.html` regroupe Tableau de bord, Avant la séance (anciennement « Brief séance » ; id `#brief`), Sessions et Règles dans une seule page
(`data-goto`/`.view` — pas de rechargement, l'onglet actif est dans le hash :
`#brief`, `#sessions`…). Le menu est une bannière fixe à gauche dès 960 px
(barre du haut en dessous), thème en bas du menu. Sur grand écran, les
sous-onglets du Tableau de bord et du Brief (`.subnav`/`.sn-btn`) sont
reproduits en sous-entrées du menu sous l'onglet actif (générées depuis
`.sn-btn` : un nouveau `.sn-btn` apparaît tout seul ; le premier, marqué
`data-nosidebar`, n'est pas répété : le lien parent du menu ouvre cette
sous-page) et la barre dans la page est masquée. Les trois sous-menus (Tableau
de bord, Avant la séance, Règles) restent toujours dépliés dans le menu, quel que soit
l'onglet actif — cliquer une sous-entrée ouvre d'abord son onglet parent puis la sous-page (`.nav-sub{display:flex}` inconditionnel dès 960px) — seul le
sous-élément survolé/actif est mis en évidence. Chaque entrée du menu (site et
pages de séance, `SJ_NAV` dans `session.js`) porte un emoji devant son nom. Chaque sous-page du Tableau de bord a son propre titre ; l'en-tête
et les widgets du haut (score de confluence, respect du plan, cartes) ne sont que
sur « Vue d'ensemble ». Juste en dessous du sous-titre, une bannière du jour (`#day-banner`) tire un message parmi 30 (bonne séance) / 30 (séance difficile) — sens et message tirés du P&L du jour dans `window.SESSIONS`, ou à défaut du compteur live `daytrack_AAAA-MM-JJ` (boutons +Gagnant/+Perdant/+Neutre de l'onglet Règles) ; sans donnée pour aujourd'hui, elle reste neutre. Un seul message par jour (index déterministe sur la date), pour rester stable au fil des visites. Les pages de séance
injectent le même menu (`.side-nav`, dans `session.js` : les cinq onglets et, dès 960 px, les mêmes sous-entrées toujours dépliées qu'index.html — liste `SJ_NAV` à tenir à jour quand un `.sn-btn` est ajouté dans index.html ; les liens ouvrent `index.html#onglet/sous-page`, routage dans le script de navigation d'index.html ; complété le 20/10, le menu des pages de séance n'avait que les cinq onglets) et partagent le thème
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
(règles V2.1 à V2.8 — la V2.8, posée par Sébastien le 16/10, place le TP à 1,95 de R:R et non à 2 ; elle passe sous le « R:R minimum 2:1 » de la règle 1, laissée inchangée en attendant sa réponse (exception ou non ?), et la calculette de lots affiche l'objectif à 1,95 R — numérotation propre à la stratégie, voulue par Sébastien le 07/10 : on ne continue pas à numéroter 12, 13… après les communes 1 à 8 ; une règle V2 se cite « règle V2.4 », plan type, repère timeframes). La sous-page « Stratégie V1 » (celle de Matthis) a été **supprimée le 20/10** : « je ne fais plus que lui » (Daxton, la V2) — le plan d'une séance est donc le plan Daxton par défaut, ne plus demander le schéma ; les anciennes notes de séance qui parlent de V1 / Matthis n'ont pas été réécrites (historique). Pas de stratégie CL : Sébastien n'en veut pas
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

**Couche « Apple design »** (`_systeme/apple.css`, ajoutée le 20/10 à la demande de Sébastien d'après le guide `emilkowalski/skills › apple-design` ; liée APRÈS la feuille de style dans `index.html` et dans chaque page de séance, `_template.html` compris — une nouvelle page la reprend toute seule) : mouvement par ressorts (`--ease-move` amortissement 1,0 / réponse 0,4 s, sans rebond ; `--ease-sheet` 0,8 / 0,3 s, léger dépassement ; courbes `linear()` échantillonnées depuis l'équation du ressort, repli `cubic-bezier`), changement d'onglet en fondu puis sous-page qui arrive du bas, retour immédiat au toucher (`:active` = léger rétrécissement dès l'appui), barre du haut des petits écrans, toast, lightbox et aperçu de capture en matière translucide (`backdrop-filter`), ombres plus profondes pour les grandes surfaces, titres de section en arête douce, chiffres tabulaires, interligne 1,55, anneau de focus, cibles tactiles. On n'anime que `transform` et `opacity`. Accessibilité : `prefers-reduced-motion` (fondus seulement), `prefers-reduced-transparency` (fonds pleins, pas de flou), `prefers-contrast: more` (bordures marquées). La couche n'ajoute aucune couleur : la palette ci-dessus reste la seule. Non repris du guide (rien à quoi l'appliquer ici) : gestes de glisser, élan / projection, étirement aux bords, haptique et son.

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

- « Ce que j'aurais dû faire » : à côté de la capture de chaque trade, **une zone de capture, celle de Daxton (stratégie V2)** : deux colonnes identiques (zones de dépôt alignées), ce qui s'est passé · ce que j'aurais dû faire · Daxton. Clé `imgs_<séance>__<compte>_<n>:fix:daxton` ; la remarque (une seule, clé `<compte>_<n>:fix`) reste pleine largeur dessous. La zone « Matt » (clé `…:fix:matt`) ajoutée le 16/10 a été **retirée le 20/10** à la demande de Sébastien (« retire sur tout le site les positions de Matt ») : elle n'a plus de zone de dépôt, ni dans l'aperçu au survol ni au collage ; ses éventuelles captures déjà enregistrées, comme celles de l'ancienne zone unique `…:fix` (avant le 16/10), restent visibles et supprimables dans « Anciennes captures », zone qui disparaît quand elle est vide (rien n'est perdu en silence). La page « Stratégie V1 » a été supprimée à son tour le 20/10 (« je ne fais plus que lui », Daxton). Ouverte d'office sur les trades perdants, derrière un bouton « ＋ Ce que j'aurais dû faire » pour les autres ; la remarque suit « Copier ce trade ». Ctrl+V colle dans la colonne survolée (elle est entourée) ; avec le curseur dans la remarque, Ctrl+V n'ajoute rien ; au survol d'une capture, l'aperçu montre côte à côte « ce qui s'est passé » et Daxton (la capture survolée est soulignée).
- Captures d'écran : une seule zone, sous chaque trade
  (`imgs_<séance>__<compte>_<n>`, glisser/cliquer/Ctrl+V en survolant la
  ligne) — pas de zone générale au niveau de la séance (retirée le 28/09,
  redondante avec les zones par trade). Redimensionnées et compressées côté
  navigateur avant stockage (voir `SJ_IMG_MAX_WIDTH`/`SJ_IMG_QUALITY` dans
  `session.js`) avant d'être rangées dans IndexedDB (base `journal-images`, depuis le 16/10 : en localStorage, ~5 Mo pour tout le site, 15 à 30 captures suffisaient à afficher « Stockage plein » ; `localStorage` ne garde qu'un témoin `[1,…]` sous la même clé, qui sert à l'icône 📷 de l'onglet Sessions (une séance avec des trades mais sans capture y porte un triangle d'alerte bleu acier — SVG de 16 px, d'abord un petit glyphe gris jugé trop discret —, demandé par Sébastien le 20/10), et les anciennes captures encore en localStorage sont migrées toutes seules au chargement d'une page de séance, sans perte : le témoin ne remplace l'original qu'une fois l'écriture confirmée). Stockage 100%
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
  pertes ; le plafond de 4 contrats est levé pour octobre 2026 — décision de Sébastien le 08/10, à rétablir en novembre sauf avis contraire : plus évalué dans planOk/planWhy depuis le 01/10) — ou une règle du plan que Sébastien déclare lui-même avoir enfreinte, ex. règle 5 « aucune modification d'ordre en position » le 13/10 — et, si false, `planWhy` (raison courte) : le bandeau « Respect du
  plan » du tableau de bord se calcule tout seul depuis ces deux champs.
- **Comptage des trades (Sébastien, 19/10)** : une même position prise sur deux comptes (même instrument, même sens, ouvertes en même temps) = **1 trade**, pas deux ordres différents, et pas une infraction à la règle 8 d'après lui (voir `csv/README.md`, règle 3 : `calc-semaine.js` et `calc-instruments.js` l'appliquent à tout l'historique, 231 → 224 signaux ; `trades`/`gagnants` de `window.SESSIONS` pour 08/10, 09/10, 16/10, 19/10 en tiennent compte ; 03/09 et 14/08 sont aussi regroupés dans les stats globales, leurs entrées de séance n'ont pas été retouchées). Règles 1 et 8 reformulées le 20/10 (demande de Sébastien : « je n'ai pas encore le niveau pour utiliser des copie trader, je peux le faire manuellement ») : la règle 8 devient « pas de copy trader tant que je n'ai pas le niveau ; à la main, la même position sur plusieurs comptes est permise » (elle absorbe la phrase « un seul compte à la fois » de la règle 1, qui n'en garde qu'un renvoi — les numéros 1 à 8 sont conservés) ; question ouverte sur la règle 1 : le budget de risque vaut-il par compte ou pour l'ensemble des comptes quand la même position est prise deux fois ? Règle V2.6 précisée le 20/10 : le lundi, pour Daxton, on attend surtout le début du marché, entrées en pré-market seulement dans 20 % des cas (plus une interdiction absolue). 03/09 recompté : 4 trades. Une position construite en plusieurs fills sur un même compte (ex. 22/10 : deux ventes de 3 contrats à 26 s d'écart sur le 001, double clic, rachetées ensemble) = 1 trade et 1 ligne du tableau de la page (qté « 6 (3+3) », entrée = prix moyen, le détail des fills dans le résumé) ; `calc-semaine.js` les regroupe déjà par fill ID commun. Le +10 $ du 02b le 19/10 est un break-even confirmé ; regroupé avec la perte de −500 $ du 001, le trade reste perdant (−490 $).
- Séance sans trade (ex. mercredi 14/10 : « je ne suis pas rentré, il n'y avait pas de setup », écrite à la demande de Sébastien) : entrée `pnl:0, trades:0, gagnants:0, neutres:0, planOk:true, rt:[0,0,0]` et page issue du template sans bloc de trades ni script de rendu ; elle est exclue des « séances tradées » et n'a pas de triangle de capture.
- À chaque séance ajoutée, lancer `node csv/calc-semaine.js` et recopier la
  ligne `rt:[trades, ré-entrées, P&L des ré-entrées]` du jour dans
  `window.SESSIONS` : la page « Progression » (semaine après semaine) en dépend.
- Trades dus à un bug de plateforme (signalés par Sébastien) : on ne supprime JAMAIS la ligne du CSV (trace,
  et le solde du compte les inclut) — on liste ses fill IDs dans `csv/exclus.json` ; les trois scripts
  (`calc-semaine`, `calc-instruments`, `calc-comptes`) les ignorent, donc ni trades, ni win rate, ni ré-entrées,
  ni plan, ni instruments, ni R. Dans la page de séance, la ligne est affichée en grisé (`bug:true`) sans zone de
  note, et le total précise « hors bug ». Premier cas : 13 allers-retours de 1 à 2 secondes sur le 001 le 05/10 (2 signalés par Sébastien, 11 de même signature rangés avec — « ne prends pas en compte les trades comme les deux derniers » ; à retirer d'`exclus.json` s'il dit que ce n'est pas un bug). Un vrai trade (22 min) du même compte le même soir reste compté.
- À chaque séance ajoutée, relancer aussi `node csv/calc-instruments.js` et
  remplacer la ligne `window.PAR_INSTRUMENT = {...}` d'`index.html` : les
  stats globales (cartes Statistiques, objectif 50 %, Économie & risque, comparatif Long / Short) en dépendent ; la sous-page « Par instrument » a été supprimée le 20/10 (Sébastien ne trade plus que le Nasdaq). Même total que les autres cartes (−7 224,25 $ / 186 signaux au 01/10).
- À chaque séance ajoutée, relancer aussi `node csv/calc-comptes.js` et remplacer la
  ligne `window.PAR_COMPTE = {...}` d'`index.html` : la table « R & % par compte »
  (Tableau de bord → Comptes & Analyse) en dépend. 1 R = le budget de risque du jour
  (`window.budgetOf`, défini dans le script Progression : ≈ 275 $ en septembre, 300 $
  jusqu'au 04/10, 500 $ dès le 05/10 ; août = pas de budget, donc hors R) — ce n'est
  pas le R réel de chaque trade, aucun stop n'étant enregistré. Les % viennent des
  soldes de `window.COMPTES` ; un écart avec le P&L des CSV est signalé (≠), pas lissé.
- Règles → « Objectif : 50 % de trades gagnants » : calculée dans la page depuis `window.PAR_INSTRUMENT`
  (gagnants, signaux, gain/perte moyens) — rien à recopier à la main ; elle suit `calc-instruments.js`.
- Tableau de bord → « Net P&L » = résultat des **comptes actifs** (règle de Sébastien, 08/10 : « quand un compte est cramé, ne le compte plus » ; ex. 4 comptes à 49 K, 51 K, 50 K et 52 K = +2 K sur 200 K de base) : Σ(solde − départ) des comptes de `window.COMPTES` qui ne sont ni cramés (`breached`), ni clos (`clos: true` : le 005, absent de la page Lucid du 30/09), ni sous leur seuil d'après le calcul (buffer ≤ 0 : le 003, « sûrement mort » selon Sébastien le 08/10), ni sans relevé depuis plus de 7 jours (sauf `actif: true` : le 005b, identifié vivant sur la page Lucid du 30/09). Objectif = **+3 000 $ par compte actif** (12 000 $ pour 4 comptes) ; à **−2 000 $ par compte, le compte est perdu** (seuil de 48 000 $ au départ) — règles de Sébastien du 08/10, calculées dans la page. Calculé dans la page (`window.netActifs()`), repris par la carte Net P&L, le KPI « Résultat des comptes actifs », l'objectif +12 000 $, « Total PnL » et la ligne « Comptes actifs » de la table R & %. À chaque séance, mettre à jour `solde`/`soldeDate`/`buffer` des comptes concernés dans `COMPTES` (dernière page Lucid collée : 13/10 pour 001, 02b et 005b — comptes actifs seulement ; le 001 est ensuite calculé : +536 $ du 13/10 puis −240 $ du 15/10, le 02b −1 198 $ du 15/10, le A −456 $ du 15/10 (CSV), puis +1 252 $ (001), +954 $ (02b) et −1 068 $ (A) du 16/10, puis −500 $ (001) et +10 $ (02b) du 19/10, puis −283,50 $ (001) et −468 $ (02b) du 20/10 matin, −234 $ (001) du 20/10 soir (absent de l'export du 20/10, révélé par celui du 21/10), −470 $ (001) et +500 $ (02b) du 21/10, puis +1 503 $ (001) et +741 $ (02b) du 22/10 — le seuil du 001 (49 186 $) est le dernier connu, le drawdown EOD a pu le faire remonter ; 08/10 au soir pour 003 et 004b ; le A n'est pas sur Lucid, son solde est calculé depuis les CSV ; Lucid est ~30 $ sous le calcul CSV par compte actif : frais). Le 003 est breaché (Lucid, 08/10) ; le 004b est cramé (annoncé par Sébastien le 09/10 : « j'ai cramé le compte 004 » ; pas de CSV : « le compte est dead », donc ses trades éventuels du 09/10 restent inconnus et `planOk` du 09/10 reste vide ; 02b et 005b n'ont pas tradé ce jour-là). Depuis le 13/10, Sébastien ne suit plus que **3 comptes à monter en funded** (plutôt que 6 non funded, trop à gérer) : 001, 02b et 005b — ce sont les trois comptes actifs de la page Lucid qu'il a collée le 13/10 ; le A (absent de Lucid, numéro jamais identifié) est **mis de côté** (`ecarte: true` dans `COMPTES` : exclu du Net P&L, de l'objectif, des buffers ; ses trades restent dans les stats). Objectif = **9 000 $** (3 × 3 000 $), perte maximale 6 000 $ (3 × 2 000 $), calculés dans la page. Le 15/10, Sébastien annonce « j'ai encore cramé un compte, il ne m'en reste que 2 » sans le nommer : aucun compte avec CSV n'est sous son seuil d'après le calcul, donc probablement le 005b (aucun CSV) — à confirmer ; en attendant, aucun statut n'est changé (`aConfirmer` sur le 005b). Le 16/10, le 001, le 02b et le A ont tous tradé : ce n'est donc aucun des trois, d'où le 005b. Le A (mis de côté mais toujours tradé) passe sous son seuil supposé de 48 000 $ le 16/10 (47 928,50 $ calculé, 3e trade de 58 s) : probablement cramé, à confirmer (`aConfirmer`). Quand le 005b est confirmé : `statut: "breached"` sur ce compte, et l'objectif tombe à 6 000 $ (2 × 3 000 $) tout seul. Les stats de trades (win rate, profit factor, espérance, Par instrument) restent sur tous les signaux, comptes cramés compris.
- Tableau de bord → « Économie & risque » (💶) : espérance par signal et par groupe (instrument, Long/Short), buffers des comptes en budgets de risque et en pertes moyennes, risque simultané (perte du budget sur tous les comptes actifs + pires jours multi-comptes). Tout est calculé dans la page depuis `window.PAR_INSTRUMENT`, `window.COMPTES` (soldes/seuils), `window.PAR_COMPTE` et `window.budgetOf` — rien à recopier ; le budget affiché est celui du jour (500 $ dès le 05/10). Bloc « Coût des comptes » : 100 $ par compte (indiqué puis confirmé par Sébastien le 08/10) × 10 comptes Lucid achetés (001, 002, 003, 004a, 004b, 005, 005b, 006, 02b, A ; TopstepX hors calcul) — resets, activation, payouts et règles Lucid pas renseignés, donc pas de ROI ni de taux de réussite des évaluations.
- Avant la séance → Checklist : carte « Note du jour » (ressenti avant de trader).
  Saisie locale au navigateur (`daynote_AAAA-MM-JJ`) ; « Copier pour Claude »
  la remonte dans le chat, et Claude l'inscrit dans `window.DAY_NOTES`
  (`index.html`, clé `AAAA-MM-JJ`, `m` = bien | neutre | pas-bien) pour qu'elle
  soit rapprochée du P&L du jour. Sans ce copier-coller, Claude ne la voit pas.
- Pages « Comptes » (Tableau de bord → Comptes & Analyse, Avant la séance → Comptes, simplifiées le 20/10 à la demande de Sébastien : « beaucoup trop de texte ») : rendues depuis `window.COMPTES` et `window.netActifs()` par le script « Comptes — vue claire » — une carte par compte actif (solde, résultat, objectif +3 000 $, marge avant la perte du compte, ligne d'alerte facultative `court`), les autres comptes repliés dans une liste ; plus aucun bloc statique à recopier à chaque séance, seuls `solde`/`soldeDate`/`buffer` et `court` de `COMPTES` comptent. « Analyses éco » (macro, CPI/Fed/NFP/PMI, biais de marché) supprimée le 20/10 (demande de Sébastien) : elle reste dans l'historique git. Menu : une seule page surlignée, celle où l'on est.
- Pas d'import CSV dans les pages : c'est Claude qui crée la page de séance
  à partir des exports que l'utilisateur envoie dans le chat.
- **Quand Sébastien colle une capture dans le chat** (demande du 20/10) — à faire sans qu'il le redemande : (1) lire dessus le stop, l'objectif et le R:R (outil de position TradingView : étiquettes de prix sur l'axe, ligne « TP », R:R affiché ; entrée = prix du CSV) et les inscrire dans `SJ_LEVELS` de la page, `'<compte>_<n>': { stop:'…', objectif:'…', rr:'…', src:'lus sur la capture' }` — les champs STOP / OBJECTIF **et R:R** se pré-remplissent, **le champ R:R n'est jamais laissé vide dès qu'on le lit ou qu'on peut le calculer** (R:R affiché sur la capture, sinon (objectif − entrée) ÷ (entrée − stop) avec le fill du CSV, 2 décimales ; un compte par trade, chaque capture sous le trade de son compte — le nom du fichier TradingView « 001 … » / « 006 … » dit à quel compte elle appartient : 006 = le 02b, référence LFE05085004680006 ; si Sébastien dit « pour les deux », la même image sert aux deux clés) — demande du 21/10 ; ce que Sébastien saisit lui-même prime ; ne rien inventer : niveau illisible = laissé vide et dit ; donner aussi le R réalisé (P&L ÷ risque en $) dans le résumé ; (2) copier l'image dans `sessions/img/` (le chemin `[Image: source: …]` du message, à copier tout de suite : ces fichiers disparaissent) : `mkdir -p sessions/img && sips -Z 1400 -s format jpeg -s formatOptions 82 <source> --out sessions/img/AAAA-MM-JJ_<compte>_<n>.jpg`, puis l'ajouter à `SJ_SHOTS` sous la bonne clé — `'<compte>_<n>'` (colonne « ce qui s'est passé ») ou `'<compte>_<n>:fix:daxton'` (colonne Daxton) — et mettre `img:true` sur l'entrée de la séance dans `window.SESSIONS` (sinon l'onglet Sessions affiche le triangle « pas de capture ») ; si on ne sait pas de quel trade il s'agit (heure et prix du graphique à comparer au tableau), demander ; (3) compléter le résumé de la page. Ces captures et niveaux sont versionnés avec le site (visibles partout), contrairement à ceux que Sébastien dépose ou saisit dans son navigateur, que Claude ne voit jamais.
- **Heures dans les résumés et les tableaux** (demande du 20/10) : toujours l'heure d'entrée ET l'heure de sortie (« 15h40 → 15h43 »). Tableaux des pages : `time` (entrée) + `exit_time` (sortie), la cellule affiche « 15:40 → 15:43 » ; ajouté aux pages d'octobre (01/10 → 19/10) à partir des CSV, les pages d'août et de septembre n'ont que l'heure d'entrée.
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
