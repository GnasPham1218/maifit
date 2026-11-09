# ---- Stage 1: build ----
FROM node:24-alpine AS build
WORKDIR /app

# Copy file khai báo dependency trước để Docker cache lớp npm ci
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Public Turnstile site key: Vite inlines VITE_* variables into the JS at build time,
# so it must be given here (CI passes it with --build-arg), not when the container runs.
# Fail the build if it is missing, rather than shipping a sign-up page with a broken CAPTCHA.
ARG VITE_TURNSTILE_SITE_KEY
RUN test -n "$VITE_TURNSTILE_SITE_KEY" || (echo "VITE_TURNSTILE_SITE_KEY build arg is required" && exit 1)
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

RUN npm run build

# ---- Stage 2: serve ----
FROM nginx/nginx-unprivileged:stable-alpine
LABEL org.opencontainers.image.source="https://github.com/GnasPham1218/maifit"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080