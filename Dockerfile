FROM node:23-bullseye-slim

WORKDIR /app

COPY package.json yarn.lock ./
RUN npm install

COPY . .


EXPOSE 8001
CMD ["npm", "start"]