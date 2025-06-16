FROM node:lts-slim AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY ./package.json ./package-lock.json /app/
RUN apt-get update && apt-get upgrade -y && yarn install
COPY . /app
RUN yarn build

FROM node:lts-slim AS production
WORKDIR /app
# Copy dependency definitions
COPY --from=builder /app/package.json /app
# Get all the code needed to run the app
COPY --from=builder /app/dist /app/dist
# Expose the port the app runs in
EXPOSE 4001
# Serve the app
CMD yarn start
