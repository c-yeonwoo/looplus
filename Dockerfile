FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* 는 next build 시점에 번들로 인라인된다 (런타임 주입 불가).
# Railway 는 서비스 Variables 를 Docker 빌드에 ARG 로만 넘기므로, 여기서 ARG 로
# 받아 ENV 로 올려야 next build 가 읽는다. 선언을 빠뜨리면 값이 조용히 비어
# 배포된 앱에서 로그인이 꺼진 채로 나간다.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_LEAD_URL
ARG NEXT_PUBLIC_LEAD_URL_SIGNAL_DESK
ARG NEXT_PUBLIC_LEAD_URL_SIGNAL_APT
ARG NEXT_PUBLIC_ONBOARDING_ORDER
# 백엔드 없는 이미지를 의도적으로 만들 때만 1 (로그인 꺼진 채 배포됨)
ARG ALLOW_NO_SUPABASE
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    NEXT_PUBLIC_LEAD_URL=$NEXT_PUBLIC_LEAD_URL \
    NEXT_PUBLIC_LEAD_URL_SIGNAL_DESK=$NEXT_PUBLIC_LEAD_URL_SIGNAL_DESK \
    NEXT_PUBLIC_LEAD_URL_SIGNAL_APT=$NEXT_PUBLIC_LEAD_URL_SIGNAL_APT \
    NEXT_PUBLIC_ONBOARDING_ORDER=$NEXT_PUBLIC_ONBOARDING_ORDER

RUN node scripts/check-build-env.mjs && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 트레이스에 public이 없을 수 있어 빈 디렉터리 보장
RUN mkdir -p ./public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
