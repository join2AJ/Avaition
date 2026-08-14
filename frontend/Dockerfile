# AEP Portal frontend — build the Vite SPA, serve it from Nginx which also
# reverse-proxies /api to the FastAPI backend.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
# Served at the domain root behind Nginx; API calls go to the same origin /api.
ARG VITE_BASE=/
ARG VITE_API_BASE=/api
ENV VITE_BASE=$VITE_BASE VITE_API_BASE=$VITE_API_BASE
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
