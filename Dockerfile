# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for Next.js (standalone) — دليل النبك
# Build context: repository root (../../). Build with:
#   docker build -f artifacts/nabk-directory/Dockerfile -t nabk-directory .

ARG NODE_VERSION=20-alpine

############################################
# 1. deps — install all workspace deps
############################################
FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /repo

# Workspace files needed for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/nabk-directory/package.json ./artifacts/nabk-directory/

RUN corepack enable && corepack prepare pnpm@10 --activate
RUN pnpm install --filter @workspace/nabk-directory --frozen-lockfile

############################################
# 2. builder — generate prisma + build
############################################
FROM node:${NODE_VERSION} AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/artifacts/nabk-directory/node_modules ./artifacts/nabk-directory/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/nabk-directory ./artifacts/nabk-directory

ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10 --activate
RUN cd artifacts/nabk-directory && pnpm exec prisma generate
RUN cd artifacts/nabk-directory && pnpm exec next build

############################################
# 3. runner — minimal production image
############################################
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone server bundle
COPY --from=builder --chown=nextjs:nodejs \
  /repo/artifacts/nabk-directory/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs \
  /repo/artifacts/nabk-directory/.next/static ./artifacts/nabk-directory/.next/static
COPY --from=builder --chown=nextjs:nodejs \
  /repo/artifacts/nabk-directory/public ./artifacts/nabk-directory/public

# Prisma schema + CLI for runtime migrations (`prisma migrate deploy`).
# The Next standalone bundle does NOT include the `prisma` CLI by default,
# so we copy it explicitly along with the engines and the schema.
COPY --from=builder --chown=nextjs:nodejs \
  /repo/artifacts/nabk-directory/prisma ./artifacts/nabk-directory/prisma
COPY --from=builder --chown=nextjs:nodejs \
  /repo/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder --chown=nextjs:nodejs \
  /repo/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs \
  /repo/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs \
  /repo/node_modules/.bin/prisma ./node_modules/.bin/prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "artifacts/nabk-directory/server.js"]
