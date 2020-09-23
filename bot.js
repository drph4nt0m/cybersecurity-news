const {
  Client,
  MessageEmbed
} = require('discord.js');
const moment = require('moment');
const parser = new(require('rss-parser'))();
require('dotenv').config();
const feedDetails = require('./feeds');

const client = new Client();
const rssLast = {};

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const targetChannel = await client.channels.cache.filter(channel => channel.type == "text").first();

  sendMessages(targetChannel);
  setInterval(() => {
    sendMessages(targetChannel);
  }, 300000);
});

client.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
  }
});

client.login(process.env.DISCORD_TOKEN);

async function sendMessages(channel) {

  let msgs = []
  for (let i = 0; i < feedDetails.length; i++) {
    console.log(`[${moment.utc().toDate()}]: (${i + 1}/${feedDetails.length}) ${feedDetails[i].title}`);
    msgs.push(...await getFeed(feedDetails[i]));
  }

  msgs = msgs.sort((a, b) => a.timestamp - b.timestamp);

  if (channel) {
    msgs.forEach(msgEmbed => channel.send(msgEmbed));
  }

  console.log('====='.repeat(10));
}

async function getFeed(feedDetails) {
  const today = moment.utc().startOf('day');
  const feed = (await parser.parseURL(feedDetails.rss));
  const f = feed.items.filter(item => moment(item.isoDate).utc().isSame(today, 'day')).reverse();

  const msgs = [];

  f.forEach(feedItem => {
    const logo = feed.image;
    const title = feedItem.title.trim();
    const link = feedItem.link.trim();
    const author = (feedItem.creator ? feedItem.creator : feedItem.author ? feedItem.author : feedDetails.title).trim();
    const content = (feedItem.contentSnippet ? feedItem.contentSnippet.length < 1000 ? feedItem.contentSnippet : `${feedItem.contentSnippet.split(' ').slice(0, 200).join(' ')}...` : '').trim();
    const pubDate = moment(feedItem.isoDate ? feedItem.isoDate : feedItem.pubDate).utc();

    if (!rssLast[feedDetails.title]) {
      rssLast[feedDetails.title] = today;
    }

    if (pubDate.isAfter(rssLast[feedDetails.title])) {
      rssLast[feedDetails.title] = pubDate;
      const msgEmbed = new MessageEmbed()
        .setAuthor(feedDetails.title, null, feedDetails.home)
        .setTitle(title)
        .setURL(link)
        .setDescription(content)
        .setFooter(author)
        .setTimestamp(pubDate.toDate());

      if (logo) {
        msgEmbed.setThumbnail(logo.url);
      }

      msgs.push(msgEmbed)
    }
  })
  return msgs;
}