# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

RUN npm ci

# Copy prisma schema before generate so the client is built
# with the correct schema
COPY src/database/prisma/schema.prisma ./src/database/prisma/schema.prisma

# Generate Prisma Client BEFORE copying the rest of the source
# This is critical — without this, @prisma/client exports are empty
RUN npx prisma generate --schema=src/database/prisma/schema.prisma

# Now copy the full source and compile TypeScript
COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ───────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy only production artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy Prisma schema and generated client
COPY --from=builder /app/src/database/prisma ./src/database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p logs && chown -R nestjs:nodejs logs

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1 || exit 1

CMD ["node", "dist/main"]