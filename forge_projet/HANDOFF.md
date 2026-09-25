# Passation du projet Forge — pour Claude Code

Tu reprends **Forge**, une app web de suivi de musculation pour iPhone, développée pour **Yannick Wahler** (« YaYa ») selon la même méthode que son autre app, **Zeste** (bar à cocktails). Lis ce document avant de toucher au code.

## 1. Le propriétaire et ses exigences

- Yannick parle **français** : réponds et écris l'interface en français.
- Usage **solo sur iPhone (Safari)**. Cible réelle = Safari/WebKit, même si le développement peut se tester sous Chromium.
- **Véracité des informations d'exercice** : toute consigne d'exécution ou de sécurité ajoutée doit s'appuyer sur des repères techniques reconnus (alignement articulaire, dos neutre, amplitude contrôlée...). Ne jamais inventer une consigne dangereuse. En cas de doute, reste conservateur et renvoie vers un professionnel.
- **100% local** : aucun backend, aucun compte, aucun appel réseau. Tout est stocké dans `localStorage` (clé `forge.v1`).
- **Numérotation des versions** : version actuelle **1.4**. Incrémente `APP_VERSION` (`src/init.js`) à chaque livraison notable.
- Copyright affiché dans « À propos » : `© <année> Yannick Wahler. Tous droits réservés.` (constante `COPYRIGHT`, `src/init.js`).
- Cahier des charges d'origine : voir la conversation initiale (résumé ci-dessous, section 6).

## 2. Démarrage rapide

```sh
cd forge_projet
sh build.sh   # assemble dist/forge.html ET copie vers ../index.html (racine du dépôt)
```

Pas de framework, pas de dépendance npm pour l'app elle-même. Pour tester dans un vrai navigateur : ouvrir `index.html` directement (`file://`), ou le servir avec `python3 -m http.server`.

**WebKit (moteur de Safari) est installé depuis la v1.4** (`npx playwright install webkit`, l'hôte `cdn.playwright.dev` a été autorisé dans les réglages réseau de l'environnement). Lancer chaque test dans les deux moteurs : Chromium via `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, WebKit via `webkit.launch()` avec `hasTouch:true, isMobile:true`. Attendre la disparition de `#splash` avant d'interagir, et ne pas lire `localStorage` juste après une action : l'écriture est différée de 400 ms (appeler `persistNow()` dans le test si besoin).

Pour un smoke test automatisé (Playwright/Chromium déjà installé dans les environnements Claude Code cloud) : ouvrir la page, cliquer sur chaque onglet, démarrer une séance, cocher une série, terminer la séance, vérifier l'absence d'erreurs console (`page.on('pageerror', ...)`).

## 3. Architecture

**Un seul fichier HTML final** (`index.html` à la racine = `forge_projet/dist/forge.html`), HTML + CSS + JS vanilla assemblés par `build.sh`. Ordre de concaténation (important, voir `build.sh`) :

```
style.css
data_equipment.js data_exercises.js
core.js engine.js
ui_shell.js fx.js timer.js charts.js trophies.js
view_today.js view_history.js view_progress.js view_profil.js
init.js
```

