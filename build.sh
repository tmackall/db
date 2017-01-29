#!/bin/bash

NAME="db-svr"
VERSION="latest"
IMAGE="tmackall/${NAME}:${VERSION}"
docker build -t "$IMAGE" .
docker push "$IMAGE"
