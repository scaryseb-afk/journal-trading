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
| 001 | 630057150xxx – 630057151xxx |
| 002 | 631159020xxx |
| 004a | 619589860xxx (ancien compte, cramé et clôturé le 10/09 — fichier `004.csv`) |
| 005 | 620520920xxx – 620520921xxx |
| 006 | 630884360xxx – 630884361xxx |
| 003 | 655959380xxx (numéro complet confirmé le 14/09 — anciennement noté « 006b » en attente) |
| 004b | 664675940xxx (nouveau compte racheté le 17/09, remplace le 004a) |
| A | 665865960xxx (nouveau compte ouvert le 18/09, trade en 8 contrats dès le 1er jour) |

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
   compte).
4. Une fois les données extraites et la page mise à jour, commiter les CSV
   en même temps que les modifications HTML.
5. Si un total semble incohérent avec l'historique, le signaler à
   l'utilisateur plutôt que de l'absorber silencieusement.
