FROM node:24.14.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@10.33.0
WORKDIR /workspace
RUN chown node:node /workspace && install -d -m 0700 -o node -g node /var/lib/ledgermind/invoices
COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/web/package.json apps/web/package.json
COPY --chown=node:node apps/api/package.json apps/api/package.json
COPY --chown=node:node packages/database/package.json packages/database/package.json
USER node
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN pnpm db:generate
