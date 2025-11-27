FROM node:20-alpine
WORKDIR /app
# copy manifest and install (no lock file needed)
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
CMD ["npm","run","start"]
