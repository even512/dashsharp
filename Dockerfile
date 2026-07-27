FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Abhaengigkeiten zuerst (besseres Layer-Caching)
COPY package*.json ./
RUN npm ci --omit=dev

# App-Code. `server/` enthaelt die Modul-Registry und die Backend-Module und
# wird zur Laufzeit von server.js required — fehlt es im Image, startet der
# Container gar nicht (Cannot find module './server/registry').
COPY server.js ./
COPY server ./server
COPY public ./public

# Sanitisierte Standard-Konfiguration als Seed-Quelle. Echte /config-Daten
# liegen zur Laufzeit im gemounteten Volume und werden NICHT ins Image gebacken.
COPY config/services.yaml ./defaults/services.yaml

# Entrypoint (CRLF entfernen, damit es auch bei Windows-Checkouts laeuft)
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Nicht als root laufen: der Prozess haelt SSH-Keys, API-Tokens und
# VNC-Passwoerter im Speicher und liest/schreibt das gemountete Config-Volume.
#
# Der Rechte-Wechsel passiert NICHT ueber `USER`, sondern im Entrypoint: das
# gemountete /app/config gehoert dem Host (auf Unraid typisch nobody:users,
# 99:100). Ein fest eingebackenes `USER node` (uid 1000) koennte dort nicht
# schreiben — der Container waere bei jeder bestehenden Installation sofort
# gestorben. Der Entrypoint startet daher als root, uebernimmt die Kennung des
# vorhandenen Config-Verzeichnisses (bzw. PUID/PGID) und legt die Rechte erst
# dann ab.
#
# Trade-off ICMP: unprivilegiertes ping braucht auf dem HOST
#   sysctl -w net.ipv4.ping_group_range="0 2147483647"
# Fehlt das, meldet die Service-Status-Kachel fuer reine Hostnamen/IPs
# „ping_unavailable" und faellt automatisch auf einen TCP-Reachability-Check
# zurueck (siehe checkService in server.js) — HTTP- und host:port-Ziele sind
# davon ohnehin nicht betroffen.
RUN apk add --no-cache su-exec && mkdir -p /app/config

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1

LABEL org.opencontainers.image.title="Dash#" \
      org.opencontainers.image.description="Selfhosted Homelab-Dashboard mit frei verschiebbaren Kacheln und Live-Widgets" \
      org.opencontainers.image.source="https://github.com/even512/dashsharp"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
