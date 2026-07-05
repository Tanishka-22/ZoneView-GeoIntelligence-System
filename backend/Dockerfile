# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first — Docker layer caching means
# npm install only re-runs when package.json changes
COPY package*.json ./
COPY prisma.json ./

RUN npm ci

# Copy source and compile TypeScript
COPY . .
RUN npm run build
RUN npx prisma generate --schema=src/database/prisma/schema.prisma

# ─── Stage 2: Production Runner ───────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user — running as root in containers is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy only what's needed to run the app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy Prisma schema and generated client
COPY --from=builder /app/src/database/prisma ./src/database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create logs directory
RUN mkdir -p logs && chown -R nestjs:nodejs logs

USER nestjs

EXPOSE 3000

# Health check — Docker will restart the container if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1 || exit 1

CMD ["node", "dist/main"]