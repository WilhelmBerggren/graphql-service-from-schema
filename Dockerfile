FROM node:14-alpine

WORKDIR /usr/app

COPY . ./

EXPOSE 80

RUN ["yarn"]

RUN ["yarn", "build"]

CMD ["yarn", "start"]