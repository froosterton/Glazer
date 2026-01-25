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
// Pre-populated list of Tenor GIF URLs (no API key needed)
const GIF_POOL = [
  'https://tenor.com/view/laugh-gif-25559911',
  'https://tenor.com/view/reaction-gif-22954713',
  'https://tenor.com/view/funny-gif-20075640',
  'https://tenor.com/view/lol-gif-24284561',
  'https://tenor.com/view/haha-gif-21039485',
  'https://tenor.com/view/dancing-gif-17077560',
  'https://tenor.com/view/celebrate-gif-14739319',
  'https://tenor.com/view/excited-gif-16109475',
  'https://tenor.com/view/happy-gif-13909270',
  'https://tenor.com/view/wow-gif-15062123',
  'https://tenor.com/view/cool-gif-18290534',
  'https://tenor.com/view/fire-gif-19384756',
  'https://tenor.com/view/lit-gif-21847293',
  'https://tenor.com/view/vibe-gif-20918374',
  'https://tenor.com/view/mood-gif-17294835',
  'https://tenor.com/view/reaction-gif-14523678',
  'https://tenor.com/view/funny-gif-23847561',
  'https://tenor.com/view/meme-gif-19283746',
  'https://tenor.com/view/lmao-gif-22384756',
  'https://tenor.com/view/bruh-gif-18273645',
  'https://tenor.com/view/hype-gif-20394857',
  'https://tenor.com/view/win-gif-16283947',
  'https://tenor.com/view/epic-gif-21938475',
  'https://tenor.com/view/goat-gif-17384956',
  'https://tenor.com/view/legend-gif-19847362',
  'https://tenor.com/view/crazy-gif-20183746',
  'https://tenor.com/view/random-gif-18374652',
  'https://tenor.com/view/viral-gif-22183746',
  'https://tenor.com/view/trending-gif-19283746',
  'https://tenor.com/view/comedy-gif-17384756',
  'https://tenor.com/view/amazing-gif-21837465',
  'https://tenor.com/view/nice-gif-16284735',
  'https://tenor.com/view/great-gif-20394856',
  'https://tenor.com/view/perfect-gif-18273649',
  'https://tenor.com/view/yes-gif-22938475',
  'https://tenor.com/view/nod-gif-17293847',
  'https://tenor.com/view/agree-gif-19384756',
  'https://tenor.com/view/clap-gif-21847365',
  'https://tenor.com/view/applause-gif-16293847',
  'https://tenor.com/view/cheer-gif-20394857',
  'https://tenor.com/view/party-gif-18274635',
  'https://tenor.com/view/dance-gif-22183947',
  'https://tenor.com/view/groove-gif-17293856',
  'https://tenor.com/view/moves-gif-19384765',
  'https://tenor.com/view/vibing-gif-21847356',
  'https://tenor.com/view/chill-gif-16294837',
  'https://tenor.com/view/relax-gif-20394867',
  'https://tenor.com/view/smooth-gif-18273658',
  'https://tenor.com/view/slick-gif-22938476',
  'https://tenor.com/view/fresh-gif-17293858',
  'https://tenor.com/view/clean-gif-19384768',
  'https://tenor.com/view/sharp-gif-21847368',
  'https://tenor.com/view/sick-gif-16294839',
  'https://tenor.com/view/dope-gif-20394869',
  'https://tenor.com/view/tight-gif-18273661',
  'https://tenor.com/view/rad-gif-22938479',
  'https://tenor.com/view/gnarly-gif-17293861',
  'https://tenor.com/view/wild-gif-19384771',
  'https://tenor.com/view/insane-gif-21847371',
  'https://tenor.com/view/mental-gif-16294842',
  'https://tenor.com/view/bonkers-gif-20394872',
  'https://tenor.com/view/nuts-gif-18273664',
  'https://tenor.com/view/wacky-gif-22938482',
  'https://tenor.com/view/goofy-gif-17293864',
  'https://tenor.com/view/silly-gif-19384774',
  'https://tenor.com/view/playful-gif-21847374',
  'https://tenor.com/view/fun-gif-16294845',
  'https://tenor.com/view/joy-gif-20394875',
  'https://tenor.com/view/bliss-gif-18273667',
  'https://tenor.com/view/elated-gif-22938485',
  'https://tenor.com/view/thrilled-gif-17293867',
  'https://tenor.com/view/pumped-gif-19384777',
  'https://tenor.com/view/hyped-gif-21847377',
  'https://tenor.com/view/stoked-gif-16294848',
  'https://tenor.com/view/amped-gif-20394878',
  'https://tenor.com/view/fired-up-gif-18273670',
  'https://tenor.com/view/ready-gif-22938488',
  'https://tenor.com/view/lets-go-gif-17293870',
  'https://tenor.com/view/game-on-gif-19384780',
  'https://tenor.com/view/bring-it-gif-21847380',
  'https://tenor.com/view/come-on-gif-16294851',
  'https://tenor.com/view/do-it-gif-20394881',
  'https://tenor.com/view/send-it-gif-18273673',
  'https://tenor.com/view/full-send-gif-22938491',
  'https://tenor.com/view/yolo-gif-17293873',
  'https://tenor.com/view/no-cap-gif-19384783',
  'https://tenor.com/view/facts-gif-21847383',
  'https://tenor.com/view/real-gif-16294854',
  'https://tenor.com/view/truth-gif-20394884',
  'https://tenor.com/view/honest-gif-18273676',
  'https://tenor.com/view/straight-up-gif-22938494',
  'https://tenor.com/view/for-real-gif-17293876',
  'https://tenor.com/view/deadass-gif-19384786',
  'https://tenor.com/view/legit-gif-21847386',
  'https://tenor.com/view/valid-gif-16294857',
  'https://tenor.com/view/based-gif-20394887',
  'https://tenor.com/view/goated-gif-18273679',
  'https://tenor.com/view/bussin-gif-22938497',
  'https://tenor.com/view/sheesh-gif-17293879',
  'https://tenor.com/view/ong-gif-19384789'
];

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
ㅤㅤ
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

// ------------- GIF SELECTION -------------

// Get a unique random GIF from the pool
function getUniqueRandomGif() {
  // Get available GIFs (ones we haven't sent yet)
  const available = GIF_POOL.filter(url => !sentGifs.has(url));
  
  if (available.length === 0) {
    // All GIFs have been used, reset the sent list
    console.log('[GIF] All GIFs used, resetting pool...');
    sentGifs.clear();
    return getUniqueRandomGif();
  }
  
  // Pick a random one
  const gifUrl = available[Math.floor(Math.random() * available.length)];
  sentGifs.add(gifUrl);
  console.log(`[GIF] Selected unique GIF: ${gifUrl}`);
  
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
    
    // Get a unique random GIF from the pool
    const gifUrl = getUniqueRandomGif();
    
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
  console.log(`GIF pool: ${GIF_POOL.length} GIFs available`);
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
