FROM node:20-alpine as builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application with environment variables
ARG VITE_API_URL=http://localhost:8000
ARG VITE_WEBAPP_URL=http://localhost:3000

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WEBAPP_URL=$VITE_WEBAPP_URL

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
