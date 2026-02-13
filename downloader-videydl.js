const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ------ Helpers yang bikin aman lintas platform (Telegraf/WA) ------
function getMessageId(msg) {
  // urutan fallback: Telegram → generic → WA-style
  return msg?.message_id
      ?? msg?.id
      ?? msg?.key?.id
      ?? msg?.message?.message_id
      ?? msg?.message?.id
      ?? msg?.message?.key?.id
      ?? null;
}

function getChatId(obj) {
  // m.chat bisa string/number (WA) atau object (Telegram)
  return obj?.chat?.id ?? obj?.chat ?? obj?.message?.chat?.id ?? null;
}

async function safeDelete(conn, chat, msgOrId) {
  const chatId = getChatId({ chat });
  const id = typeof msgOrId === 'string' || typeof msgOrId === 'number' ? msgOrId : getMessageId(msgOrId);
  if (!chatId || !id) return false;
  try {
    await conn.deleteMessage(chatId, id);
    return true;
  } catch (e) {
    // diam saja, jangan bikin crash
    return false;
  }
}

async function safeEditOrReply(conn, m, loadingMsg, text) {
  // Coba edit pesan loading; kalau gagal, kirim pesan baru
  try {
    const chatId = getChatId(m);
    const msgId = getMessageId(loadingMsg);
    if (chatId && msgId && conn.editMessage) {
      await conn.editMessage(chatId, { message_id: msgId }, { text });
      return;
    }
  } catch {}
  try { await m.reply(text); } catch {}
}

// ----------------- Session store per chat -----------------
let videySessions = {};

// ----------------- Utils download & media -----------------
async function downloadVidey(id) {
  const ext = id.length === 9 && id[8] === '2' ? '.mov' : '.mp4';
  const videoUrl = `https://cdn.videy.co/${id}${ext}`;
  const filename = `${id}${ext}`;
  const filepath = path.join(__dirname, '../tmp', filename);

  try {
    const res = await axios.get(videoUrl, { responseType: 'stream' });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      res.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return { filepath, filename, ext };
  } catch (err) {
    throw new Error('Failed to download video: ' + err.message);
  }
}

async function getVideoDuration(inputPath) {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim());
  } catch {
    return null;
  }
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
}

async function createPreview(inputPath, outputPath) {
  try {
    const command = `ffmpeg -i "${inputPath}" -t 5 -c:v libx264 -c:a aac -preset fast "${outputPath}" -y`;
    await execAsync(command);
    return true;
  } catch {
    return false;
  }
}

// ----------------- Handler utama -----------------
let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0] || !args[0].includes('id=')) {
    return m.reply(`Usage: ${usedPrefix + command} https://videy.co/v/?id=VIDEO_ID`);
  }

  const idMatch = args[0].match(/id=([a-zA-Z0-9]+)/);
  if (!idMatch) return m.reply('❌ Invalid video ID');

  const id = idMatch[1];
  const loadingMsg = await m.reply(`📥 Downloading video...\nID: ${id}`);

  try {
    const { filepath, filename, ext } = await downloadVidey(id);
    const duration = await getVideoDuration(filepath);
    const durationFormatted = formatDuration(duration);

    const previewPath = path.join(__dirname, '../tmp', `preview_${filename}`);
    const previewCreated = await createPreview(filepath, previewPath);

    // ID pesan original (buat quote balasan)
    const originalMessageId = getMessageId(m);

    const buttons = [[
      { text: '📹 Download Full', callback_data: `videydl_full_${id}` },
      { text: 'ℹ️ Info', callback_data: `videydl_info_${id}` }
    ]];

    const caption = `🎬 *Video Preview*\n📱 ID: ${id}\n⏰ Duration: ${durationFormatted}`;

    // param "quoted" biar fleksibel: kalo API kamu butuh {message_id}, kasih itu; kalo butuh objek kosong, juga aman
    const quotedParam = originalMessageId ? { message_id: originalMessageId } : {};

    const mediaParam = previewCreated && fs.existsSync(previewPath)
      ? { video: { source: fs.createReadStream(previewPath) }, supports_streaming: true }
      : { video: { source: fs.createReadStream(filepath) } };

    const sentMessage = await conn.sendButt(
      getChatId(m),
      caption,
      buttons,
      quotedParam,
      mediaParam
    );

    videySessions[id] = {
      filepath,
      filename,
      ext,
      duration: durationFormatted,
      originalMessageId,
      currentMessageId: getMessageId(sentMessage)
    };

    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);

    // Hapus loading message dengan aman
    await safeDelete(conn, m.chat, loadingMsg);

  } catch (err) {
    console.error(err);
    await safeEditOrReply(conn, m, loadingMsg, `❌ Error: ${err.message}`);
  }
};

// ----------------- Callback untuk tombol -----------------
handler.callback = async (conn, ctx) => {
  const data = ctx?.callbackQuery?.data;
  if (!data || !data.startsWith('videydl_')) return;

  const [action, id] = data.split('_').slice(1);
  const session = videySessions[id];
  if (!session) return ctx.answerCbQuery?.('❌ Session expired', { show_alert: true });

  try {
    await ctx.answerCbQuery?.(action === 'info' ? 'ℹ️ Getting info...' : '📤 Sending video...');

    const fileSizeMB = (() => {
      try { return fs.statSync(session.filepath).size / (1024 * 1024); }
      catch { return 0; }
    })();

    const quotedParam = session.originalMessageId ? { message_id: session.originalMessageId } : {};
    const chatId = getChatId(ctx);

    if (action === 'full') {
      await conn.sendButt(
        chatId,
        `🎬 *Full Video*\n📱 ID: ${id}\n⏰ ${session.duration}\n📦 ${fileSizeMB.toFixed(2)} MB`,
        [],
        quotedParam,
        {
          video: { source: fs.createReadStream(session.filepath) },
          supports_streaming: true
        }
      );

      // cleanup file + session setelah kirim
      setTimeout(() => {
        try {
          if (fs.existsSync(session.filepath)) fs.unlinkSync(session.filepath);
        } catch (e) {
          console.error('Cleanup file error:', e);
        } finally {
          delete videySessions[id];
        }
      }, 30_000);

    } else if (action === 'info') {
      const buttons = [[{ text: '📹 Download Full', callback_data: `videydl_full_${id}` }]];
      await conn.sendButt(
        chatId,
        `📋 *Video Info*\n\n🆔 ID: ${id}\n📁 Format: ${session.ext.slice(1).toUpperCase()}\n⏰ Duration: ${session.duration}\n📦 Size: ${fileSizeMB.toFixed(2)} MB\n🔗 URL: https://cdn.videy.co/${id}${session.ext}`,
        buttons,
        quotedParam
      );
    }
  } catch (err) {
    console.error(err);
    try { await ctx.answerCbQuery?.('❌ Operation failed', { show_alert: true }); } catch {}
  }
};

handler.help = ['videydl <url>'];
handler.tags = ['downloader'];
handler.command = /^videydl$/i;

module.exports = handler;