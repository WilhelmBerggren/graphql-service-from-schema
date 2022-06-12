FROM node:14-alpine

WORKDIR /usr/app

COPY . ./

RUN yarn

EXPOSE 4000

CMD ["yarn", "start"]