FROM node:20-alpine
WORKDIR /app
# copy manifest and install (no lock file needed)
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
EXPOSE 3000
CMD ["npm","run","start"]
