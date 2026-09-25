# Passation du projet Forge — pour Claude Code

Tu reprends **Forge**, une app web de suivi de musculation pour iPhone, développée pour **Yannick Wahler** (« YaYa ») selon la même méthode que son autre app, **Zeste** (bar à cocktails). Lis ce document avant de toucher au code.

## 1. Le propriétaire et ses exigences

- Yannick parle **français** : réponds et écris l'interface en français.
- Usage **solo sur iPhone (Safari)**. Cible réelle = Safari/WebKit, même si le développement peut se tester sous Chromium.
- **Véracité des informations d'exercice** : toute consigne d'exécution ou de sécurité ajoutée doit s'appuyer sur des repères techniques reconnus (alignement articulaire, dos neutre, amplitude contrôlée...). Ne jamais inventer une consigne dangereuse. En cas de doute, reste conservateur et renvoie vers un professionnel.
- **100% local** : aucun backend, aucun compte, aucun appel réseau. Tout est stocké dans `localStorage` (clé `forge.v1`).
- **Numérotation des versions** : version actuelle **1.0**. Incrémente `APP_VERSION` (`src/init.js`) à chaque livraison notable.
- Copyright affiché dans « À propos » : `© <année> Yannick Wahler. Tous droits réservés.` (constante `COPYRIGHT`, `src/init.js`).
- Cahier des charges d'origine : voir la conversation initiale (résumé ci-dessous, section 6).

## 2. Démarrage rapide

```sh
cd forge_projet
sh build.sh   # assemble dist/forge.html ET copie vers ../index.html (racine du dépôt)
```

Pas de framework, pas de dépendance npm pour l'app elle-même. Pour tester dans un vrai navigateur : ouvrir `index.html` directement (`file://`), ou le servir avec `python3 -m http.server`.

Pour un smoke test automatisé (Playwright/Chromium déjà installé dans les environnements Claude Code cloud) : ouvrir la page, cliquer sur chaque onglet, démarrer une séance, cocher une série, terminer la séance, vérifier l'absence d'erreurs console (`page.on('pageerror', ...)`).

## 3. Architecture

**Un seul fichier HTML final** (`index.html` à la racine = `forge_projet/dist/forge.html`), HTML + CSS + JS vanilla assemblés par `build.sh`. Ordre de concaténation (important, voir `build.sh`) :

```
style.css
data_equipment.js data_exercises.js
core.js engine.js
ui_shell.js timer.js charts.js trophies.js
view_today.js view_history.js view_progress.js view_profil.js
init.js
```

