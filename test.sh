#!/bin/bash

touch Dockerfile

echo "FROM python:3" > Dockerfile

echo "RUN pip install numpy scipy pandas" >> Dockerfile

echo "CMD [\"python\", \"./main.py\"]" >> Dockerfile

echo "HASH_OUTPUT $(sha1sum Dockerfile | cut -d ' ' -f 1)"
