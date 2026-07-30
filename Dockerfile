FROM oven/bun:1

WORKDIR /app/dashboard

COPY dashboard/package.json dashboard/bun.lock ./
RUN bun install --frozen-lockfile

COPY src /app/src
COPY dashboard /app/dashboard

ENV NODE_ENV=production
ENV APP_HOST=0.0.0.0
ENV APP_PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const response = await fetch('http://127.0.0.1:' + process.env.APP_PORT + '/api/hello'); if (!response.ok) process.exit(1)"

CMD ["bun", "run", "start"]
