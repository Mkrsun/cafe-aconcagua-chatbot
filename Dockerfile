# El chatbot en producción: Node 24 con las dependencias del lockfile. Corre TypeScript con tsx,
# igual que `pnpm start`; los comandos del equipo (`pnpm cargar`, `pnpm bandeja`) van en la misma imagen.
FROM node:24-slim

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NODE_ENV=production \
    CAFE_ENV=produccion
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
USER node
EXPOSE 8092
CMD ["node", "--import", "tsx", "launcher/main.ts"]
