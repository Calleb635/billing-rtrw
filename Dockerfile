
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

RUN mkdir -p \
      database data uploads public/uploads \
      auth_info_baileys backups logs \
    && chown -R node:node /app


FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s \
  --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
