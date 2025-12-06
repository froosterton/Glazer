// glazing.js

const { Client } = require('discord.js-selfbot-v13');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// ------------- CONFIG (ENV-ONLY FOR SECRETS) -------------
// Main selfbot token (controller)
const TOKEN = process.env.DISCORD_TOKEN;
// Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Glaze webhook (notification)
const GLAZE_WEBHOOK_URL = process.env.GLAZE_WEBHOOK_URL;

// Extra accounts that will send GIFs (tokens from env, gifs hard-coded)
const BOT_ACCOUNTS = [
  {
    token: process.env.GLAZE_BOT_TOKEN_1,
    gifs: [
      'https://tenor.com/view/baby-ai-130-backpack-supreme-backpack-baby-tuff-baby-meme-gif-2218754133828871165',
      'https://tenor.com/view/hmusicruof4-rowley-diary-of-a-wimpy-kid-rodrick-rules-gif-26773802'
    ]
  },
  {
    token: process.env.GLAZE_BOT_TOKEN_2,
    gifs: [
      'https://tenor.com/view/sigma-gif-15449497793648793961',
      'https://tenor.com/view/james-franco-wait-what-wut-wtf-nani-gif-25479769'
    ]
  },
  {
    token: process.env.GLAZE_BOT_TOKEN_3,
    gifs: [
      'https://tenor.com/view/gumball-the-amazing-world-of-gumball-can-i-put-my-baka-mitai-gif-23338606',
      'https://tenor.com/view/when-u-dream-about-being-a-singer-gif-2931117426764808373'
    ]
  },
  {
    token: process.env.GLAZE_BOT_TOKEN_4,
    gifs: [
      'https://tenor.com/view/russel-westbrook-ignore-kid-ignored-the-kid-ignores-the-kid-gif-13915927085408886018',
      'https://tenor.com/view/michaeljordan-mj-basketball-gif-michael-jordan-no-no-no-no-gif-16220345851539903827'
    ]
  }
];

// Channels to monitor for questions
const MONITOR_CHANNEL_IDS = [
  '430203025659789343',
  '442709792839172099'
];

// Initial focus terms (can be changed with !setglaze)
let glazeTerms = ['item factor', 'factor'];

// basic env validation
if (!TOKEN) {
  console.error('DISCORD_TOKEN is not set');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}
if (!GLAZE_WEBHOOK_URL) {
  console.error('GLAZE_WEBHOOK_URL is not set');
  process.exit(1);
}
if (!BOT_ACCOUNTS.some(acc => acc.token)) {
  console.warn(
    'Warning: no GLAZE_BOT_TOKEN_x envs are set. GIF sending will not work.'
  );
}

// pointer for cycling accounts (two at a time)
let accountPointer = 0;

// ------------- GEMINI SETUP -------------
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ------------- DISCORD CLIENT -------------
const client = new Client({ checkUpdate: false });

// small sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function termsAsText() {
  return glazeTerms.length ? glazeTerms.join(', ') : '(none)';
}

// get next 2 accounts in a rotating cycle: (1,2) -> (3,4) -> (1,2) -> ...
function getNextTwoAccounts() {
  const available = BOT_ACCOUNTS.filter(acc => acc.token);
  if (available.length === 0) return [];
  const first = available[accountPointer % available.length];
  const second = available[(accountPointer + 1) % available.length];
  accountPointer = (accountPointer + 2) % available.length;
  return [first, second];
}

// login the two accounts and send their gifs in the given channel
// with 5.2s delay between each GIF send
async function sendGifsForAlert(channelId) {
  const accountsToUse = getNextTwoAccounts();
  if (!accountsToUse.length) return;

  for (const acc of accountsToUse) {
    try {
      const gifClient = new Client({ checkUpdate: false });
      gifClient.on('ready', async () => {
        try {
          const channel =
            gifClient.channels.cache.get(channelId) ||
            (await gifClient.channels.fetch(channelId).catch(() => null));
          if (!channel) {
            console.log('[GIF] Could not find channel for gif client');
            await gifClient.destroy();
            return;
          }
          for (const gifUrl of acc.gifs) {
            await channel.send(gifUrl);
            // 5.2 second slowmode between each GIF
            await sleep(5200);
          }
        } catch (err) {
          console.error('[GIF] Error sending gifs:', err.message);
        } finally {
          await gifClient.destroy();
        }
      });
      await gifClient.login(acc.token);
    } catch (err) {
      console.error('[GIF] Error logging in gif account:', err.message);
    }
  }
}

