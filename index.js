const fs = require('fs');
const cron = require('node-cron');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const graph = require('fbgraph');
const puppeteer = require('puppeteer');
require('dotenv').config();

const sendMessageToDiscordChannel = (message, title, nickname, channelId) => {
  channel = client.channels.cache.get(channelId);

  const embeddedMessage = new EmbedBuilder()
    .setColor('#fed20a')
    .setTitle(title)
    .setURL(message.permalink_url)
    .setAuthor({
      url: message.permalink_url,
      iconURL: 'https://i.imgur.com/zoTr79c.jpeg',
      name: `FutureUp (${nickname})`,
    })
    .setDescription(message.message)
    .setImage(message.full_picture)
    .setTimestamp()
    .setFooter({
      iconURL: 'https://i.imgur.com/VHhv6Mk.png',
      text: 'Facebook',
    });

  channel.send({ embeds: [embeddedMessage] });

  console.log('new discord message has been sent');
};

// Facebook Bot
const getFacebookNewestPost = async () => {
  return new Promise(function (resolve, reject) {
    graph.setAccessToken(process.env.FacebookAccessToken);

    graph.get(
      '100248495917269/feed?fields=full_picture,message,permalink_url',
      { limit: 1 },
      function (err, res) {
        if (err) {
          console.log(err);
          reject('error occured');
        } else {
          resolve(res.data[0]);
        }
      },
    );
  });
};
const comparePostsFB = async () => {
  console.log('getting last saved post and newest post from facebook');
  // read last post from file and convert json data (from this file) to object
  const lastPost = JSON.parse(fs.readFileSync('./lastFbPost.json', 'utf8'));

  // check newest post from fb
  const newestPost = await getFacebookNewestPost();

  console.log('comparing posts...');
  // compare ids of lastPost and newestPost
  if (lastPost?.id === newestPost?.id) {
    console.log('no new posts');
    return;
  } else {
    console.log('new post is available');

    try {
      // create message object with all newestPost data and data for sending discord message
      const message = {
        permalink_url: newestPost.permalink_url,
        message: newestPost.message,
        full_picture: newestPost.full_picture,
      };

      console.log('sending discord message for new post');
      // send message to discord channel
      sendMessageToDiscordChannel(
        message,
        'Pojawił się nowy post na naszym facebooku!',
        '@futureup.online',
        '1082231239248977940',
      );

      //save newestPost to file overwriting the old post data
      fs.writeFileSync('./lastFbPost.json', JSON.stringify(newestPost));

      console.log('clean exit');
    } catch (error) {
      console.log(error);
    }
  }
};

//TikTok bot
const getTikTokNewestVideos = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    // args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto('https://www.tiktok.com/@futureup.pl');
  const selector = '[data-e2e="user-post-item-list"]';
  await page.waitForSelector(selector);

  const videos = await page.$$eval(`${selector}>div`, els => {
    return els.map(el => {
      const imgs = el.querySelectorAll('img');
      const img = imgs[0].src;
      const hrefs = el.querySelectorAll('a');
      const url = hrefs[0].href;
      const title = hrefs[1].title;
      return { url, title, img };
    });
  });
  await browser.close();
  return videos[0];
};
const compareVideosTikTok = async () => {
  console.log('getting last saved video and newest video from TikTok');
  // read last post from file and convert json data (from this file) to object
  const lastVideo = JSON.parse(
    fs.readFileSync('./lastTikTokVideo.json', 'utf8'),
  );

  // check newest video from TikTok
  const newestVideo = await getTikTokNewestVideos();

  console.log('comparing videos...');
  // compare ids of lastPost and newestVideo
  if (lastVideo?.url === newestVideo?.url) {
    console.log('no new videos');
    return;
  } else {
    console.log('new video is available');

    try {
      // create message object with all newestVideo data and data for sending discord message
      const message = {
        permalink_url: newestVideo.url,
        message: newestVideo.title,
        full_picture: newestVideo.img,
      };

      console.log('sending discord message for new post');
      // send message to discord channel
      sendMessageToDiscordChannel(
        message,
        'Pojawił się nowy film na naszym TikToku!',
        '@futureup.pl',
        '1082231647157620776',
      );

      //save newestVideo to file overwriting the old post data
      fs.writeFileSync('./lastTikTokVideo.json', JSON.stringify(newestVideo));

      console.log('clean exit');
    } catch (error) {
      console.log(error);
    }
  }
};

const initialize = async () => {
  const newestPost = await getFacebookNewestPost();
  fs.writeFileSync('./lastFbPost.json', JSON.stringify(newestPost));

  const newestVideo = await getTikTokNewestVideos();
  fs.writeFileSync('./lastTikTokVideo.json', JSON.stringify(newestVideo));

  // initialize discord client connection
  client.login(process.env.DiscordAccessToken);

  // when connection is ready -> send message
  client.on('ready', async function () {
    console.log('bot started...');

    cron.schedule('*/5 * * * *', () => {
      comparePostsFB();
      compareVideosTikTok();
    });
  });
};

initialize();
