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
// Pre-populated list of VERIFIED Tenor GIF URLs (confirmed to embed in Discord)
const GIF_POOL = [
  'https://tenor.com/view/you-are-amazing-compliment-day-you\'re-great-you-are-awesome-you-rock-gif-2084026781482709906',
  'https://tenor.com/view/sleep-time-gif-25989084',
  'https://tenor.com/view/keli-holiday-gif-3978267496766457428',
  'https://tenor.com/view/brrrr-gif-10590087637226567450',
  'https://tenor.com/view/good-morning-have-a-nice-day-cup-of-coffee-heart-love-gif-3054035059466242737',
  'https://tenor.com/view/nervous-scared-hand-shaking-shivering-gif-24524523',
  'https://tenor.com/view/gif-gif-15379971984385267012',
  'https://tenor.com/view/%D0%B4%D0%B6%D0%BE%D0%BD%D0%B0-%D1%85%D0%B8%D0%BB%D0%BB-jonah-hill-facepalm-%D1%80%D1%83%D0%BA%D0%B0-%D0%BB%D0%B8%D1%86%D0%BE-%D0%B4%D0%BE%D0%BB%D0%BE%D0%BD%D1%8F-%D0%BE%D0%B1%D0%BB%D0%B8%D1%87%D1%87%D1%8F-gif-7167197686338732060',
  'https://tenor.com/view/night-king-gif-21521750',
  'https://tenor.com/view/wheelie-rollin-they-see-me-rollin-jeep-kid-gif-5436852',
  'https://tenor.com/view/head-stand-snowman-gif-1860793099280058249',
  'https://tenor.com/view/hhgf-gif-14529573991400142151',
  'https://tenor.com/view/love-friday-love-gif-12367893480338114524',
  'https://tenor.com/view/happy-feet-happy-friday-friday-penguin-tap-dancing-gif-16815886744909591113',
  'https://tenor.com/view/eas-weather-alert-skywatcher-winter-storm-warning-gif-10344596713501469501',
  'https://tenor.com/view/my-tiny-senpai-shiori-katase-blushing-anime-girl-anime-girl-blushing-anime-santa-gif-13450474803966531994',
  'https://tenor.com/view/hug-me-im-sad-sad-girl-gif-13082547568726386573',
  'https://tenor.com/view/coffee-red-rose-good-morning-gif-17275257957144391902',
  'https://tenor.com/view/national-pie-day-pie-day-pie-pie-slice-tenor-gif-776077030181372937',
  'https://tenor.com/view/will-gif-2553459115951539861',
  'https://tenor.com/view/happy-dance-bts-yoongi-cute-gif-21755470',
  'https://tenor.com/view/jeep-snow-gif-10035761557361525283',
  'https://tenor.com/view/i-said-hey-he-man-sparkles-gif-5207389',
  'https://tenor.com/view/ice-dog-fail-gif-4685452',
  'https://tenor.com/view/perfectboykoo-bts-hearts-bts-live-gif-25414787',
  'https://tenor.com/view/thursday-morning-gif-7178052004157059780',
  'https://tenor.com/view/snoop-dogg-drop-it-like-its-hot-4number-four-fingers-calvin-broadus-jr-gif-26215289',
  'https://tenor.com/view/friday-eve-thursday-is-friday-eve-gif-1814930874371615861',
  'https://tenor.com/view/yankees-new-york-yankees-cody-bellinger-mlb-aaron-judge-gif-14148293183028009625',
  'https://tenor.com/view/go-do-it-yes-no-go-for-it-gif-17183104',
  'https://tenor.com/view/good-morning-sunshine-sun-light-gif-8709867105601794021',
  'https://tenor.com/view/thursday-gif-2917120680378249439',
  'https://tenor.com/view/thanos-memoji-gif-23490017',
  'https://tenor.com/view/winter-is-coming-jon-snow-game-of-thrones-got-gif-16908557',
  'https://tenor.com/view/sad-tigger-gif-2587323430035725369'
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
const CLEAR_GUILD_ID = '415246288779608064';
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
// Delete all messages from a specific token in all channels (runs faster with reduced delay)
async function clearMessagesForToken(token, channelIds, tokenLabel) {
  return new Promise((resolve) => {
    const c = new Client({ checkUpdate: false });
    let totalDeleted = 0;

    c.on('ready', async () => {
      try {
        const userId = c.user.id;

        // Process all channels for this token
        for (const channelId of channelIds) {
          const channel = c.channels.cache.get(channelId) ||
            (await c.channels.fetch(channelId).catch(() => null));
          
          if (!channel) {
            console.log(`[Clear] ${tokenLabel}: Could not find channel ${channelId}`);
            continue;
          }

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
            
            // Delete each message with minimal delay
            for (const [msgId, msg] of myMessages) {
              try {
                await msg.delete();
                totalDeleted++;
                // Reduced delay - handle rate limits with retry
                await sleep(300);
              } catch (err) {
                if (err.message.includes('rate limit') || err.httpStatus === 429) {
                  // Hit rate limit, wait longer then retry
                  console.log(`[Clear] ${tokenLabel}: Rate limited, waiting...`);
                  await sleep(2000);
                  try {
                    await msg.delete();
                    totalDeleted++;
                  } catch (retryErr) {
                    console.log(`[Clear] ${tokenLabel}: Could not delete message ${msgId}`);
                  }
                } else {
                  console.log(`[Clear] ${tokenLabel}: Could not delete message ${msgId}: ${err.message}`);
                }
              }
            }

            // Update lastMessageId for pagination
            lastMessageId = messages.last()?.id;
            
            // If we got fewer than 100 messages, we've reached the end
            if (messages.size < 100) {
              hasMore = false;
            }
          }
        }

        console.log(`[Clear] ${tokenLabel}: Deleted ${totalDeleted} total messages`);
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

// Clear all messages for bot accounts in specified channels (runs all tokens in parallel)
async function clearAllMessages(replyChannel) {
  // Only use the 4 bot tokens (not the main token)
  const botTokens = BOT_ACCOUNTS
    .map((acc, i) => ({ token: acc.token, label: `Bot Token ${i + 1}` }))
    .filter(t => t.token);

  if (botTokens.length === 0) {
    console.log('[Clear] No bot tokens available');
    return;
  }

  await replyChannel.send(`🗑️ Starting FAST message cleanup for ${botTokens.length} bot accounts (running in parallel)...`);
  console.log(`[Clear] Starting parallel cleanup for ${botTokens.length} bot accounts...`);

  // Run all tokens in parallel for maximum speed
  const results = await Promise.all(
    botTokens.map(({ token, label }) => 
      clearMessagesForToken(token, CLEAR_CHANNEL_IDS, label)
    )
  );

  const grandTotal = results.reduce((sum, count) => sum + count, 0);

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
