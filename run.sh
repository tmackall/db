#!/bin/bash
NAME='db_web_server'
docker stop ${NAME}
docker rm  -v ${NAME}
sudo docker run -d --name ${NAME}  -it -p 3002:3002 db-svr
