# Real Sessions — one image serving the API and the built web app.
#
# Two stages so the toolchain does not ship: the web build needs Vite and its
# whole dependency tree, and none of that belongs in a running container.
#
# The server runs TypeScript directly through tsx rather than being compiled.
# That is a deliberate trade — a compile step would shave startup and image
# size, but the project has no build for the backend today, and adding one here
# would mean the thing that runs in production is not the thing the tests run
# against.

# --- web -------------------------------------------------------------------
FROM node:22-alpine AS web

WORKDIR /build
# Manifests first: this layer is cached until the dependencies actually change,
# which is what keeps an ordinary code change from reinstalling everything.
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# --- runtime ---------------------------------------------------------------
FROM node:22-alpine AS runtime

# dumb-init gives the process a real PID 1, so SIGTERM reaches the server and
# its shutdown handler closes Redis and Postgres cleanly instead of the
# container being killed mid-write.
RUN apk add --no-cache dumb-init

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# --include=dev is load-bearing: NODE_ENV=production is already set above, which
# makes npm omit devDependencies by default — and tsx, which runs the server,
# is one. Without this the image has no tsx, `npx` silently downloads it on
# every boot, and the container needs network access at startup to run at all.
RUN npm ci --include=dev && npm cache clean --force

COPY src/ ./src/
COPY --from=web /build/dist ./web/dist

# Never root. A container that is compromised should not also be privileged.
USER node

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/voice/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
# Resolved from node_modules, not through npx, so a missing tsx fails loudly
# at boot instead of being fetched from the network.
CMD ["./node_modules/.bin/tsx", "src/server.ts"]
