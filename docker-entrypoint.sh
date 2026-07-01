#!/bin/sh
set -e

# Beim ersten Start die Standard-Konfiguration ins (gemountete) Volume legen.
# Vorhandene Dateien werden nie ueberschrieben – so ueberlebt jede Aenderung
# aus der UI ein Image-Update.
mkdir -p /app/config
if [ ! -f /app/config/services.yaml ]; then
  cp /app/defaults/services.yaml /app/config/services.yaml
  echo "[dash#] Standard-services.yaml nach /app/config kopiert"
fi

exec "$@"
