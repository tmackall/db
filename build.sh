#!/bin/bash

NAME="db-svr"
#VERSION="1.0.0"
VERSION="latest"
sudo docker build -t "${NAME}:${VERSION}" .