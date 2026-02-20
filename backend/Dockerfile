# ─── Stage 1: dependency install ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install OS libs needed by some native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

# Install ALL deps (including devDeps) so any build steps work
RUN npm ci --ignore-scripts


# ─── Stage 2: production image ────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling inside containers
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source (no node_modules, logs, backups — handled by .dockerignore)
COPY --chown=appuser:appgroup . .

# Create directories that the app writes to at runtime
RUN mkdir -p logs uploads exports backups && \
    chown -R appuser:appgroup logs uploads exports backups

# Switch to non-root user
USER appuser

# Expose app port (nginx proxies this — do not expose 3000 directly in production)
EXPOSE 3000

# Health check — uses the /health endpoint added in app.js
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Use dumb-init as PID 1 to forward signals correctly to Node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
