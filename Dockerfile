FROM resin/rpi-raspbian:jessie-20160831  
FROM hypriot/rpi-node:slim

ARG DIR_DB=/srv/db

WORKDIR ${DIR_DB}

# Install app dependencies
COPY package.json ${DIR_DB}
RUN npm install .

COPY db_svr.js ${DIR_DB}
# Bundle app source
COPY . ${DIR_DB}


ENV LL=debug
CMD [ "npm", "start"]
