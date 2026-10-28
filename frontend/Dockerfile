# ---- Stage 1: build ----
FROM node:24-alpine AS build
WORKDIR /app

# Copy file khai báo dependency trước để Docker cache lớp npm ci
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx/nginx-unprivileged:stable-alpine
LABEL org.opencontainers.image.source="https://github.com/GnasPham1218/maifit"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080