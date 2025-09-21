# Use Node.js 18 LTS
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies for build
RUN npm install --silent
RUN cd frontend && npm install --silent
RUN cd backend && npm install --silent

# Copy source code
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build frontend for production
RUN cd frontend && npm run build

# Production stage - optimized for Render.com
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S pharmaceutical -u 1001

# Set working directory
WORKDIR /app

# Copy backend package.json and install only production dependencies
COPY backend/package.json ./
RUN npm install --only=production --silent && npm cache clean --force

# Copy backend source code
COPY backend/ ./

# Ensure storage directory exists in container
RUN mkdir -p ./storage

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/build ./public

# Create data directory for Render.com persistent disk
RUN mkdir -p /app/data && chown -R pharmaceutical:nodejs /app/data

# Switch to non-root user for security
USER pharmaceutical

# Expose port 10000 (Render.com default port)
EXPOSE 10000

# Health check for Render.com monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-10000}/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with data initialization using Node.js startup script
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "start.js"]