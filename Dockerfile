# --- Build -------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Serve (static files, nginx unprivileged on port 8080) --------------------
# The live relay (server/live.mjs, no dependency) runs next to nginx, with the Node binary of the build stage.
FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN mkdir -p /data && chown nginx /data
# Node needs libstdc++ and libgcc: taken from the same image as the binary, so their versions always match.
COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build /usr/lib/libstdc++.so.6 /usr/lib/libgcc_s.so.1 /usr/lib/
COPY --chmod=755 docker/40-live-relay.sh /docker-entrypoint.d/40-live-relay.sh
COPY server/live.mjs /opt/live/live.mjs
USER nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Rooms of the live broadcast survive a restart; mount a volume here to keep them across re-deployments.
ENV LIVE_DATA_DIR=/data
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
