FROM oven/bun:1 AS base
WORKDIR /usr/src/mail-rest

FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM base

ENV NODE_ENV=production

COPY --from=deps /usr/src/mail-rest/node_modules node_modules
COPY . .

USER bun

EXPOSE 3000/tcp
CMD [ "bun", "start" ]