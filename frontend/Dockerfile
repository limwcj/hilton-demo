FROM node:24

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json vite.config.ts postcss.config.cjs index.html ./
COPY src ./src

RUN pnpm install && pnpm build

EXPOSE 4173

CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "4173"]
