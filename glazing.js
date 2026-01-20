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

// Block of text Token 1 ALWAYS sends first (100%, no matter what)
const TEXT_BLOCK = `ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ
ㅤ`;

// Extra accounts: [0] = text-only (Token 1), [1-3] = GIF senders
const BOT_ACCOUNTS = [
  {
    token: process.env.GLAZE_BOT_TOKEN_1,
    gifs: [] // unused; Token 1 only sends TEXT_BLOCK
  },
  {
    token: process.env.GLAZE_BOT_TOKEN_2,
    gifs: [
      'https://tenor.com/view/speed-ishowspeed-speed-stream-ishowspeed-stream-speed-nod-gif-1082323842437565509 ',
      'https://tenor.com/view/russel-westbrook-ignore-kid-ignored-the-kid-ignores-the-kid-gif-13915927085408886018 '
    ]
  },
  {
    token: process.env.GLAZE_BOT_TOKEN_3,
    gifs: [
      'https://tenor.com/view/flight-reacts-flightreacts-tongue-tongue-laugh-gif-13724048537815479089 ',
      'https://tenor.com/view/celebrate-show-off-drink-up-drink-time-feeling-good-gif-14739319 '
    ]
  },
  {
    token: process.env.GLAZE_BOT_TOKEN_4,
    gifs: [
      'https://tenor.com/view/epstein-walking-gif-5562429190146171448 ',
      'https://tenor.com/view/charlie-kirk-eeffoc-coffee-kirk-sip-gif-4020112974186077286 '
    ]
  }
];

// Channels to monitor for questions
const MONITOR_CHANNEL_IDS = [
  '1463314402907521086',
  '1463314402907521086'
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
    'Warning: no GLAZE_BOT_TOKEN_x envs are set. Text/GIF sending will not work.'
  );
}

// ------------- HELPERS -------------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

// Login a client, run fn(channel), then destroy. Resolves when done.
async function withChannel(token, channelId, fn) {
  return new Promise((resolve, reject) => {
    const c = new Client({ checkUpdate: false });
    c.on('ready', async () => {
      try {
        const ch =
          c.channels.cache.get(channelId) ||
          (await c.channels.fetch(channelId).catch(() => null));
        if (!ch) {
          console.log('[Glaze] Could not find channel');
          await c.destroy();
          return resolve();
        }
        await fn(ch);
      } catch (err) {
        console.error('[Glaze] Error:', err.message);
      } finally {
        await c.destroy();
        resolve();
      }
    });
    c.login(token).catch(reject);
  });
}

// 1) Token 1 sends TEXT_BLOCK (100%, always first)
// 2) 1 GIF per token, rotate through tokens until all 6 sent (round-robin)
async function sendGifsForAlert(channelId) {
  const token1 = BOT_ACCOUNTS[0];
  const otherAccounts = BOT_ACCOUNTS.slice(1).filter((acc) => acc.token);

  // ---- Step 1: Token 1 ALWAYS sends the text block ----
  if (token1?.token) {
    await withChannel(token1.token, channelId, async (ch) => {
      await ch.send(TEXT_BLOCK);
      console.log('[Glaze] Token 1 sent text block');
    });
  }

  if (otherAccounts.length === 0) return;

  // ---- Step 2: 1 GIF per token, rotate until all 6 sent ----
  // Shuffle account order and each account's GIF order
  const accountOrder = shuffle(otherAccounts);
  const gifsByAcc = accountOrder.map((acc) => shuffle([...(acc.gifs || [])]));

  const maxRounds = Math.max(0, ...gifsByAcc.map((g) => g.length));
  for (let round = 0; round < maxRounds; round++) {
    for (let i = 0; i < accountOrder.length; i++) {
      const gifUrl = gifsByAcc[i][round];
      if (!gifUrl) continue;
      await withChannel(accountOrder[i].token, channelId, async (ch) => {
        await ch.send(gifUrl.trim());
      });
      await sleep(5200);
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

    // ------- 1) Token 1 sends text block, 2) Others send GIFs (random order) -------
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
