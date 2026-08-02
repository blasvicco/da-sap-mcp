FROM node:22-alpine

WORKDIR /deps
COPY app/package.json app/yarn.lock ./
RUN npm install --frozen-lockfile

ENV PATH=/deps/node_modules/.bin:$PATH

WORKDIR /home/app
