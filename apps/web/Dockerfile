FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Vite wants host binding + custom port
EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "--port", "8080"]

