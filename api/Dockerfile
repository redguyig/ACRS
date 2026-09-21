FROM node:20-alpine

WORKDIR /app

# Install dependencies for Prisma and Puppeteer
RUN apk add --no-cache \
    openssl \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init --skip-generate && npx tsx prisma/seed.ts; npm run dev"]