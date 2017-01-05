FROM resin/rpi-raspbian:jessie-20160831  
FROM hypriot/rpi-node:slim

ARG DIR=/srv/db

WORKDIR ${DIR}

# Install app dependencies
COPY package.json ${DIR}
RUN npm install .

COPY db_svr.js ${DIR}
# Bundle app source
COPY . ${DIR}


ENV LL=info
CMD [ "npm", "start"]
