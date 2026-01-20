FROM node:23-bullseye-slim

WORKDIR /app

COPY package.json yarn.lock ./
RUN npm install

COPY . .


EXPOSE 9001
CMD ["npm", "start"]