- **`data_equipment.js`** : catalogue du matériel (`EQUIP_TYPES`), poids réellement possédés (`S.equipment.weights`).
- **`data_exercises.js`** : bibliothèque d'exercices (`EXOS`, 98 exercices depuis la v1.3). `isTimed(def)` repère les exercices mesurés en secondes (consigne contenant « en secondes »). Les catégories d'affichage par matériel sont dans `data_equipment.js` (`EXO_CATS`, `exoCategory(e)` : l'équipement principal, le banc n'étant qu'un accessoire). Chaque exercice a un `pattern` (squat/hinge/push/pull/lunge/core/calf), des `muscles`, un `equip` requis, des `cues` et une consigne `safety`.
- **`core.js`** : état global `S` (persisté via `save()`/`load()` dans `localStorage`), utilitaires de date, agrégats d'historique (PR, volume, streaks).
- **`engine.js`** : moteur de suggestion 100% local. `getOrCreateDraft()` génère ou récupère la séance du jour. `generateEngineSession()` fait la rotation des groupes musculaires + progression de charge. `buildExportPrompt()` / `importProgramJSON()` gèrent l'aller-retour avec une IA externe (voir section 5).
- **`ui_shell.js`** : tabbar, sheets/modals, toast, délégation d'actions par `data-a="nom"` → `ACT.nom(dataset, élément)` (clic) et `data-c="nom"` (changement d'un input).
- **Vues** (`view_*.js`) : chacune expose une fonction assignée à `VIEWS.<id>` et ajoute ses handlers à `ACT` via `Object.assign(ACT, {...})`. **Convention importante, comme dans Zeste** : si tu ajoutes un module après un autre, tu peux enrichir `ACT` par `Object.assign`, ou redéfinir une fonction existante (la déclaration la plus tardive gagne, hissage JS). Avant de modifier une fonction, vérifie qu'elle n'est pas redéfinie ailleurs.
- **État** (`S`, voir `core.js: defaultState()`) : `equipment`, `prefs` (exclus/privilégiés), `goals`, `sessions` (historique complet), `draft` (séance du jour, éditable), `custom` (« Ma séance » en cours de composition : `{exos:[{exoId,sets}], name}`), `templates` (modèles enregistrés), `importedProgram` (file d'attente de séances importées), `medals` (`{famille: {t: palier 0-4, d: {palier: date ISO}}}`), `settings` (dont `todayTab` : `custom`/`proposal`, et `name`, le prénom affiché dans le profil), `meta` (dont `prCount`). L'ancien champ `trophies` (v1.0-1.1) est supprimé au chargement.
- **Rendu** : `renderView(id)` régénère tout le HTML de l'onglet actif. `changed()` sauvegarde et redessine, sauf si une sheet est ouverte (elle sera redessinée à la fermeture via `dirtyOnClose`). Les inputs texte (reps/poids) utilisent l'événement `change` (pas `input`) pour ne pas perdre le focus à chaque frappe — ils ne déclenchent qu'un `save()`, pas un `changed()` complet.

### Piège déjà rencontré

- **Dates en heure locale, jamais `toISOString()`** : `toISOString()` convertit en UTC ; en Suisse (UTC+1/+2) un minuit local devient la veille. Avant la v1.2, `weekKey()` renvoyait un dimanche et la boucle des semaines consécutives dérivait d'un jour par semaine, cassant les séries de plus d'une semaine. Toujours passer par `localISO(d)`, `todayISO()`, `addDaysISO()` (`core.js`). Les horodatages complets (`startedAt`, `completedAt`) restent en ISO UTC, c'est voulu.
- **Info-bulles des graphiques** : un point de graphique est focusable (`tabindex`) ; le `focusin` se déclenche avant le `click`. Un clic ne doit donc pas « basculer » la bulle, sinon elle s'ouvre au focus puis se ferme au clic (bug trouvé par test). Un appui sur un point affiche toujours sa bulle, un appui ailleurs la masque.
- **Fermeture différée de `#overlay`** : `closeSheet()` nettoie l'overlay 300 ms plus tard. Depuis la v1.2 un compteur (`overlayGen`) empêche ce nettoyage d'effacer une sheet ou une modale ouverte entre-temps (ex. confirmation → célébration). Toujours passer par `openSheet`/`openModal`.

- **`#restbar` (barre de repos) chevauchant le contenu au scroll** : `#restbar` est positionné en `position:absolute` par rapport au viewport (hors du conteneur scrollable `.view`), donc il reste visuellement fixe pendant que le contenu défile en dessous. Le bouton « Terminer la séance » pouvait se retrouver caché derrière au mauvais moment. Fix appliqué : `padding-bottom` généreux (`180px`) sur `.view` pour garantir qu'on peut toujours faire défiler les boutons au-dessus de la zone occupée par la barre de repos. Si tu ajoutes d'autres éléments fixes en bas d'écran, vérifie ce chevauchement.
- **Sélecteurs ambigus `data-a="closesheet"`** : le `scrim` (fond assombri) ET les boutons de fermeture partagent `data-a="closesheet"`. Si tu écris un test Playwright, cible précisément le bouton (`.sheet-hd [data-a="closesheet"]` ou `.center-modal [data-a="closesheet"]`), sinon le clic peut atterrir sur le scrim et être intercepté par la sheet/modal elle-même.
- **Un seul `#overlay`** : ouvrir une sheet ou une modale remplace le contenu de `#overlay`. Si tu ouvres une modale (ex. avertissements d'import) pendant qu'une sheet est affichée, elle la remplace plutôt que de s'empiler. C'est voulu pour rester simple, mais attention si tu enchaînes plusieurs `openSheet`/`openModal` avec des `setTimeout`.
- **Import d'un programme alors qu'une séance du jour existe déjà** : `getOrCreateDraft()` ne régénère la séance que si aucun brouillon n'existe pour aujourd'hui. `importProgramJSON()` doit donc explicitement remplacer `S.draft` si celui-ci n'a pas encore été démarré (`!S.draft.startedAt`), sinon l'import importé silencieusement ne s'affiche jamais. Ce cas est couvert par un test Playwright dédié — ne pas régresser.
- **`<svg>` sans taille par défaut** : le helper `icon(name)` (`ui_shell.js`) renvoie un `<svg viewBox="0 0 24 24">` sans attribut `width`/`height`. Sans règle CSS qui le contraint, un navigateur lui donne sa taille de remplacement par défaut (300×150 px), ce qui casse le layout et intercepte les clics des éléments voisins (bug réel trouvé par un test Playwright : le bouton « Série validée » débordait sur les steppers au-dessus). Fix : règle globale `svg{width:20px;height:20px;...}` dans `style.css`, que les règles plus spécifiques (`.icon-btn svg`, `.tabbtn svg`, `.chev`, etc.) continuent de surcharger normalement. **Si tu ajoutes un nouvel endroit qui utilise `icon(...)` sans classe englobante déjà stylée, vérifie qu'il hérite bien d'une taille raisonnable** (soit la règle globale, soit une règle dédiée).

## 4. Bibliothèque d'exercices

65 exercices couvrant poids du corps, haltères, barre, kettlebell, élastiques, banc, barre de traction. Chaque fiche a des consignes d'exécution et une note de sécurité rédigées à partir de repères techniques standards et largement consensuels (alignement du dos, amplitude contrôlée, etc.), **pas** de recherche de sources spécifiques par exercice (contrairement à Zeste où chaque recette doit être vérifiée auprès d'une source nommée). Si YaYa demande une vérification plus poussée d'un exercice en particulier (ex. comparaison avec NSCA/ACSM/NASM), traite-la comme pour Zeste : cite la source utilisée.

## 5. Moteur de suggestion et IA externe

- Rotation musculaire par « ancienneté » (`daysSinceTrained`) pondérée par l'objectif (`S.goals.emphasis`), avec forte pénalité si un groupe a été travaillé il y a moins de 2 jours (récupération).
- Progression de charge simple : si toutes les séries de la dernière séance ont atteint le haut de la fourchette de reps avec un ressenti raisonnable (RPE ≤ 7,5), le poids suggéré grimpe au palier suivant possédé (`S.equipment.weights`) ou par défaut (`DEFAULT_INCREMENT`).
- Export/import façon Zeste : `buildExportPrompt()` génère un texte à copier-coller dans une IA externe ; la réponse attendue est un JSON `{ "sessions": [...] }` que l'utilisateur importe via le champ fichier cachpe `#fileImport` (attaché en dur dans le HTML — nécessaire pour que la sélection de fichier fonctionne sur iOS, même piège que dans Zeste).

## 6. Mode focus de la séance en cours (v1.1)

YaYa a demandé, après la v1.0, une expérience proche du « mode barman » de Zeste pour la séance en cours : un exercice à la fois plutôt qu'une longue liste de cartes, moins d'info affichée d'un coup, plus d'animations, et un anneau de repos plus lisible. C'est implémenté dans `view_today.js` :

- **État module-local** `liveFocusIdx` (index de l'exercice affiché) et `focusAnimDir` (`"r"`/`"l"` pour l'animation d'entrée de carte) — volontairement hors de `S` car c'est un état d'affichage éphémère, pas une donnée à persister.
- `renderFocusRegionInner(draft)` régénère les points de progression + la carte + la nav ; `refreshFocusRegion()` ne remplace que `#focusRegion` (et l'eyebrow + la pastille de repos globale) plutôt que toute la vue, pour des interactions rapides sans perdre le scroll.
- La carte (`renderFocusCard`) a 3 états exclusifs pour un même exercice : **repos** (anneau SVG animé, voir `ringSVG`/`updateFocusRing`), **terminé** (badge + récap des séries), **actif** (gros steppers +/- pour reps et charge, plus de saisie clavier). `updateFocusRing()` est appelée à chaque tick par `timer.js` pour animer l'anneau sans tout redessiner.
- Navigation : flèches précédent/suivant, points cliquables en haut, ou la sheet « Voir la séance complète » (`openOverview`) qui liste tous les exercices avec leur progression et permet d'ajouter/remplacer/retirer — l'ajout/retrait/remplacement d'exercice a été déplacé hors de la carte principale pour ne garder que l'essentiel visible pendant l'effort.
- Avance automatique : valider la dernière série d'un exercice fait passer `liveFocusIdx` à l'exercice suivant ; le repos continue en tâche de fond (petite pastille `#restbar` globale) sans bloquer la navigation.
- La fiche détail d'un exercice (`showExoInfo`) a été enrichie : gros pictogramme, consignes numérotées avec animation d'apparition décalée (`.cue-item`, `animation-delay`), encart sécurité mis en évidence (`.safety-box`).
- Motivation : `motivRowHTML()` sur l'écran « avant de commencer » affiche un anneau des séances de la semaine (objectif = `S.goals.daysPerWeek`) et un badge de streak. Fonctions ajoutées dans `core.js` : `sessionsThisWeek()`.

## 7. Séances au choix, statistiques et médailles (v1.2)

Demande de YaYa : pouvoir dire quelle séance on veut faire, séparer la proposition de « notre » séance, retirer « Comment te sens-tu ? », plus de statistiques et de graphiques, des trophées à paliers, plus d'animations.

- **Onglet Aujourd'hui** : contrôle segmenté **Proposée / Ma séance** (`S.settings.todayMode`).
  - *Proposée* : puces de **type de séance** (`SESSION_TYPES` dans `engine.js` : Auto, Corps complet, Haut, Bas, Poussée, Tirage, Bras, Gainage & cardio). `generateEngineSession(type, avoid)` restreint le vivier par muscle principal (`poolForType`). « Auto » choisit selon la récupération (`resolveAutoType`) et l'explique dans `draft.reason`. « Autre proposition » pénalise les exercices de la proposition précédente et ajoute un léger aléa, pour que la proposition change vraiment.
  - *Ma séance* : composition libre (`S.custom`), nombre de séries par exercice, **modèles** réutilisables (`S.templates`), « Partir de la séance proposée », et « Refaire cette séance » depuis l'historique. `buildCustomSession()` calcule charges et répétitions avec le même moteur de progression.
  - Sélecteur d'exercices commun (`openPicker`) : recherche, filtre par muscle, multi-sélection avec bouton en pied de sheet (`openSheet(html,{tall, footer})`).
- **Fin de séance** : plus de question de ressenti. `finishSession` demande confirmation seulement s'il reste des séries non validées ; les exercices sans série validée ne sont pas enregistrés. Célébration : confettis (canvas, `confettiBurst`), XP gagnée, montée de niveau, médailles débloquées.
- **Séance en cours** : rappel « la dernière fois », saisie directe d'une valeur en touchant le nombre (`promptNumber`), report d'une modification de charge/reps sur les séries suivantes, séries record marquées `st.pr` (un record doit battre l'historique **et** les séries déjà validées de la séance, sinon il compterait deux fois). `isNewPR` ne compte plus la toute première séance d'un exercice.
- **Médailles** (`trophies.js`) : 15 familles × 4 paliers (bronze, argent, or, platine), seuils dans `MEDALS[].t`, valeur courante via `val()`. `checkMedals(silent)` est appelé à l'initialisation en mode silencieux (rattrapage après mise à jour) puis à chaque fin de séance. Unité au singulier via `one`.
- **Niveau** (`core.js`) : XP = 50/séance + 2/série + 10/record + points de médailles (10/25/50/100). Niveau L atteint à 125·L·(L−1) XP. Titres de « Apprenti·e » à « Légende de la forge ».
- **Progrès** : sections Vue d'ensemble (niveau, chiffres clés, calendrier de régularité sur 18 semaines, séances et tonnage par semaine avec objectif, répartition musculaire sur 30 jours, derniers records), Exercices (mini-courbes, fiche avec 1RM estimé ou meilleure série, tonnage par séance, dernières séances), Médailles (bilan par palier, prochains paliers, grille).
- **Graphiques** (`charts.js`) : suivi des règles du skill *dataviz* — une seule série par graphique, couleur d'accent, période en cours mise en valeur, étiquettes sélectives, lignes de grille fines, info-bulle au toucher, tableau « Voir les données » sous chaque graphique. Colonnes et calendrier en **HTML** (piège Safari de Zeste : les animations CSS à l'intérieur d'un SVG bouclent quand un parent anime) ; courbes en SVG révélées par un `clip-path` animé sur leur conteneur HTML.
- **Animations** : `renderViewAnimated(id)` ajoute la classe `.enter` le temps d'une entrée d'onglet/de section (apparition décalée des éléments `.stagger`, barres qui poussent, compteurs `data-count` animés par `animateCounts`). Les rendus après une simple action (`changed()`) ne rejouent pas ces animations. Indicateur glissant des contrôles segmentés : `segHTML` + `settleSegs`. Tout est coupé sous `prefers-reduced-motion`.

## 8. Planning, profil et médailles au long cours (v1.3)

Demande de YaYa : trier les exercices par matériel, en ajouter (pectoraux aux haltères notamment), mettre « Ma séance » en premier avec la possibilité de la compléter par l'app, mémoriser des séances et leur assigner des jours pour qu'elles s'affichent à l'ouverture, une animation de lancement, plus d'animations, plus d'infos dans le profil, plus de trophées dont les plus durs demandent des années, et en séance une vue d'ensemble discrète en haut avec navigation par glissement et par appui.

- **Exercices** : +33 exercices (dont 8 pour les pectoraux aux haltères, avec des variantes sans banc : développé et écarté au sol). Sélecteur et réglages « inclus / exclus » groupés par matériel puis par muscle principal, filtre par matériel dans le sélecteur.
- **Ma séance en premier** (`S.settings.todayTab`, défaut `custom`). « ✨ Compléter » / « Laisser l'app choisir » : `suggestComplement(existingIds, n)` (`engine.js`) vise les muscles et mouvements pas encore couverts ; les exercices ajoutés ainsi portent `app:true` (badge ✨).
- **Planning hebdomadaire** : chaque séance enregistrée (`S.templates[]`) a `days` (0 = lundi … 6 = dimanche), un jour ne porte qu'une séance. Bandeau « Mon planning » (touche un jour → `openPlanDaySheet`). À l'initialisation, `applyPlannedSession()` charge la séance du jour dans « Ma séance » (une seule fois par jour : `S.custom.planDate`, pour ne pas écraser des modifications) et l'animation de lancement l'annonce. Une séance faite le jour prévu est marquée `planned` (médaille « Planificateur »). Après un import de programme IA, l'onglet bascule sur « Proposée » où le programme s'affiche.
- **Séance en cours** : barre collante en haut (`liveStripHTML`) — exercices terminés, séries restantes, temps estimé, puces cliquables par exercice avec anneau de progression (`conic-gradient`, en HTML). Glisser la carte d'exercice (événements pointer, `touch-action: pan-y` pour garder le défilement vertical natif) ; après un glissement, `suppressClicksUntil` empêche le clic parasite sur le bouton sous le doigt. Démarrer ou terminer une séance remet la vue en haut (`scrollTodayTop`) — bug trouvé en test : la vue gardait le défilement de l'aperçu et cachait le haut de la carte.
- **Lancement** (`showSplash` dans `init.js`) : marteau, enclume, étincelles, lueur, puis le mot « Forge » ; un appui la passe ; ~2 s, réduite sous `prefers-reduced-motion`. Les tests Playwright doivent attendre `#splash` détaché avant d'interagir.
- **Profil** : carte d'identité (prénom modifiable, niveau, ancienneté), bilan des médailles par palier, « Mes habitudes » (exercice favori, jour et moment préférés, durée moyenne, meilleure semaine…), « Mes records » (5 charges les plus lourdes). Fonctions dans `core.js` (`favoriteExercise`, `favoriteWeekday`, `favoriteMoment`, `bestWeek`, `topLifts`).
- **Médailles** : 24 familles en 5 catégories (`MEDAL_CATS`). Les platines visent plusieurs années (500 séances, 104 semaines d'affilée, 5 « années de fer » à 48 semaines actives, 1,5 million de kg…). Vérifié sur 10 semaines de données simulées régulières : aucun or ni platine. « Deux fois plus fort » compare au meilleur des 3 premières séances d'un exercice pratiqué depuis 90 jours au moins (sinon une progression de débutant donnait le platine en quelques semaines). Les paliers déjà obtenus sous d'anciens seuils sont conservés (`checkMedals` ne fait que monter).

## 9. Pictogrammes, couleurs, séances enregistrées, optimisation (v1.4)

- **Pictogrammes** (`data_pictos.js`) : 19 silhouettes au trait (squat, fente, soulevé de terre, développé couché, écarté, pompe, dips, développé militaire, élévations, rowing, traction, curl, triceps, pont, gainage, crunch, mollets, cardio, port de charges), attribuées à chaque exercice par `PICTO_OF` (tous les 98 exercices ont une entrée ; vérifié par script). `exoIcon(def, taille)` rend la tuile ; tailles `xs/sm/(défaut)/lg/xl`. Les emojis de flèches ont disparu.
- **Code couleur par zone** (`REGIONS`, `regionOf(def)` d'après le muscle principal) : poussée = magenta, tirage = bleu, jambes = vert, gainage & cardio = jaune (**remplacé en v1.5**, voir §9 bis). Teintes tirées de la palette documentée du skill *dataviz* et validées avec son script (`validate_palette.js --pairs all`, clair et sombre) : toutes les vérifications passent ; la séparation daltonisme (ΔE 6,9) est dans la zone tolérée **à condition d'un encodage secondaire** — la couleur est donc toujours accompagnée du pictogramme et/ou du libellé. Le trait du pictogramme est foncé sur le magenta et le jaune clairs (contraste insuffisant avec le blanc), blanc ailleurs (`--r-*-ink`). L'orange reste réservé aux actions et le rouge au danger. Les variables CSS : `--r-push`, `--r-pull`, `--r-legs`, `--r-core` (+ `-ink`), activées par les classes `.r-push` … qui posent `--rc`/`--ri`. **Piège rencontré** : une valeur par défaut `--rc` posée sur `.xico` (même spécificité, déclarée après) écrasait les classes de zone ; les défauts passent désormais par `var(--rc, var(--tint))`.
- **Bouton « i »** partout : lignes de « Ma séance » et de la proposition, cartes de séances enregistrées, sélecteur (la fiche ouverte depuis le sélecteur a un bouton « Retour à la liste » qui conserve la recherche, les filtres et la sélection : `renderPickerSheet()`), carte de la séance en cours (`.fc-info`). Fiche enrichie : zone, matériel, faits clés (séries × reps, repos, unilatéral), exercices du même muscle principal avec « Remplacer » (en séance) ou « + Ajouter ».
- **Séances enregistrées** : liste verticale de cartes repliables (`openTpls`), 3 visibles puis « Afficher les N autres » (`showAllTpls`), sections « Mon planning » et « Mes séances enregistrées » repliables (état mémorisé dans `S.settings.ui`). Chaque carte : barre de la couleur de zone dominante, jours, mini-pictos ; dépliée : exercices, « Commencer » (démarre directement, `startTemplate`), « Modifier », menu (jours et nom, dupliquer, supprimer). « Ma séance » : mode « Réorganiser » (↑/↓), barre d'équilibre par zone avec légende.
- **Planning** : jours colorés par la zone de la séance prévue, pastille rouge pour une séance prévue non faite plus tôt dans la semaine, résumé « Prochaine : jeu. · Jambes », bandeau du jour avec bouton ▶ pour démarrer, et depuis un jour vide « Composer une nouvelle séance pour le … » (le jour est pré-coché à l'enregistrement : `S.custom.pendingDays`).
- **Optimisation**, mesurée sur 3 ans simulés (470 séances), processeur ralenti ×4 : Historique 64 → 6 ms (affichage par paquets de 25, `histLimit`), Médailles 75 → 4 ms, Profil 19 → 6 ms, appui sur +/− 59 → 0 ms (85 → 12 ms avec rendu). Moyens : `memo(clé, fn)` invalidé par `DATA_VER` à chaque `save()` (statistiques, records, valeurs des médailles), écriture `localStorage` différée (`persistNow()` forcé sur `pagehide`/`visibilitychange` ; `persistBlocked` pendant la réinitialisation), séances terminées compactées (`compactSession` : −20 % de stockage). **Règle** : toute modification de `S.sessions` doit passer par `save()`, sinon le cache sert des valeurs périmées.

## 9 bis. Accueil, animations et orange (v1.5)

- **Couleurs** : le rose disparaît. Poussée = orange (`#eb6834` clair / `#d95926` sombre), tirage = bleu, jambes = vert d'eau (`#1baf7a`, trait foncé `#06291c` en clair car le blanc n'y contraste qu'à 2,7), gainage & cardio = graphite neutre. Orange/bleu/vert d'eau validés par `validate_palette.js --pairs all` (clair et sombre). Dégradé d'accent « orange cosmique » `--grad` et halo `--glow` pour les éléments héros.
- **Accueil** (`renderTodayPreview`) : salutation selon l'heure et le prénom, 3 pastilles compactes (objectif de la semaine en anneau, semaines d'affilée, niveau avec barre d'XP ; compteurs animés), puis la **carte « action du jour »** (`heroHTML`) dont le contenu suit une priorité : séance faite aujourd'hui (carte verte → détail) > séance planifiée du jour (`startTemplate`) > « Ma séance » prête (`startCustom`) > proposition de l'app (`startSession`). Pictos blancs, gros bouton « C'est parti », reflet animé limité à 3 passages. En dessous, séparateur « Préparer une séance » et les deux volets ; « Ma séance » affiche d'abord le constructeur (état vide compact), puis les séances enregistrées, puis le planning. L'ancienne ligne de motivation, la carte « séance faite » et le bandeau du jour sont absorbés par la carte héros. Quand la carte héros montre déjà la proposition, le volet « Proposée » n'en répète que la raison.
- **`fx.js`** (nouveau, après `ui_shell.js`) : onde au toucher sur les boutons (`RIPPLE_SEL`), `floatText()` (« ✓ Série n », « 💥 Record ! » à la validation), `morphHeight(el, mutate)` et `animateCollapse(el, ouvert, html)` pour déplier/replier **sans re-rendu complet** (cartes de séances enregistrées, sections repliables, « Afficher les N autres » : les corps vivent dans un `.clp`), `showLaunch(séance)` : écran de lancement plein écran (décompte 3-2-1, ondes, gerbe d'étincelles, « C'est parti ! », nom, pictos qui arrivent, phrase de motivation, vibrations), ≈ 3 s, touche pour passer, variante courte si « réduire les animations ». Appelé par `startSession` et `startCustom` (donc aussi `startTemplate`). **Tests** : attendre `#launch` détaché après un démarrage.
- **Divers** : chevrons corrigés (le tracé était dessiné pour 8×13 dans une boîte 24×24, d'où des chevrons minuscules), toast en haut en pilule qui tombe, glissement directionnel entre onglets (`TAB_ORDER`, `data-dir`) et entre volets (`paneDir`), bouton « i » en badge sur l'icône de l'exercice (libère la place du nom), rebond de la pastille du bandeau de séance après une série validée (`stripBump`).

## 10. Cahier des charges d'origine (résumé)

Voir le fichier `4a3df5ee-cahier-des-charges-forge.md` fourni au lancement du projet pour le texte complet. Points clés déjà couverts en v1.0 : matériel personnalisable et extensible, bibliothèque d'exercices filtrée, inclusion/exclusion d'exercices, objectifs personnalisés, suivi détaillé de séance (éditable, timer de repos, coche rapide), moteur de suggestion 100% local avec export/import IA, graphiques de progression, PR, streaks/régularité, trophées, écran d'accueil = séance du jour, thème clair/sombre automatique, page À propos avec copyright.

## 11. Chantiers proposés pour la suite

1. Historique modifiable a posteriori (éditer les séries d'une séance déjà enregistrée ; la suppression existe depuis la v1.2).
2. Export/partage d'une séance ou d'un récap (image), comme le Rewind de Zeste.
3. Tests automatisés versionnés dans le dépôt (actuellement les tests Playwright ont été écrits et exécutés en session mais pas committés — à formaliser dans un dossier `tests/` si utile).
4. Vérification de chaque exercice avec une source nommée (NSCA/ACSM/NASM) si YaYa souhaite le même niveau de rigueur que les recettes de Zeste.
5. ~~Test WebKit~~ fait depuis la v1.4 (WebKit 26 via Playwright). Reste : un essai sur un vrai iPhone (gestes, retour haptique, safe areas). Historique de la note : WebKit était **bloqué dans cet environnement cloud** — `playwright install webkit` télécharge le binaire depuis `cdn.playwright.dev` / `playwright.download.prss.microsoft.com`, tous deux refusés par la politique réseau de l'environnement (403 « request blocked »). Les dépendances système WebKitGTK, elles, s'installent sans problème. Pour débloquer : ajouter l'un de ces deux hôtes à la liste des domaines autorisés dans les réglages réseau de l'environnement (menu de l'environnement cloud → Modifier), puis relancer `playwright install webkit`.
6. Geste de balayage (swipe) pour naviguer entre exercices en mode focus, en plus des flèches actuelles — nécessiterait de gérer `touchstart`/`touchend` proprement sans casser le scroll vertical.

## 12. Aperçu en artifact Claude

En plus du dépôt Git (source de vérité), l'app peut être publiée comme Artifact claude.ai pour un aperçu rapide sans avoir à cloner/ouvrir le fichier : extraire le `<title>`, le `<style>` et le contenu de `<body>` de `dist/forge.html` (sans les balises `<!doctype>`/`<html>`/`<head>`/`<body>`, qu'un Artifact fournit lui-même), puis publier ce fragment avec l'outil Artifact. L'app n'utilise aucune ressource externe (polices système, pas de script CDN), donc elle passe telle quelle la politique de sécurité des Artifacts. Ce n'est qu'un aperçu de confort : le livrable réel reste le fichier unique du dépôt.

## 13. Méthode de travail attendue

- Lire le code concerné avant de modifier, ne pas réécrire inutilement.
- Un changement à la fois, reconstruire (`sh build.sh`), tester (au minimum un smoke test navigateur : tous les onglets, démarrer/terminer une séance en mode focus, naviguer entre exercices, ouvrir les sheets du Profil).
- À la fin de chaque livraison : incrémenter `APP_VERSION` et expliquer à YaYa ce qui a changé.