- **`data_equipment.js`** : catalogue du matériel (`EQUIP_TYPES`), poids réellement possédés (`S.equipment.weights`).
- **`data_exercises.js`** : bibliothèque d'exercices (`EXOS`, ~65 exercices). Chaque exercice a un `pattern` (squat/hinge/push/pull/lunge/core/calf), des `muscles`, un `equip` requis, des `cues` et une consigne `safety`.
- **`core.js`** : état global `S` (persisté via `save()`/`load()` dans `localStorage`), utilitaires de date, agrégats d'historique (PR, volume, streaks).
- **`engine.js`** : moteur de suggestion 100% local. `getOrCreateDraft()` génère ou récupère la séance du jour. `generateEngineSession()` fait la rotation des groupes musculaires + progression de charge. `buildExportPrompt()` / `importProgramJSON()` gèrent l'aller-retour avec une IA externe (voir section 5).
- **`ui_shell.js`** : tabbar, sheets/modals, toast, délégation d'actions par `data-a="nom"` → `ACT.nom(dataset, élément)` (clic) et `data-c="nom"` (changement d'un input).
- **Vues** (`view_*.js`) : chacune expose une fonction assignée à `VIEWS.<id>` et ajoute ses handlers à `ACT` via `Object.assign(ACT, {...})`. **Convention importante, comme dans Zeste** : si tu ajoutes un module après un autre, tu peux enrichir `ACT` par `Object.assign`, ou redéfinir une fonction existante (la déclaration la plus tardive gagne, hissage JS). Avant de modifier une fonction, vérifie qu'elle n'est pas redéfinie ailleurs.
- **État** (`S`, voir `core.js: defaultState()`) : `equipment`, `prefs` (exclus/privilégiés), `goals`, `sessions` (historique complet), `draft` (séance du jour, éditable), `importedProgram` (file d'attente de séances importées), `trophies`, `settings`, `meta`.
- **Rendu** : `renderView(id)` régénère tout le HTML de l'onglet actif. `changed()` sauvegarde et redessine, sauf si une sheet est ouverte (elle sera redessinée à la fermeture via `dirtyOnClose`). Les inputs texte (reps/poids) utilisent l'événement `change` (pas `input`) pour ne pas perdre le focus à chaque frappe — ils ne déclenchent qu'un `save()`, pas un `changed()` complet.

### Piège déjà rencontré

- **`#restbar` (barre de repos) chevauchant le contenu au scroll** : `#restbar` est positionné en `position:absolute` par rapport au viewport (hors du conteneur scrollable `.view`), donc il reste visuellement fixe pendant que le contenu défile en dessous. Le bouton « Terminer la séance » pouvait se retrouver caché derrière au mauvais moment. Fix appliqué : `padding-bottom` généreux (`180px`) sur `.view` pour garantir qu'on peut toujours faire défiler les boutons au-dessus de la zone occupée par la barre de repos. Si tu ajoutes d'autres éléments fixes en bas d'écran, vérifie ce chevauchement.
- **Sélecteurs ambigus `data-a="closesheet"`** : le `scrim` (fond assombri) ET les boutons de fermeture partagent `data-a="closesheet"`. Si tu écris un test Playwright, cible précisément le bouton (`.sheet-hd [data-a="closesheet"]` ou `.center-modal [data-a="closesheet"]`), sinon le clic peut atterrir sur le scrim et être intercepté par la sheet/modal elle-même.
- **Un seul `#overlay`** : ouvrir une sheet ou une modale remplace le contenu de `#overlay`. Si tu ouvres une modale (ex. avertissements d'import) pendant qu'une sheet est affichée, elle la remplace plutôt que de s'empiler. C'est voulu pour rester simple, mais attention si tu enchaînes plusieurs `openSheet`/`openModal` avec des `setTimeout`.
- **Import d'un programme alors qu'une séance du jour existe déjà** : `getOrCreateDraft()` ne régénère la séance que si aucun brouillon n'existe pour aujourd'hui. `importProgramJSON()` doit donc explicitement remplacer `S.draft` si celui-ci n'a pas encore été démarré (`!S.draft.startedAt`), sinon l'import importé silencieusement ne s'affiche jamais. Ce cas est couvert par un test Playwright dédié — ne pas régresser.

## 4. Bibliothèque d'exercices

65 exercices couvrant poids du corps, haltères, barre, kettlebell, élastiques, banc, barre de traction. Chaque fiche a des consignes d'exécution et une note de sécurité rédigées à partir de repères techniques standards et largement consensuels (alignement du dos, amplitude contrôlée, etc.), **pas** de recherche de sources spécifiques par exercice (contrairement à Zeste où chaque recette doit être vérifiée auprès d'une source nommée). Si YaYa demande une vérification plus poussée d'un exercice en particulier (ex. comparaison avec NSCA/ACSM/NASM), traite-la comme pour Zeste : cite la source utilisée.

## 5. Moteur de suggestion et IA externe

- Rotation musculaire par « ancienneté » (`daysSinceTrained`) pondérée par l'objectif (`S.goals.emphasis`), avec forte pénalité si un groupe a été travaillé il y a moins de 2 jours (récupération).
- Progression de charge simple : si toutes les séries de la dernière séance ont atteint le haut de la fourchette de reps avec un ressenti raisonnable (RPE ≤ 7,5), le poids suggéré grimpe au palier suivant possédé (`S.equipment.weights`) ou par défaut (`DEFAULT_INCREMENT`).
- Export/import façon Zeste : `buildExportPrompt()` génère un texte à copier-coller dans une IA externe ; la réponse attendue est un JSON `{ "sessions": [...] }` que l'utilisateur importe via le champ fichier cachpe `#fileImport` (attaché en dur dans le HTML — nécessaire pour que la sélection de fichier fonctionne sur iOS, même piège que dans Zeste).

## 6. Cahier des charges d'origine (résumé)

Voir le fichier `4a3df5ee-cahier-des-charges-forge.md` fourni au lancement du projet pour le texte complet. Points clés déjà couverts en v1.0 : matériel personnalisable et extensible, bibliothèque d'exercices filtrée, inclusion/exclusion d'exercices, objectifs personnalisés, suivi détaillé de séance (éditable, timer de repos, coche rapide), moteur de suggestion 100% local avec export/import IA, graphiques de progression, PR, streaks/régularité, trophées, écran d'accueil = séance du jour, thème clair/sombre automatique, page À propos avec copyright.

## 7. Chantiers proposés pour la suite

1. Historique modifiable a posteriori (éditer une séance déjà enregistrée).
2. Export/partage d'une séance ou d'un récap (image), comme le Rewind de Zeste.
3. Tests automatisés versionnés dans le dépôt (actuellement les tests Playwright ont été écrits et exécutés en session mais pas committés — à formaliser dans un dossier `tests/` si utile).
4. Vérification de chaque exercice avec une source nommée (NSCA/ACSM/NASM) si YaYa souhaite le même niveau de rigueur que les recettes de Zeste.
5. Vrai test sur iPhone Safari (fait pour Zeste via WebKitGTK ; pas encore fait ici).

## 8. Méthode de travail attendue

- Lire le code concerné avant de modifier, ne pas réécrire inutilement.
- Un changement à la fois, reconstruire (`sh build.sh`), tester (au minimum un smoke test navigateur : tous les onglets, démarrer/terminer une séance, ouvrir les sheets du Profil).
- À la fin de chaque livraison : incrémenter `APP_VERSION` et expliquer à YaYa ce qui a changé.
