# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy packages (shared configs)
COPY packages ./packages

# Copy backend app
COPY apps/backend ./apps/backend

# Install all dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Build the backend
RUN pnpm --filter backend build

# Prune dev dependencies after build
RUN pnpm prune --prod

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files for reference
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy node_modules from builder (already pruned)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built files
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

WORKDIR /app/apps/backend

# Expose port
EXPOSE 8000

# Start the server
CMD ["node", "dist/index.js"]
