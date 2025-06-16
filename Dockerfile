FROM node:lts-slim AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY . .
COPY ./package.json ./package-lock.json /app/
RUN npm install -g @angular/cli
RUN npm i --legacy-peer-deps
COPY . /app
RUN npm run build

FROM node:lts-slim AS production
WORKDIR /app
# Copy dependency definitions
COPY --from=builder /app/package.json /app
# COPY --from=builder /app/package-lock.json /app
# Get all the code needed to run the app
COPY --from=builder /app/dist /app/dist
# Expose the port the app runs in
EXPOSE 4001
# Serve the app
CMD npm start
