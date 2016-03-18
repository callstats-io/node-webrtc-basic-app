FROM node:4.3.1

WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install; mkdir ssl; openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -keyout ssl/server.key -out ssl/server.crt -passin pass:v2ZIZj2jKUap -subj '/CN=localhost/O=Local/C=FI'; cp ssl/server.crt ssl/ca.crt
COPY . /usr/src/app

CMD [ "npm", "start" ]

