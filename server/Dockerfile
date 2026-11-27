# syntax=docker/dockerfile:1

# Build stage: compile TypeScript and prune dev dependencies. The toolchain is
# only needed when better-sqlite3 has no prebuilt binary for the target.
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Runtime: serverRoot resolves to /app, so configuration.json, templates and
# data live next to dist/.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY configuration.json ./configuration.json
COPY templates ./templates

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 5000

# Protected routes answer 401 without a token, which is enough to prove the
# process is up without exposing anything.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/info').then(r=>process.exit(r.status===401?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
