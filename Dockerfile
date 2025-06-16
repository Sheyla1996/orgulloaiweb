FROM node:lts-slim AS builder
WORKDIR /app

# Copia solo los archivos de dependencias primero para aprovechar la cache de Docker
COPY package.json package-lock.json ./

# Instala dependencias
RUN npm install --legacy-peer-deps

# Copia el resto del código
COPY . .

# Construye la app Angular
RUN npm run build:ssr

FROM node:lts-slim AS production
WORKDIR /app

COPY --from=builder /app/package.json /app
COPY --from=builder /app/dist /app/dist

EXPOSE 4001
CMD npm start:ssr
