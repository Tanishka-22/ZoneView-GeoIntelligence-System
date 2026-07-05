# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the React app — outputs to /app/dist
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Stage 2: Nginx Production Server ─────────────────────────
FROM nginx:alpine AS runner

# Copy built React app to nginx's web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config — handles React Router's client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]