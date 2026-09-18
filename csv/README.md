# Données brutes CSV

Ce dossier garde une copie **verbatim** des exports Tradovate envoyés par
Sébastien, pour que les chiffres affichés dans `index.html`/`rules.html`
(win rate, R:R, comptes, nombre de trades...) soient toujours recalculables
depuis la donnée source — pas seulement depuis un résumé tapé à la main.

## Rangement : `csv/comptes/<numéro>.csv`

Chaque compte a UN fichier, identifié par son numéro réel (ex. `006.csv`,
`002.csv`...). Tradovate exporte l'historique complet du compte à chaque
fois — donc à chaque nouvel envoi, **on écrase le fichier existant** avec
la version la plus récente plutôt que d'empiler des exports partiels.

Comptes connus et leur plage d'ID de fill (`buyFillId`/`sellFillId`),
stable dans le temps — utile pour ré-identifier un fichier reçu sans nom
explicite :

| Compte | Plage buyFillId |
|---|---|
| 001 | 630057150xxx – 630057151xxx |
| 002 | 631159020xxx |
| 004a | 619589860xxx (ancien compte, cramé et clôturé le 10/09) |
| 005 | 620520920xxx – 620520921xxx |
| 006 | 630884360xxx – 630884361xxx |
| 003 | 655959380xxx (numéro complet confirmé le 14/09 — anciennement noté « 006b » en attente) |
| 004b | 664675940xxx (nouveau compte racheté le 17/09, remplace le 004a) |

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
   du même compte) par même symbole, prix d'entrée à 2-3 ticks près, et
   horodatage d'entrée à ~20 secondes près. Le P&L, lui, reste compté par
   compte (c'est de l'argent réel sur chaque compte).
4. Une fois les données extraites et la page mise à jour, commiter les CSV
   en même temps que les modifications HTML.
5. Si un total semble incohérent avec l'historique, le signaler à
   l'utilisateur plutôt que de l'absorber silencieusement.
