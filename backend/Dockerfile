FROM node:22-alpine AS base
WORKDIR /app

FROM base AS dev
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS build
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM base AS prod-deps
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

FROM base AS prod
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
