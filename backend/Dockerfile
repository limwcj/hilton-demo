FROM node:24

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ENV DATABASE_URL=mongodb://mongo:27017/hilton?replicaSet=rs0

COPY package.json pnpm-lock.yaml tsconfig*.json nest-cli.json eslint.config.mjs .prettierrc ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm install && npx prisma generate && pnpm build

EXPOSE 3000

CMD ["node", "dist/main.js"]
