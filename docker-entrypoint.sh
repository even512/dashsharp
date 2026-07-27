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

# ---------------------------------------------------------------------------
# Rechte ablegen (der Prozess haelt SSH-Keys, API-Tokens und VNC-Passwoerter).
#
# Heikel ist dabei das gemountete /app/config: es gehoert dem Host. Auf Unraid
# ist das typischerweise nobody:users (99:100), bei `docker run` mit frischem
# Pfad root:root. Eine fest ins Image gebackene Kennung (USER node) wuerde bei
# bestehenden Installationen sofort an fehlenden Schreibrechten scheitern.
#
# Deshalb: die Kennung des vorhandenen Config-Verzeichnisses uebernehmen — die
# passt per Definition zum Volume, und es muss nichts umgehaengt werden. Ueber
# PUID/PGID laesst sie sich explizit vorgeben; ist das Verzeichnis frisch von
# Docker angelegt (root), wird auf 1000:1000 ausgewichen.
#
# Laeuft der Container bereits unprivilegiert (docker run --user), kann und
# muss hier nichts geaendert werden.
# ---------------------------------------------------------------------------
if [ "$(id -u)" = "0" ]; then
  CFG_UID="${PUID:-$(stat -c %u /app/config 2>/dev/null || echo 1000)}"
  CFG_GID="${PGID:-$(stat -c %g /app/config 2>/dev/null || echo 1000)}"

  # uid 0 waere kein Rechteabbau -> bewusst auf den node-Benutzer wechseln und
  # das Config-Verzeichnis mitnehmen.
  if [ "$CFG_UID" = "0" ]; then CFG_UID=1000; CFG_GID=1000; fi

  # Nur die App-Ebene anfassen, NICHT rekursiv durchs Config-Volume: das kann
  # auf einem Array-Share gross sein, und die Kennung stammt ohnehin daher.
  chown "$CFG_UID:$CFG_GID" /app /app/config 2>/dev/null || true

  # Schreibbarkeit pruefen, BEVOR wir die Rechte abgeben — sonst startet der
  # Server scheinbar sauber und scheitert erst beim ersten Speichern aus der UI.
  # ueber `sh -c` statt direkt `test`: su-exec fuehrt ein Binary aus, und ob
  # /usr/bin/test existiert, haengt am Basis-Image — `sh` ist immer da.
  if su-exec "$CFG_UID:$CFG_GID" sh -c '[ -w /app/config ]' 2>/dev/null; then
    echo "[dash#] laeuft als uid=$CFG_UID gid=$CFG_GID"
    exec su-exec "$CFG_UID:$CFG_GID" "$@"
  fi

  echo "[dash#] WARNUNG: /app/config ist fuer uid=$CFG_UID nicht beschreibbar —"
  echo "[dash#]           starte als root weiter. Rechte des gemounteten"
  echo "[dash#]           Verzeichnisses pruefen oder PUID/PGID passend setzen."
fi

exec "$@"
