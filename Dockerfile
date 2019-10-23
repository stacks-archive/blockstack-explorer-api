FROM node:10.16.3-alpine as base
WORKDIR /usr/src
COPY package.json yarn.lock /usr/src/
RUN apk add python make g++ && \
    yarn install
COPY . .
RUN yarn --production

FROM node:10.16.3-alpine
WORKDIR /usr/src
ENV NODE_ENV="production"
COPY --from=base /usr/src .
EXPOSE 4000
CMD ["yarn", "prod"]
