FROM node:24-bookworm AS base
WORKDIR /app

FROM base AS deps
COPY app/package.json app/package-lock.json ./
RUN npm ci

FROM deps AS build
COPY app/ .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD [ "node", "build" ]
