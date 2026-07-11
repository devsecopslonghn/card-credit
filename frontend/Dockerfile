# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /workspace/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY shared /workspace/shared
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /workspace/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY shared /workspace/shared
COPY --from=deps /workspace/frontend/node_modules ./node_modules
COPY frontend/ .
RUN npm run validate:catalog
RUN npm run typecheck
RUN npm run lint
RUN npm run test:unit
RUN npm run test:integration
RUN npm run prepare:card-images
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --chown=nextjs:nextjs --from=builder /workspace/frontend/.next/standalone ./
COPY --chown=nextjs:nextjs --from=builder /workspace/frontend/.next/static ./frontend/.next/static
COPY --chown=nextjs:nextjs --from=builder /workspace/frontend/public ./frontend/public

USER nextjs
WORKDIR /app/frontend

EXPOSE 3000

CMD ["node", "server.js"]
