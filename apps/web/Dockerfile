FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY . .
RUN npm install

WORKDIR /app/apps/web

# Vite wants host binding + custom port
EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "--port", "8080"]

