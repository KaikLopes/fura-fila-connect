FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
RUN mkdir -p logs

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-3001}/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE ${PORT:-3001}
CMD ["npm", "start"]
