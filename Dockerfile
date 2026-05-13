# Stage 1: Build Vue client
FROM node:22-alpine AS client-builder
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Build Express server
FROM node:22-alpine AS server-builder
WORKDIR /server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server-builder /server/dist ./dist
COPY --from=client-builder /client/dist ./public
RUN mkdir -p uploads
EXPOSE 3001
CMD ["node", "dist/index.js"]
