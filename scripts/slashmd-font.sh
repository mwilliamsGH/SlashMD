#!/usr/bin/env bash
# Re-apply a custom SlashMD editor font size after a (re)install wipes it.
#
# SlashMD's webview ignores `editor.fontSize` and has no font-size setting of
# its own, so the only lever is patching the bundled `dist/webview.css`. Any
# reinstall (including rebuilding this fork) ships a fresh CSS and wipes the
# patch — re-run this script afterward.
#
# Usage: slashmd-font.sh [size]    (default 16)
# Then fully quit VS Code (Cmd+Q) and reopen — closing the window won't flush
# the cached webview.
#
# Idempotent and version-agnostic: keeps a pristine `webview.css.orig` backup
# and strips any prior patch line before re-applying.
set -euo pipefail
SIZE="${1:-16}"
MARKER="/* slashmd-font-patch */"
found=0
for css in "$HOME"/.vscode/extensions/slashmd.slashmd-*/dist/webview.css; do
  [ -f "$css" ] || continue
  found=1
  [ -f "$css.orig" ] || cp "$css" "$css.orig"          # pristine backup, once per version
  grep -v -F "$MARKER" "$css" > "$css.tmp" && mv "$css.tmp" "$css"   # strip any prior patch line
  perl -0pi -e "s/--vscode-font-size:[^;}]*/--vscode-font-size:${SIZE}px/g" "$css"
  printf '\nbody,.editor-input,.editor-paragraph{font-size:%spx!important;}%s\n' "$SIZE" "$MARKER" >> "$css"
  echo "patched: $css  ->  ${SIZE}px"
done
[ "$found" = 1 ] || { echo "No SlashMD install found under ~/.vscode/extensions/"; exit 1; }
echo "Done. Quit VS Code with Cmd+Q and reopen to see it."
