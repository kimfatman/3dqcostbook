FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ARG VITE_SELF_HOSTED=true
ENV VITE_SELF_HOSTED=${VITE_SELF_HOSTED}
ARG VITE_CLOUDBASE_ENV_ID
ARG VITE_CLOUDBASE_PUBLISHABLE_KEY
ENV VITE_CLOUDBASE_ENV_ID=${VITE_CLOUDBASE_ENV_ID}
ENV VITE_CLOUDBASE_PUBLISHABLE_KEY=${VITE_CLOUDBASE_PUBLISHABLE_KEY}

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build \
  && groupadd --system --gid 10001 costbook \
  && useradd --system --uid 10001 --gid costbook --home-dir /app --shell /usr/sbin/nologin costbook \
  && chown -R costbook:costbook /app

EXPOSE 3000
USER costbook
CMD ["node", "dist/index.js"]
