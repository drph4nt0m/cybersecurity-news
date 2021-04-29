const {
  Client,
  MessageEmbed
} = require('discord.js');
const moment = require('moment');
const mongoose = require('mongoose');
var Vibrant = require('node-vibrant')

const parser = new(require('rss-parser'))();

require('dotenv').config();

const feedDetails = require('./feeds');

const logger = require('./logger');

const client = new Client();
const rssLast = {};
let Guild = null;

client.on('ready', async () => {
  logger.info(`Logged in as ${client.user.tag}!`);

  await initializeMongo();

  sendMessages();
  setInterval(() => {
    sendMessages();
  }, 300000);
});

client.on('guildCreate', async (guild) => {
  const guildObj = new Guild({
    guildId: guild.id,
    guildName: guild.name,
    feedChannel: 'null',
  });
  await guildObj.save();
})

client.on('message', async (msg) => {
  if (msg.author.bot || !msg.guild || !msg.member.hasPermission('ADMINISTRATOR')) return;
  let args = msg.content.split(' ');
  let cmd = args[0].toLowerCase();
  let params = [];
  args.slice(1, args.length).forEach((ele) => {
    if (ele != '') params[params.length] = ele;
  });


  if (cmd === '!feed') {
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply('Incorrect text channel');
    try {
      await Guild.findOneAndUpdate({
        guildId: msg.guild.id
      }, {
        guildName: msg.guild.name,
        feedChannel: channel.id
      }, {
        new: true,
        upsert: true
      })
      return msg.reply(`Feed channel changed to ${channel}`);
    } catch (error) {
      logger.error(error);
      return;
    }
  }
});

client.login(process.env.DISCORD_TOKEN);


async function initializeMongo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    });
    logger.info('MongoDB connected!');

    const GuildSchema = new mongoose.Schema({
      guildId: {
        type: String,
        required: true,
        unique: true
      },
      guildName: {
        type: String,
        required: true
      },
      feedChannel: {
        type: String,
        required: true
      }
    });

    Guild = mongoose.model('Guild', GuildSchema);

  } catch (error) {
    logger.error(error);
    process.exit(0);
  }
}


async function sendMessages() {

  const fc = (await Guild.find({}, {
    feedChannel: true
  })).map(g => g.feedChannel);

  const feedChannels = await client.channels.cache.filter(c => fc.indexOf(c.id) !== -1);

  let msgs = []

  for (let i = 0; i < feedDetails.length; i++) {
    logger.info(`[rss] (${i + 1}/${feedDetails.length}) ${feedDetails[i].title}`);
    msgs.push(...await getFeed(feedDetails[i]));
  }

  msgs = msgs.sort((a, b) => a.timestamp - b.timestamp);

  feedChannels.forEach(async channel => {
    try {
      msgs.forEach(msgEmbed => channel.send(msgEmbed).catch(err => {}));
    } catch (error) {}
  })

  logger.info('='.repeat(50));

}

async function getFeed(feedDetails) {
  const today = moment.utc().startOf('day').subtract(1, 'days');
  const feed = (await parser.parseURL(feedDetails.rss));
  const f = feed.items;

  const msgs = [];

  const logo = feed.image;
  let color = null;

  if (logo && logo.title !== 'Some Rights Reserved') {
    const v = await Vibrant.from(logo.url).getPalette();
    if (v.Vibrant) {
      color = v.Vibrant.hex;
    }
  }

  for (let i = 0; i < f.length; i++) {

    let title = '';
    if(f[i].creator === 'US-CERT') {
      title = f[i].title['a'][0]['_'].trim();
    } else {
      title = f[i].title.trim();
    }
    const link = f[i].link.trim();
    const author = (f[i].creator ? f[i].creator : f[i].author ? f[i].author : feedDetails.title).trim();
    const content = (f[i].contentSnippet ? f[i].contentSnippet.length < 1000 ? f[i].contentSnippet : `${f[i].contentSnippet.split(' ').slice(0, 200).join(' ')}...` : '').trim();
    let pubDate = moment(f[i].isoDate ? f[i].isoDate : f[i].pubDate).utc();


    if (!rssLast[feedDetails.title]) {
      rssLast[feedDetails.title] = today;
    }
    pubDate = moment(f[i].isoDate ? f[i].isoDate : f[i].pubDate).utc();


    if (pubDate.isAfter(rssLast[feedDetails.title])) {
      logger.info(`${pubDate.isAfter(rssLast[feedDetails.title])} | ${title}`);

      rssLast[feedDetails.title] = pubDate;
      const msgEmbed = new MessageEmbed()
        .setAuthor(feedDetails.title, null, feedDetails.home)
        .setTitle(title)
        .setURL(link)
        .setDescription(content)
        .setFooter(author)
        .setTimestamp(pubDate.toDate());

      if (logo) {
        msgEmbed
          .setThumbnail(logo.url);
        if (color) {
          msgEmbed
            .setColor(color);
        }

      }

      msgs.push(msgEmbed)
    }
  }
  return msgs;
}