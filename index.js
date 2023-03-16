const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const graph = require('fbgraph');
require('dotenv').config();

// function for getting newest post from facebook
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

const sendMessageToDiscordChannel = message => {
  // initialize discord client connection
  client.login(process.env.DiscordAccessToken);

  // when connection is ready -> send message
  client.on('ready', async function () {
    channel = client.channels.cache.get('1082231239248977940');

    const embeddedMessage = new EmbedBuilder()
      .setColor('#fed20a')
      .setTitle('Pojawił się nowy post na naszym facebooku!')
      .setURL(message.permalink_url)
      .setAuthor({
        url: message.permalink_url,
        iconURL: 'https://i.imgur.com/zoTr79c.jpeg',
        name: 'FutureUp (@futureup.online)',
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
  });
};

const botWorker = async () => {
  console.log(
    'bot started... getting last saved post and newest post from facebook',
  );
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
      sendMessageToDiscordChannel(message);

      //save newestPost to file overwriting the old post data
      fs.writeFileSync('./lastFbPost.json', JSON.stringify(newestPost));

      console.log('clean exit');
    } catch (error) {
      console.log(error);
    }
  }
};

const initialize = async () => {
  const newestPost = await getFacebookNewestPost();

  fs.writeFileSync('./lastFbPost.json', JSON.stringify(newestPost));

  setInterval(() => {
    botWorker();
  }, 60000);
};

initialize();
