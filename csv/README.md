# Données brutes CSV

Ce dossier garde une copie **verbatim** des exports Tradovate envoyés par
Sébastien, pour que les chiffres affichés dans `index.html`
(win rate, R:R, comptes, nombre de trades...) soient toujours recalculables
depuis la donnée source — pas seulement depuis un résumé tapé à la main.

## Rangement : `csv/comptes/<numéro>.csv`

Chaque compte a UN fichier, identifié par son numéro réel (ex. `006.csv`,
`002.csv`...). Tradovate n'exporte qu'une fenêtre récente (pas tout
l'historique) : à chaque nouvel envoi, **on fusionne** — on n'ajoute que les
lignes dont le couple `buyFillId`/`sellFillId` n'existe pas déjà, à leur place
chronologique, et on n'écrase jamais l'historique. Comparer systématiquement
l'export reçu au fichier existant : c'est comme ça qu'on repère les trades
manquants d'un export incomplet (ex. 002 le 15/09, 001 le 18/09). Ne pas
réécrire un fichier en entier (fins de ligne CRLF/LF mélangées → diff
illisible) : insérer uniquement les nouvelles lignes.

Comptes connus et leur plage d'ID de fill (`buyFillId`/`sellFillId`),
stable dans le temps — utile pour ré-identifier un fichier reçu sans nom
explicite :

| Compte | Plage buyFillId |
|---|---|
| 001 | 630057150xxx – 630057152xxx |
| 002 | 631159020xxx |
| 004a | 619589860xxx (ancien compte, cramé et clôturé le 10/09 — fichier `004.csv`) |
| 005 | 620520920xxx – 620520921xxx |
| 006 | 630884360xxx – 630884361xxx |
| 003 | 655959380xxx (numéro complet confirmé le 14/09 — anciennement noté « 006b » en attente) |
| 004b | 664675940xxx (nouveau compte racheté le 17/09, remplace le 004a) |
| A | 665865960xxx (nouveau compte ouvert le 18/09, trade en 8 contrats dès le 1er jour) |
| 02b | 679770490xxx (nouveau compte racheté le 29/09, remplace le 002 cramé/breached) |

## Règle pour toute session Claude qui traite un CSV envoyé par l'utilisateur

1. **Toujours sauvegarder le fichier reçu** dans `csv/comptes/<numéro>.csv`
   avant d'en extraire quoi que ce soit. Si le nom du fichier ne donne pas
   le numéro de compte, comparer sa plage `buyFillId` au tableau ci-dessus.
2. Ne jamais recopier des totaux à la main sans les avoir vérifiés en
   relisant le fichier — recalculer depuis le CSV plutôt que réutiliser un
   chiffre déjà écrit ailleurs dans le journal.
3. **Dédoublonnage** : plusieurs comptes copient parfois le même trade via
   TraderSyncer, avec des horodatages/prix qui peuvent différer légèrement
   d'un compte à l'autre (latence d'exécution). Pour tout total de "nombre
   de trades" ou de win rate, compter chaque **signal unique une seule
   fois** — grouper les lignes de comptes différents (jamais deux lignes
   du même compte) de même symbole **et de même sens**, dont l'entrée est à
   ≤ 20 s d'écart et : soit le prix d'entrée est à ≤ 3 ticks, soit les
   entrées sont à ≤ 2 s ET les sorties à ≤ 3 s (même signal copié avec un
   slippage plus large, ex. 001/006 le 17/09, 001/003 le 18/09, 001/005 le
   02/09). Un signal est gagnant si la somme des P&L de ses lignes est > 0.
   Le P&L, lui, reste compté par compte (c'est de l'argent réel sur chaque
   compte). Exception : un trade que Sébastien déclare sorti à **break-even**
   (stratégie V2 : stop remonté à l'entrée) est « neutre » — compté dans le
   nombre de trades mais pas dans les gagnants, même si le P&L est
   légèrement positif (ex. +8 $ le 23/09). Une position construite ou sortie en plusieurs
   fills (un fill d'entrée ou de sortie partagé entre plusieurs lignes CSV —
   ex. 001 le 24/09 et le 25/09) compte pour **1 trade** depuis le 24/09 ; avant, les décomptes historiques
   comptaient parfois chaque ligne à part.
4. Une fois les données extraites et la page mise à jour, commiter les CSV
   en même temps que les modifications HTML.
5. Si un total semble incohérent avec l'historique, le signaler à
   l'utilisateur plutôt que de l'absorber silencieusement.

## Progression semaine par semaine

(Les montants ≥ 1 000 $ sont exportés entre guillemets — `"$(1,200.00)"`, virgule des milliers incluse : `calc-semaine.js` et `calc-instruments.js` lisent le CSV en respectant les guillemets, pas un simple découpage sur les virgules. Premier cas : la perte de −1 200 $ du 02b le 02/10.)

`node csv/calc-semaine.js [AAAA-MM-JJ]` recalcule depuis `csv/comptes/*.csv`,
jour par jour, le nombre de trades (une position en plusieurs fills = 1, copy
trading = 1), les **ré-entrées** (entrée moins de 10 min après la dernière
perte terminée, tous comptes) et leur P&L. Les valeurs `rt:[trades,
ré-entrées, P&L des ré-entrées]` sont à recopier dans `window.SESSIONS`
(index.html) à chaque nouvelle séance : elles alimentent la page
« Progression » du tableau de bord et les chiffres de l'onglet « Avant la séance ».

## Résultat par instrument

`node csv/calc-instruments.js` applique le même pipeline (fills fusionnés, copy
trading = 1 signal) puis regroupe par famille : **MNQ**, **Or** (MGC + GC),
**Pétrole** (MCL + CL), **Euro** (6E). Il imprime la ligne
`window.PAR_INSTRUMENT = {...}` à recopier dans `index.html` (sous-page « Par
instrument » du Tableau de bord). Il sort aussi le **sens** de chaque signal (Long = acheté avant d'être vendu) :
signaux, gagnants et P&L en Long et en Short, global et par famille. Le total doit toujours égaler celui des autres
cartes (au 01/10 : −7 224,25 $, 186 signaux). Un signal est « gagnant » si son
P&L est > 0 : les break-even déclarés (ex. les deux du 23/09) n'y sont pas isolés,
le CSV n'en garde pas la trace.

## R et % par compte

`node csv/calc-comptes.js` imprime `window.PAR_COMPTE = {...}` : le P&L de chaque compte
jour par jour (somme des lignes du CSV, jour = jour d'entrée), à recopier dans `index.html`.
La table « R & % par compte » du Tableau de bord en tire un R cumulé (P&L du jour ÷ budget de
risque du jour) et le compare au solde de `window.COMPTES`. Le 005b n'a pas de CSV : seul son
−1 200 $ du 29/09 (Lucid) est repris à la main dans la page.

## Lignes exclues (bugs de plateforme)

`csv/exclus.json` liste les fill IDs de trades à ne pas compter (ex. 13 allers-retours de 1 à 2 secondes dus à un
bug, le 05/10 sur le 001 : 2 signalés par Sébastien, 11 de même signature rangés avec) avec la raison. La ligne reste dans `csv/comptes/<compte>.csv` — c'est la trace de ce
que la plateforme a réellement fait, et le solde du compte l'inclut — mais `calc-semaine.js`, `calc-instruments.js`
et `calc-comptes.js` l'ignorent : pas de trade, pas de ré-entrée, pas de win rate, pas de R.

