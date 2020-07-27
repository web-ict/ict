FROM node:14-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

# Create app directory
WORKDIR /home/node/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY lerna.json ./

USER node

RUN npm ci
RUN npm run bootstrap

# Bundle app source
COPY --chown=node:node . .

EXPOSE 8080

CMD [ "node", "autopeering/examples/signaling-server.js" ]