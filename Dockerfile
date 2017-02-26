FROM node:6
MAINTAINER Anurak Chatree <anurak@lannasoftworks.com>

RUN npm install -g loopback-cli
RUN npm install -g bower

RUN mkdir /app
WORKDIR /app
COPY package.json /app/package.json
RUN npm install
COPY ./client/package.json /app/client/package.json
RUN cd client/ && npm install
COPY . /app
RUN cd client/ && bower install --allow-root
