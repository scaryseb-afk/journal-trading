# Le journal en « app iOS » sur téléphone — conception

Date : 30/10/2026 · Demande de Sébastien : « repenser le site pour faire comme si c'était une app sur iOS, des gros boutons pour lire, que ce soit facile — uniquement sur téléphone, sur Mac c'est parfait. » Usage principal sur téléphone : **consulter ses résultats**.

## 1. Objectif et périmètre

Sur un écran de téléphone (largeur ≤ 700 px), le site se comporte comme une app iOS : barre d'onglets en bas, grands titres, gros boutons, listes à grosses lignes, cartes arrondies. Au-dessus de 700 px (Mac, iPad, fenêtre large), **rien ne change**.

| Étape | Contenu |
|---|---|
| **1 — à construire d'abord** | La coque d'app (barre d'onglets, grand titre, bouton Retour, rangée de sous-pages) ; l'Accueil ; la liste des séances ; la page d'une séance. |
| **2 — ensuite** | « Avant la séance », « Règles », pages de stats du Tableau de bord : elles héritent de la coque et du texte plus grand dès l'étape 1 ; l'étape 2 les reprend page par page. |

Hors périmètre : téléphone en mode paysage et iPad (ils gardent la mise en page actuelle), manifeste PWA / hors-ligne, gestes (glisser pour revenir), retour haptique.

## 2. Approche retenue

**Une couche « téléphone » par-dessus le site existant** : un fichier de styles (`_systeme/mobile.css`) et un script (`_systeme/mobile.js`). Même contenu, mêmes adresses (`#sessions`, `#brief`…), même routage (`.nav a[data-goto]`, `.sn-btn[data-sub]`, `data-open`). Aucune donnée n'est dupliquée : l'Accueil lit `window.netActifs()`, `window.COMPTES`, `window.SESSIONS`, `window.PAR_INSTRUMENT`, comme les cartes du Mac.

Écartées : des pages séparées pour le téléphone (deux versions à tenir à jour à chaque séance) ; une réécriture en vraie app PWA / framework (casse « pas de build »).

## 3. Garde-fou « Mac inchangé »

- Toutes les règles de `mobile.css` sont à l'intérieur de `@media (max-width: 700px)`. Aucune règle à la racine du fichier.
- Les éléments que `mobile.js` ajoute au DOM (barre d'onglets, Accueil, feuille « Plus ») sont `display: none` hors de ce `@media` ; le script ne modifie pas les éléments existants hors téléphone.
- Vérifié par un test (voir §8) : aucune règle hors `@media`, et captures avant / après identiques à 1280 px.

## 4. Fichiers

| Fichier | Changement |
|---|---|
| `_systeme/mobile.css` (nouveau) | Tout le style téléphone. |
| `_systeme/mobile.js` (nouveau) | Barre d'onglets, Accueil, feuille « Plus », découpage du résumé d'une séance. Ne s'exécute que si `matchMedia('(max-width:700px)')` est vrai. |
| `index.html` | Ajout de `<link … mobile.css>` après `apple.css` et de `<script … mobile.js defer>` en fin de page. |
| `sessions/*.html` (56 pages) + `sessions/_template.html` | Une seule ligne `<link … ../_systeme/mobile.css>` ajoutée après `apple.css` (évite l'éclair de la mise en page Mac). Le script est chargé par `session.js` seulement sur téléphone. |
| `_systeme/session.js` | Charge `mobile.js` sur téléphone ; le menu `.side-nav` est masqué par le CSS (remplacé par la barre d'onglets). |
| `CLAUDE.md` | Une section « Couche téléphone » : fichiers, seuil 700 px, règle « tout dans le `@media` », ce qui est généré. |

## 5. Navigation et coque

- **Barre d'onglets** (fixe en bas, translucide `backdrop-filter`, `padding-bottom: env(safe-area-inset-bottom)`, hauteur 56 px + zone de sécurité). Cinq onglets : **Accueil** (`dashboard`), **Séances** (`sessions`), **Avant la séance** (`brief`), **Règles** (`regles`), **Plus**. Un tap appelle le même clic que `.nav a[data-goto]` : le routeur existant fait le reste ; l'onglet actif suit la classe `on` du `.nav` d'origine. Un tap sur **Accueil** ouvre toujours la « Vue d'ensemble » (clic sur le premier `.sn-btn`, celui marqué `data-nosidebar`), même si une autre sous-page du Tableau de bord était mémorisée.
- **Icônes** : SVG en traits fins (24–28 px), grises, bleu acier (`--accent`) pour l'actif ; pas d'emoji dans la barre. Libellé 11 px sous l'icône.
- **« Plus »** : une feuille qui monte du bas (ressort `--ease-sheet`) avec une liste : Progression, Économie & risque, Comptes & Analyse, Risque & R:R, Constats d'août (ouvrent `dashboard/<sous-page>` via `data-open`), puis un bouton « Thème » qui déclenche le clic du `#theme-toggle` existant (rien n'est déplacé ni dupliqué : la logique du thème reste à un seul endroit).
- **Barre du haut d'origine** (`.nav`) : masquée sur téléphone ; le thème reste accessible via « Plus ».
- **Grand titre** par écran (34 px, gras) pris dans le `h1`/`h2` existant de la vue. Un écran « poussé » (page d'une séance, sous-page ouverte depuis l'Accueil) arrive de la droite (`transform` + `opacity` seulement) avec un bouton **‹ Retour** de 48 px de haut.
- **Sous-pages** (`.subnav` / `.sn-btn`) : rangée horizontale à faire glisser, collée sous le titre, pastilles de 44 px ; la pastille active est centrée.
- **Pages de séance** (`.side-nav` injecté par `session.js`) : barre d'onglets identique, dont les liens ouvrent `index.html#<onglet>` ; le bouton « ← Journal » devient « ‹ Séances ».

## 6. Écrans de l'étape 1

### 6.1 Accueil (onglet `dashboard`, sous-page « Vue d'ensemble »)
Généré par `mobile.js` et inséré en tête de la sous-page ; le contenu existant du Tableau de bord n'est pas supprimé : il reste dessous, replié dans une rangée « Tout le tableau de bord ».
1. En-tête « Aujourd'hui · ven. 30 oct. » et la bannière du jour (`#day-banner`) existante.
2. **Net P&L** en 44 px (vert / rouge selon le signe), barre de progression vers l'objectif (« 54 % de 6 000 $ · reste 2 735 $ »), valeurs de `netActifs()`.
3. **Une carte par compte actif** : solde, résultat depuis le départ, marge avant la perte du compte (comme la page Comptes).
4. Rangée **« Dernière séance »** : date, P&L, ≈ R ; ouvre la page de cette séance.
5. Trois mini-chiffres : win % des trades, profit factor, jours gagnants ; chacun mène à « Stats ».
6. **Quatre gros boutons 2 × 2** (hauteur 96 px) : Avant la séance, Séances, Règles, Stats (= feuille « Plus »).

### 6.2 Liste des séances (onglet `sessions`)
Les lignes générées dans `#sessions-feed` deviennent des lignes de 64 px minimum : date en 17 px gras, P&L à droite (vert / rouge, tabulaire), sous-ligne « 1 trade · 2 comptes », chevron ›, triangle « pas de capture » conservé. Regroupées par mois sous un en-tête collant.

### 6.3 Page d'une séance
- **En-tête** : date en grand titre, P&L en 44 px sur pastille teintée (déjà existante), « ‹ Séances ».
- **Résumé à déplier** — `mobile.js` découpe `.note-block` : les segments séparés par `<br><br>` ; le **premier** reste visible (c'est le titre de la journée) ; chaque segment suivant qui commence par un `<strong>` devient une rangée `<details class="m-sec">` dont le titre est ce texte en gras, coupé à ≈ 40 caractères (au premier « : » ou « — » ou « . » avant la limite, sinon « … » ; le gras complet reste dans le corps déplié). Un segment sans `<strong>` initial se rattache au précédent. **Repli** : si le bloc compte moins de 3 segments exploitables, il reste intact, en gros caractères. Idempotent (rien si `.m-sec` existe déjà).
- **Trades** : le tableau `.trades-table` devient une carte par ligne (CSS seul : `thead` masqué, `tr` en grille, libellés via `::before`) : sens + quantité, entrée → sortie, heures « 16:15 → 17:47 », P&L à droite en 22 px. Chaque compte garde son bandeau (`.acct-header`).
- **Saisies sous chaque trade** : stop / objectif / R:R en champs de 48 px (16 px de texte : pas de zoom Safari), note en `textarea` pleine largeur ; zones de capture « Ce qui s'est passé » et « Daxton » empilées, avec un gros bouton « Ajouter une capture » (ouvre les photos) ; boutons ⇄ et × des captures de 44 px.
- **Relecture** : trois champs empilés, « Copier pour Claude » en bouton pleine largeur de 52 px.

## 7. Tokens (téléphone)

| | Valeur |
|---|---|
| Texte courant | 17 px, interligne 1,45 |
| Grand titre / titre de section / chiffre clé | 34 px / 22 px / 44 px |
| Cible tactile minimale | 48 px (boutons principaux : 52 px, pleine largeur) |
| Marges latérales | 16 px + `env(safe-area-inset-*)` |
| Cartes | rayon 16 px, groupes « inset » à rangées de 56–64 px |
| Couleurs | **aucune nouvelle** : `--accent` (bleu acier), `--red` / `--green` pour les résultats, thème nuit / jour actuel |
| Mouvement | ressorts existants (`--ease-move`, `--ease-sheet`), seulement `transform` et `opacity` ; `:active` = léger rétrécissement |

Accessibilité : `prefers-reduced-motion` (fondus seulement), `prefers-reduced-transparency` (fonds pleins), `prefers-contrast: more`, anneau de focus conservé.

## 8. Vérification

1. **Mac inchangé** : un script contrôle que `mobile.css` n'a aucune règle hors `@media (max-width:700px)` ; captures `index.html` (4 onglets) et une page de séance à 1280 px, avant / après, identiques.
2. **Téléphone** : fenêtre émulée 375 × 812 et 390 × 844 dans le navigateur du Mac, en nuit et en jour : Accueil, Séances, une séance gagnante, une perdante, une page ancienne (repli du résumé), « Plus », sous-pages.
3. **iOS réel** : simulateur iOS (Safari) pour la zone de sécurité du bas, l'absence de zoom au focus et la barre d'onglets.
4. Console sans erreur ; chaque bouton testé par un vrai clic ; les chiffres de l'Accueil comparés à ceux des cartes du Mac (mêmes valeurs).
5. Une nouvelle séance (ex. 30/10) s'affiche correctement sans rien changer à `mobile.*`.

## 9. Risques et décisions

- **Découpage du résumé** : heuristique sur du texte libre ; le repli « texte entier » évite toute perte ; si un titre est mal coupé, on ajuste la règle de coupe, pas le contenu des pages.
- **56 pages à toucher** pour une ligne `<link>` : modification mécanique (insertion après `apple.css`), vérifiée par `grep -c` (56 + template).
- **Seuil 700 px** : un navigateur Mac réduit sous 700 px prend la mise en page téléphone ; c'est voulu (c'est aussi comme ça qu'on teste).
- Rien n'est poussé sans ton accord ; le seuil, les tailles et les libellés se changent à un seul endroit (`mobile.css`).
