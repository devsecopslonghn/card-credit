# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY shared /shared
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY shared /shared
COPY --from=deps /app/node_modules ./node_modules
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

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY shared /shared
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts/smoke-test.mjs ./scripts/smoke-test.mjs

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
