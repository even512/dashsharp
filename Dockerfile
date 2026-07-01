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

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1

LABEL org.opencontainers.image.title="Dash#" \
      org.opencontainers.image.description="Selfhosted Homelab-Dashboard mit frei verschiebbaren Kacheln und Live-Widgets" \
      org.opencontainers.image.source="https://github.com/even512/dashsharp"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
