FROM node:8
WORKDIR /usr/src/app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN JOBS=MAX npm install --production --unsafe-perm
COPY . ./
CMD ["npm", "start"]
