FROM node:lts-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

# ⚠️ Este es el build correcto para SSR
RUN npm run build:ssr

# Añade el archivo de versión (usa commit corto o fecha)
ARG VERSION=dev
RUN echo "$VERSION" > /app/dist/browser/assets/version.txt


FROM node:lts-slim AS production
WORKDIR /app

# Solo necesitas las dependencias de producción
COPY package.json package-lock.json ./
RUN npm install --only=production --legacy-peer-deps

# Copia el resultado del build SSR
COPY --from=builder /app/dist /app/dist

EXPOSE 4001

# Sirve con Node.js (Angular Universal)
CMD ["node", "dist/orgullo2022/server/main.js"]

