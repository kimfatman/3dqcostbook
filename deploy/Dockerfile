FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ARG VITE_SELF_HOSTED=true
ENV VITE_SELF_HOSTED=${VITE_SELF_HOSTED}

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
