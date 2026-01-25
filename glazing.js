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
// GIF API keys
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const TENOR_API_KEY = process.env.TENOR_API_KEY;

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
  { token: process.env.GLAZE_BOT_TOKEN_1 }, // Token 1 only sends TEXT_BLOCK
  { token: process.env.GLAZE_BOT_TOKEN_2 },
  { token: process.env.GLAZE_BOT_TOKEN_3 },
  { token: process.env.GLAZE_BOT_TOKEN_4 }
];

// Channels to monitor for questions
const MONITOR_CHANNEL_IDS = [
  '1464821272172036182',
  '1464821272172036182'
];

// Guild and channels for !clear command
const CLEAR_GUILD_ID = '1403167079414104175';
const CLEAR_CHANNEL_IDS = [
  '1464821272172036182',
  '1464821272172036182'
];

// Webhook for clear completion notification
const CLEAR_WEBHOOK_URL = 'https://discord.com/api/webhooks/1464820906798088235/KQpH5RQBKqgIURvpxvDHtOtdg0HIZUIEosdL4QtduyGSUrNL4mwDd4FFZFpQo7y6jgFY';

// Initial focus terms (can be changed with !setglaze)
let glazeTerms = ['item factor', 'factor'];

// Track sent GIFs to avoid duplicates (persists for session)
const sentGifs = new Set();

// Random search terms for fetching GIFs (keeps things varied)
const GIF_SEARCH_TERMS = [
  'funny', 'reaction', 'meme', 'laugh', 'celebrate', 'wow', 'cool',
  'dance', 'happy', 'excited', 'amazing', 'fire', 'lit', 'vibe',
  'bruh', 'lol', 'hype', 'win', 'mood', 'trending', 'viral',
  'comedy', 'random', 'crazy', 'epic', 'legendary', 'goat'
];

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
if (!GIPHY_API_KEY && !TENOR_API_KEY) {
  console.error('At least one of GIPHY_API_KEY or TENOR_API_KEY must be set');
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

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ------------- GIF FETCHING -------------

// Fetch a random GIF from Giphy
async function fetchGiphyGif() {
  if (!GIPHY_API_KEY) return null;
  
  try {
    const searchTerm = getRandomElement(GIF_SEARCH_TERMS);
    const offset = Math.floor(Math.random() * 100); // Random offset for variety
    
    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: GIPHY_API_KEY,
        q: searchTerm,
        limit: 50,
        offset: offset,
        rating: 'pg-13'
      }
    });
    
    const gifs = response.data?.data || [];
    if (gifs.length === 0) return null;
    
    // Shuffle and find one we haven't sent
    const shuffled = shuffle(gifs);
    for (const gif of shuffled) {
      const url = gif.url; // Use the Giphy page URL (Discord embeds it)
      if (url && !sentGifs.has(url)) {
        return url;
      }
    }
    return null;
  } catch (err) {
    console.error('[Giphy] Error fetching GIF:', err.message);
    return null;
  }
}

// Fetch a random GIF from Tenor
async function fetchTenorGif() {
  if (!TENOR_API_KEY) return null;
  
  try {
    const searchTerm = getRandomElement(GIF_SEARCH_TERMS);
    const pos = Math.floor(Math.random() * 50); // Random position for variety
    
    const response = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: {
        key: TENOR_API_KEY,
        q: searchTerm,
        limit: 50,
        pos: pos.toString(),
        contentfilter: 'medium'
      }
    });
    
    const gifs = response.data?.results || [];
    if (gifs.length === 0) return null;
    
    // Shuffle and find one we haven't sent
    const shuffled = shuffle(gifs);
    for (const gif of shuffled) {
      const url = gif.url; // Tenor share URL (Discord embeds it)
      if (url && !sentGifs.has(url)) {
        return url;
      }
    }
    return null;
  } catch (err) {
    console.error('[Tenor] Error fetching GIF:', err.message);
    return null;
  }
}

