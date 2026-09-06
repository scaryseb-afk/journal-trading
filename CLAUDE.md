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

## Avant de commiter/pousser

Les changements sur `index.html`/`rules.html` sont visibles immédiatement
en local, mais ne sont publiés sur le site en ligne qu'après
`git commit` + `git push`. Toujours confirmer avec l'utilisateur avant de
pousser (ça republie le site immédiatement).