// ------------- MESSAGE HANDLING -------------
client.on('ready', () => {
  console.log(`Glaze selfbot logged in as ${client.user.tag}`);
  console.log(`Monitoring channels: ${MONITOR_CHANNEL_IDS.join(', ')}`);
  console.log(`Initial glaze terms: ${termsAsText()}`);
});

client.on('messageCreate', async (message) => {
  try {
    const content = message.content?.trim();
    if (!content) return;

    // ------- COMMAND: change glaze terms (anyone can use) -------
    // Example: !setglaze item factor,factor
    if (content.toLowerCase().startsWith('!setglaze ')) {
      const argString = content.slice('!setglaze '.length).trim();
      const newTerms = argString
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (newTerms.length === 0) {
        await message.reply('❌ You must provide at least one term.');
        return;
      }
      glazeTerms = newTerms;
      await message.reply(
        `✅ Glaze terms updated to: \`${termsAsText()}\``
      );
      console.log(`[Config] Glaze terms updated to: ${termsAsText()}`);
      return;
    }

    // ------- Only monitor the configured channels -------
    if (!MONITOR_CHANNEL_IDS.includes(message.channel.id)) return;

    // Ignore other bots' messages (selfbot user isn't a bot)
    if (message.author.bot) return;

    const lower = content.toLowerCase();

    // Quick pre-check: does the message contain any focus term?
    const mentionsConfiguredTerm = glazeTerms.some(
      (term) => term && lower.includes(term)
    );
    if (!mentionsConfiguredTerm) return;

    const focusList = termsAsText();

    // ------- Ask Gemini whether this really needs a glaze -------
    const prompt = `
You will see a Discord message from a Roblox-related server.
There is a concept or phrase we are watching for, called the "focus term".
The current focus term(s) are: ${focusList}

Your task:
1. Decide if the user is clearly asking a question ABOUT the focus term
   (what it is, how it works, if it's safe, if they should use it, etc.).
2. If YES, respond with exactly: YES
3. If NO, respond with exactly: NO

Examples of messages that SHOULD be "YES" when focus term is "item factor" or "factor":
- "does anyone know what an item factor is?"
- "is item factoring safe?"
- "what is an item factor"
- "someone's asking me to get an item factor, is this safe?"

Messages that SHOULD be "NO":
- casual chat that just includes the word but isn't asking about it
- anything unrelated to the focus term
- messages that mention other topics, not the focus term

Only reply with YES or NO, nothing else.

Message: ${content}
`;

    const aiResult = await model.generateContent(prompt);
    const aiText = aiResult.response.text().trim().toUpperCase();
    console.log(
      `[Gemini] For "${content}" with focus [${focusList}] -> ${aiText}`
    );

    if (aiText !== 'YES') {
      // not considered a glaze situation
      return;
    }

    // small delay if you ever want other systems to act first
    await sleep(2000);

    // ------- Send glaze webhook -------
    const guildId = message.guild?.id || '@me';
    const jumpLink = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
    const avatarUrl = message.author.displayAvatarURL({
      format: 'png',
      size: 128
    });

    const embed = {
      title: 'Glaze Intervention Needed',
      description:
        `**Message:** ${content}\n` +
        `**User:** ${message.author.tag}\n\n` +
        `[Jump to message](${jumpLink})`,
      color: 0xffa500,
      timestamp: new Date().toISOString()
    };

    if (avatarUrl) {
      embed.thumbnail = { url: avatarUrl };
    }

    await axios.post(GLAZE_WEBHOOK_URL, { embeds: [embed] });
    console.log(
      `[Glaze] Sent alert for ${message.author.tag} (${message.id})`
    );

    // ------- Send GIFs from the rotating bot accounts -------
    await sendGifsForAlert(message.channel.id);
  } catch (err) {
    console.error('[Glaze] Error processing message:', err);
  }
});

// ------------- STARTUP -------------
client.on('error', (e) => console.error('Discord client error:', e));
process.on('unhandledRejection', (e) =>
  console.error('Unhandled promise rejection:', e)
);
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

client.login(TOKEN).catch((e) => {
  console.error('Failed to login:', e);
  process.exit(1);
});
