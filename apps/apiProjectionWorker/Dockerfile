FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/apps/apiProjectionWorker
CMD ["npm","run","start"]
