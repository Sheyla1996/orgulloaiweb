FROM node:lts-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

# ⚠️ Este es el build correcto para SSR
RUN npm run build:ssr

FROM node:lts-slim AS production
WORKDIR /app

# Solo necesitas las dependencias de producción
COPY package.json package-lock.json ./
RUN npm install --only=production --legacy-peer-deps

# Copia el resultado del build SSR
COPY --from=builder /app/dist/orgullo2022 /app/dist/orgullo2022

EXPOSE 4001

# Sirve con Node.js (Angular Universal)
CMD ["node", "dist/orgullo2022/server/main.js"]

