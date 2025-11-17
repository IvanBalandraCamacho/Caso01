# 1. Etapa de Dependencias
# --- CORRECCIÓN: Actualizado a una imagen LTS más reciente ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Etapa de Construcción (Builder)
# --- CORRECCIÓN: Actualizado a una imagen LTS más reciente ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Etapa Final (Runner)
# --- CORRECCIÓN: Actualizado a una imagen LTS más reciente ---
FROM node:20-alpine AS runner
WORKDIR /app

# --- CORRECCIÓN: Formato de ENV actualizado ---
ENV NODE_ENV="production"

# Copia solo los archivos necesarios para producción
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Exponer el puerto 3000
EXPOSE 3000

# Comando de inicio
CMD ["node", "server.js"]