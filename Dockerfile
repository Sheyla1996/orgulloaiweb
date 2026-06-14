FROM node:lts-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Build cliente (sin SSR)
RUN npm run build

# Añade el archivo de versión (usa commit corto o fecha)
ARG VERSION=dev
RUN echo "$VERSION" > /app/dist/browser/assets/version.txt

FROM nginx:alpine AS production

COPY --from=builder /app/dist/browser /usr/share/nginx/html

EXPOSE 80

