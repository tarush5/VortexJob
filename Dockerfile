# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-slim AS backend-builder
WORKDIR /app/backend
# Install build dependencies for better-sqlite3 compilation if needed
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Final production image
FROM node:20-slim AS runner
WORKDIR /app/backend
# Install python3, make, and g++ in case better-sqlite3 needs to compile native bindings on npm install
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built assets
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/start-production.js ./
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Clean up build tools to keep image size small
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Production Environment Variables
ENV PORT=3000
ENV NODE_ENV=production
ENV DB_PATH=/app/backend/data/jobs.db
ENV JWT_SECRET=change-me-in-production-use-a-secure-key

# Expose ports
EXPOSE 3000

# Database Volume
VOLUME /app/backend/data

# Run supervisor which spawns both Express and the Worker
CMD ["node", "start-production.js"]
