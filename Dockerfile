# Multi-stage Dockerfile for AI Digital Whiteboard
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and subpackage files
COPY package.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm run install:all

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build client and server
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy root package
COPY package.json ./

# Copy server production dependencies and built files
COPY --from=builder /app/server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server/dist/index.js"]
