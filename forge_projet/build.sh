#!/bin/sh
# Assemble Forge en un seul fichier HTML autonome. À lancer depuis la racine du projet (forge_projet/).
cd "$(dirname "$0")"
mkdir -p dist
{
echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)"><title>Forge</title><style>'
cat src/style.css
echo '</style></head><body><div id="app"></div><nav class="tabbar" aria-label="Onglets"></nav><div id="restbar"></div><div id="overlay" role="dialog"></div><div id="toast" role="status" aria-live="polite"></div><input type="file" id="fileImport" accept="application/json,.json" style="display:none"><script>'
cd src; cat data_equipment.js data_exercises.js data_pictos.js core.js engine.js ui_shell.js fx.js timer.js charts.js trophies.js view_today.js view_history.js view_progress.js view_profil.js init.js; cd ..
echo '</script></body></html>'
} > dist/forge.html
cp dist/forge.html ../index.html
echo "dist/forge.html : $(wc -c < dist/forge.html) octets"
