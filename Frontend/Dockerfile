# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY Frontend/package.json Frontend/package-lock.json* ./Frontend/
WORKDIR /app/Frontend
RUN npm install
COPY Frontend /app/Frontend
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/Frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
