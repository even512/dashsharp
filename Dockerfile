FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Abhaengigkeiten zuerst (besseres Layer-Caching)
COPY package*.json ./
RUN npm ci --omit=dev

# App-Code
COPY server.js ./
COPY public ./public

# Sanitisierte Standard-Konfiguration als Seed-Quelle. Echte /config-Daten
# liegen zur Laufzeit im gemounteten Volume und werden NICHT ins Image gebacken.
COPY config/services.yaml ./defaults/services.yaml

# Entrypoint (CRLF entfernen, damit es auch bei Windows-Checkouts laeuft)
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Nicht als root laufen: der Prozess haelt SSH-Keys, API-Tokens und
# VNC-Passwoerter im Speicher und liest/schreibt das gemountete Config-Volume.
# Das node-Image bringt den Benutzer `node` (uid 1000) bereits mit.
#
# Trade-off ICMP: unprivilegiertes ping braucht auf dem HOST
#   sysctl -w net.ipv4.ping_group_range="0 2147483647"
# Fehlt das, meldet die Service-Status-Kachel fuer reine Hostnamen/IPs
# „ping_unavailable" und faellt automatisch auf einen TCP-Reachability-Check
# zurueck (siehe checkService in server.js) — HTTP- und host:port-Ziele sind
# davon ohnehin nicht betroffen.
RUN mkdir -p /app/config && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1

LABEL org.opencontainers.image.title="Dash#" \
      org.opencontainers.image.description="Selfhosted Homelab-Dashboard mit frei verschiebbaren Kacheln und Live-Widgets" \
      org.opencontainers.image.source="https://github.com/even512/dashsharp"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
