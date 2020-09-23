FROM node:12.18.3

WORKDIR /usr/src/app

# Copy package(-lock).json
COPY package*.json /usr/src/app/

# Install npm dependencies
RUN npm install

# Copy over AvBot code
COPY ./ /usr/src/app/

# The command to start the bot
CMD ["node", "bot.js"]