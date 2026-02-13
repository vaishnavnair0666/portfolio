FROM node:24-bookworm AS base
WORKDIR /main

FROM rust:bookworm AS wasm-builder
WORKDIR /main/wasm/engine

RUN cargo install wasm-pack
COPY wasm/engine/Cargo.toml wasm/engine/Cargo.lock ./
COPY wasm/engine/ ./
RUN wasm-pack build --release --target web

FROM base AS deps
WORKDIR /main/app

COPY app/package.json app/package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /main
COPY app/ ./app
COPY --from=wasm-builder /main/wasm ./wasm

WORKDIR /main/app
RUN npm run build

FROM node:24-bookworm AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /main/app/build ./build
COPY --from=build /main/app/node_modules ./node_modules
COPY --from=build /main/app/package.json ./package.json

EXPOSE 3000

CMD ["node", "build"]