// Get a unique random GIF from either Giphy or Tenor
async function getUniqueRandomGif() {
  // Randomly choose which service to try first
  const tryGiphyFirst = Math.random() > 0.5;
  
  let gifUrl = null;
  
  if (tryGiphyFirst) {
    gifUrl = await fetchGiphyGif();
    if (!gifUrl) {
      gifUrl = await fetchTenorGif();
    }
  } else {
    gifUrl = await fetchTenorGif();
    if (!gifUrl) {
      gifUrl = await fetchGiphyGif();
    }
  }
  
  if (gifUrl) {
    sentGifs.add(gifUrl);
    console.log(`[GIF] Fetched unique GIF: ${gifUrl}`);
    
    // Clean up old entries if set gets too large (prevent memory issues)
    if (sentGifs.size > 10000) {
      const entries = [...sentGifs];
      sentGifs.clear();
      // Keep the most recent 5000
      entries.slice(-5000).forEach(url => sentGifs.add(url));
      console.log('[GIF] Cleaned up sent GIFs cache');
    }
  }
  
  return gifUrl;
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

// ------------- CLEAR MESSAGES FUNCTION -------------
// Delete all messages from a specific token in a channel
async function clearMessagesForToken(token, channelId, tokenLabel) {
  return new Promise((resolve) => {
    const c = new Client({ checkUpdate: false });
    let totalDeleted = 0;

    c.on('ready', async () => {
      try {
        const channel = c.channels.cache.get(channelId) ||
          (await c.channels.fetch(channelId).catch(() => null));
        
        if (!channel) {
          console.log(`[Clear] ${tokenLabel}: Could not find channel ${channelId}`);
          await c.destroy();
          return resolve(0);
        }

        const userId = c.user.id;
        let lastMessageId = null;
        let hasMore = true;

        console.log(`[Clear] ${tokenLabel}: Starting deletion in channel ${channelId}...`);

        while (hasMore) {
          // Fetch messages (100 at a time, max allowed)
          const fetchOptions = { limit: 100 };
          if (lastMessageId) {
            fetchOptions.before = lastMessageId;
          }

          const messages = await channel.messages.fetch(fetchOptions).catch(() => null);
          if (!messages || messages.size === 0) {
            hasMore = false;
            break;
          }

          // Filter for messages from this user
          const myMessages = messages.filter(m => m.author.id === userId);
          
          // Delete each message
          for (const [msgId, msg] of myMessages) {
            try {
              await msg.delete();
              totalDeleted++;
              // Small delay to avoid rate limiting
              await sleep(1100);
            } catch (err) {
              console.log(`[Clear] ${tokenLabel}: Could not delete message ${msgId}: ${err.message}`);
            }
          }

          // Update lastMessageId for pagination
          lastMessageId = messages.last()?.id;
          
          // If we got fewer than 100 messages, we've reached the end
          if (messages.size < 100) {
            hasMore = false;
          }
        }

        console.log(`[Clear] ${tokenLabel}: Deleted ${totalDeleted} messages in channel ${channelId}`);
      } catch (err) {
        console.error(`[Clear] ${tokenLabel}: Error:`, err.message);
      } finally {
        await c.destroy();
        resolve(totalDeleted);
      }
    });

    c.login(token).catch((err) => {
      console.error(`[Clear] ${tokenLabel}: Login failed:`, err.message);
      resolve(0);
    });
  });
}

// Clear all messages for bot accounts in specified channels
async function clearAllMessages(replyChannel) {
  // Only use the 4 bot tokens (not the main token)
  const botTokens = BOT_ACCOUNTS
    .map((acc, i) => ({ token: acc.token, label: `Bot Token ${i + 1}` }))
    .filter(t => t.token);

  if (botTokens.length === 0) {
    console.log('[Clear] No bot tokens available');
    return;
  }

  await replyChannel.send(`🗑️ Starting message cleanup for ${botTokens.length} bot accounts across ${CLEAR_CHANNEL_IDS.length} channels...`);
  console.log(`[Clear] Starting cleanup for ${botTokens.length} bot accounts...`);

  let grandTotal = 0;

  for (const { token, label } of botTokens) {
    for (const channelId of CLEAR_CHANNEL_IDS) {
      const deleted = await clearMessagesForToken(token, channelId, label);
      grandTotal += deleted;
    }
  }

  await replyChannel.send(`✅ Cleanup complete! Deleted ${grandTotal} total messages.`);
  console.log(`[Clear] Cleanup complete! Total deleted: ${grandTotal}`);

  // Send webhook notification
  try {
    const embed = {
      title: 'Done!',
      description: `Successfully cleared ${grandTotal} messages from ${botTokens.length} bot accounts.`,
      color: 0x00ff00,
      timestamp: new Date().toISOString()
    };
    await axios.post(CLEAR_WEBHOOK_URL, { embeds: [embed] });
    console.log('[Clear] Sent completion webhook notification');
  } catch (err) {
    console.error('[Clear] Failed to send webhook:', err.message);
  }
}

// Token 1 sends TEXT_BLOCK as soon as a message has blacklisted words (no AI)
async function sendToken1TextBlock(channelId) {
  const token1 = BOT_ACCOUNTS[0];
  if (!token1?.token) return;
  await withChannel(token1.token, channelId, async (ch) => {
    await ch.send(TEXT_BLOCK);
    console.log('[Glaze] Token 1 sent text block');
  });
}

// 1 GIF per token, rotate until 4 total sent (round-robin, no Token 1)
const GIF_LIMIT = 4;

async function sendGifsForAlert(channelId) {
  const otherAccounts = BOT_ACCOUNTS.slice(1).filter((acc) => acc.token);
  if (otherAccounts.length === 0) return;

  const accountOrder = shuffle(otherAccounts);
  let gifsSent = 0;
  let accountIndex = 0;

  while (gifsSent < GIF_LIMIT) {
    const acc = accountOrder[accountIndex % accountOrder.length];
    
    // Fetch a unique random GIF
    const gifUrl = await getUniqueRandomGif();
    
    if (!gifUrl) {
      console.log('[Glaze] Could not fetch a unique GIF, stopping');
      break;
    }
    
    await withChannel(acc.token, channelId, async (ch) => {
      await ch.send(gifUrl);
      console.log(`[Glaze] Account ${accountIndex + 2} sent GIF: ${gifUrl}`);
    });
    
    gifsSent++;
    accountIndex++;
    
    if (gifsSent < GIF_LIMIT) {
      await sleep(5200);
    }
  }
  
  console.log(`[Glaze] Sent ${gifsSent} GIFs total`);
}

// ------------- MESSAGE HANDLING -------------
client.on('ready', () => {
  console.log(`Glaze selfbot logged in as ${client.user.tag}`);
  console.log(`Monitoring channels: ${MONITOR_CHANNEL_IDS.join(', ')}`);
  console.log(`Initial glaze terms: ${termsAsText()}`);
  console.log(`GIF APIs: Giphy=${GIPHY_API_KEY ? 'enabled' : 'disabled'}, Tenor=${TENOR_API_KEY ? 'enabled' : 'disabled'}`);
});

client.on('messageCreate', async (message) => {
  try {
    const content = message.content?.trim();
    if (!content) return;

    // ------- COMMAND: clear all messages in target channels -------
    if (content.toLowerCase() === '!clear') {
      // Only allow in the target guild
      if (message.guild?.id !== CLEAR_GUILD_ID) {
        await message.reply(`❌ This command only works in guild ${CLEAR_GUILD_ID}`);
        return;
      }
      await message.reply('🔄 Starting message cleanup... This may take a while.');
      console.log(`[Clear] Command triggered by ${message.author.tag}`);
      
      // Run cleanup (don't await to avoid blocking)
      clearAllMessages(message.channel).catch(err => {
        console.error('[Clear] Error during cleanup:', err);
      });
      return;
    }

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

    // Blacklisted words (glaze terms): does the message contain any?
    const mentionsConfiguredTerm = glazeTerms.some(
      (term) => term && lower.includes(term)
    );
    if (!mentionsConfiguredTerm) return;

    // ------- Token 1: send text block IMMEDIATELY when blacklisted words appear (no AI) -------
    await sendToken1TextBlock(message.channel.id);

    const focusList = termsAsText();

    // ------- Ask Gemini whether we also do webhook + GIFs -------
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

    // ------- 4 GIFs only, round-robin (Token 1 already sent above) -------
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
