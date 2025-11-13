# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias y asegurar que package-lock.json existe
RUN npm install && ls -la package-lock.json

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar dependencias del stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar el código fuente (excluyendo archivos que no necesitamos)
COPY package.json ./
COPY --from=deps /app/package-lock.json ./
COPY next.config.mjs ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY tsconfig.json ./
COPY app ./app
COPY src ./src
COPY public ./public

# Cambiar permisos antes del build
RUN chown -R node:node /app
USER node

# Deshabilitar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Construir la aplicación
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Crear usuario no-root primero
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar dependencias de producción desde builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./

# Cambiar permisos
RUN chown -R nextjs:nodejs /app
USER nextjs

# Copiar archivos del build
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]