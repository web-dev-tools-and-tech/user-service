FROM node:alpine
ARG NPM_FILE

ENV NODE_ENV=production

RUN echo $NPM_FILE >.npmrc
COPY package*.json ./
RUN npm install --production && npm cache clear --force && rm -f .npmrc
COPY . .

EXPOSE 80
ENV PORT=80

CMD ["node", "scripts/run-user-service.js"]
