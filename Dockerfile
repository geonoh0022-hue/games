FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
