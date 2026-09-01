FROM node:22-alpine AS base
WORKDIR /app

FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM base AS build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
