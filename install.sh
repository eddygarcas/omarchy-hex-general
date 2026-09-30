#!/bin/sh
# Puts `hex-general` on PATH and adds a desktop entry so the app launcher
# finds it. Safe to re-run. Remove with: ./install.sh --uninstall
set -eu
dir=$(cd "$(dirname "$0")" && pwd)
bin="${XDG_BIN_HOME:-$HOME/.local/bin}"
apps="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
state="${XDG_STATE_HOME:-$HOME/.local/state}/hex-general"

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$bin/hex-general" "$apps/hex-general.desktop"
  echo "Removed launcher and desktop entry (save game left in $state)."
  exit 0
fi

mkdir -p "$bin" "$apps" "$state"
chmod +x "$dir/hex-general"
ln -sf "$dir/hex-general" "$bin/hex-general"
cat > "$apps/hex-general.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Hex General
Comment=Ardennes 1944 hex wargame in the spirit of Panzer General
Exec=$bin/hex-general
Icon=applications-games
Terminal=false
Categories=Game;StrategyGame;
Keywords=wargame;panzer;general;hex;ardennes;
EOF
echo "Installed: $bin/hex-general and $apps/hex-general.desktop"
echo "Run it with: hex-general"
