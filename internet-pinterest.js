/*
const axios = require("axios");
const moment = require("moment-timezone");

// Configuration
const TOTAL_MINUTES = 3;
const TIMEZONE = "Asia/Jakarta";

// Global storage
let pinterestResults = {};
let countdownIntervals = {};

function escapeMarkdown(text = "") {
  if (!text) return "";
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

let handler = async (m, { conn, text }) => {
  if (!text) throw "🚩 Contoh: /pinterest kucing lucu";
  
  // Debug: log the input query
  console.log("Input query:", text);
  
  // Ensure chat ID exists
  const chatId = m.sender || m.key?.remoteJid;
  if (!chatId) {
    console.error("Chat ID tidak ditemukan:", m);
    throw "❌ Error: Chat ID tidak ditemukan";
  }

  console.log("Chat ID:", chatId);

  // Setup reply function if not exists
  if (typeof m.reply !== "function") {
    m.reply = async (txt) => await conn.sendMessage(chatId, { text: txt });
  }
  
  await m.reply("🔄 Mencari di Pinterest...");

  try {
    const q = encodeURIComponent(text);
    console.log("Encoded query:", q);
    
    // Make API request
    const { data } = await axios.get(`https://api.betabotz.eu.org/api/search/pinterest?text1=${q}&apikey=${lann}`);
    
    if (!data || !data.result) {
      console.error("Invalid API response:", data);
      return m.reply("❌ Response API tidak valid.");
    }
    
    const res = data.result;
    if (!res || res.length === 0) {
      return m.reply("❌ Tidak ada hasil ditemukan.");
    }

    console.log("Found results:", res.length);

    // Setup session data
    const originalMessageId = m.message_id || m.key?.id || m.id;
    const startTime = Date.now();
    const endTime = startTime + TOTAL_MINUTES * 60 * 1000;

    pinterestResults[chatId] = {
      query: text, // Store original query
      items: res,
      page: 0,
      originalMessageId,
      currentMessageId: null,
      startTime,
      endTime,
      lastCaption: null,
      lastButtons: null,
      lastEditTime: Date.now(),
      ctxList: []
    };

    console.log("Stored session data for chatId:", chatId);
    console.log("Stored query:", pinterestResults[chatId].query);

    // Send first page and start countdown
    await sendPinterestPage(conn, chatId, m);
    startCountdown(conn, chatId);
    
  } catch (e) {
    console.error("Pinterest Handler Error:", e);
    const errorMsg = e.response?.data?.message || e.message || "Unknown error";
    m.reply("❌ Terjadi kesalahan: " + errorMsg);
  }
};

function formatTime(ts) {
  return moment(ts).tz(TIMEZONE).format("HH:mm:ss");
}

async function sendPinterestPage(conn, chatId, m, shouldDelete = false) {
  const data = pinterestResults[chatId];
  if (!data) {
    console.error("No session data found for chatId:", chatId);
    return;
  }

  const { query, items, page, originalMessageId, startTime, endTime } = data;

  // Ensure chatId is valid
  if (!chatId) {
    console.error("SendPinterestPage: chatId is empty");
    return;
  }

  console.log(`Sending page ${page + 1} of ${items.length} for query: "${query}"`);

  // Delete previous message if requested
  if (shouldDelete && data.currentMessageId) {
    try { 
      await conn.deleteMessage(chatId, data.currentMessageId);
      console.log("Deleted previous message");
    } catch (e) {
      console.log("Delete message error:", e.message);
    }
  }

  // Build caption and buttons
  const caption = buildCaption(query, page, items.length, TOTAL_MINUTES, startTime, endTime);
  const buttons = buildButtons(chatId, page, items.length, TOTAL_MINUTES);

  // Store for comparison later
  data.lastCaption = caption;
  data.lastButtons = buttons;
  data.lastEditTime = Date.now();

  console.log("Sending image:", items[page]);
  console.log("Caption:", caption);

  try {
    // Try to send with image
    const quotedParam = originalMessageId ? { message_id: originalMessageId } : {};
    const sent = await conn.sendButt(chatId, caption, buttons, quotedParam, { 
      image: { url: items[page] } 
    });
    
    data.currentMessageId = sent.message_id || sent.key?.id || sent.id;
    console.log("Message sent successfully, ID:", data.currentMessageId);
    
  } catch (e) {
    console.error("SendButt error:", e.message);
    
    // Fallback: send without image if there's an error
    try {
      const sent = await conn.sendMessage(chatId, { 
        text: caption,
        reply_markup: { inline_keyboard: buttons }
      });
      data.currentMessageId = sent.message_id || sent.key?.id || sent.id;
      console.log("Fallback message sent, ID:", data.currentMessageId);
    } catch (fallbackError) {
      console.error("Fallback send error:", fallbackError.message);
      throw fallbackError;
    }
  }
}

function buildCaption(query, page, total, timeLeft, startTime, endTime) {
  console.log("Building caption for query:", query);
  
  const cleanQuery = escapeMarkdown(query);
  
  return `🔍 *Pinterest Search*
🖼️ *${page + 1} / ${total}*
🔎 Query: \`${cleanQuery}\`
🕒 *Mulai:* ${formatTime(startTime)}
⏳ *Selesai:* ${formatTime(endTime)}
⏱️ *Sisa:* ${timeLeft} menit`;
}

function buildCaptionSeconds(query, page, total, secondsLeft, startTime, endTime) {
  console.log("Building urgent caption for query:", query);
  
  const cleanQuery = escapeMarkdown(query);
  
  return `🔍 *Pinterest Search*
🖼️ *${page + 1} / ${total}*
🔎 Query: \`${cleanQuery}\`
🕒 *Mulai:* ${formatTime(startTime)}
⏳ *Selesai:* ${formatTime(endTime)}
⚠️ *Sisa:* ${secondsLeft} detik`;
}


function buildButtons(chatId, page, total, timeLeft) {
  const chatIdStr = String(chatId);
  
  const nav = [];
  if (page > 0) nav.push({ text: "⬅️ Prev", callback_data: `pin_prev_${chatIdStr}` });
  if (page < total - 1) nav.push({ text: "➡️ Next", callback_data: `pin_next_${chatIdStr}` });

  return [
    ...(nav.length ? [nav] : []),
    [
      { text: "💾 Download", callback_data: `pin_download_${chatIdStr}` },
      { text: `❌ Close (${timeLeft}m)`, callback_data: `pin_close_${chatIdStr}` }
    ]
  ];
}

function buildButtonsSeconds(chatId, page, total, secondsLeft) {
  const chatIdStr = String(chatId);
  
  const nav = [];
  if (page > 0) nav.push({ text: "⬅️ Prev", callback_data: `pin_prev_${chatIdStr}` });
  if (page < total - 1) nav.push({ text: "➡️ Next", callback_data: `pin_next_${chatIdStr}` });

  return [
    ...(nav.length ? [nav] : []),
    [
      { text: "💾 Download", callback_data: `pin_download_${chatIdStr}` },
      { text: `⚠️ Close (${secondsLeft}s)`, callback_data: `pin_close_${chatIdStr}` }
    ]
  ];
}

function startCountdown(conn, chatId) {
  // Clear existing interval if any
  if (countdownIntervals[chatId]) {
    clearInterval(countdownIntervals[chatId]);
  }

  console.log("Starting countdown for chatId:", chatId);

  countdownIntervals[chatId] = setInterval(async () => {
    const session = pinterestResults[chatId];
    if (!session) {
      console.log("No session found, clearing interval for:", chatId);
      return clearInterval(countdownIntervals[chatId]);
    }

    const now = Date.now();
    const secondsLeft = Math.floor((session.endTime - now) / 1000);

    // Session expired
    if (secondsLeft <= 0) {
      console.log("Session expired for:", chatId);
      clearInterval(countdownIntervals[chatId]);
      return await closeSessionAuto(conn, chatId);
    }

    try {
      // Last minute - show seconds
      if (secondsLeft <= 60) {
        // Answer pending callbacks
        for (const ctx of session.ctxList) {
          try {
            await ctx.answerCbQuery(`⚠️ Sisa ${secondsLeft} detik | ${formatTime(session.startTime)} - ${formatTime(session.endTime)}`);
          } catch (e) {
            console.log("AnswerCbQuery error:", e.message);
          }
        }

        // Update caption to show seconds
        const cap = buildCaptionSeconds(session.query, session.page, session.items.length, secondsLeft, session.startTime, session.endTime);
        const btn = buildButtonsSeconds(chatId, session.page, session.items.length, secondsLeft);
        
        if (cap !== session.lastCaption && session.currentMessageId) {
          await conn.editMessage(chatId, session.currentMessageId, { caption: cap }, { reply_markup: { inline_keyboard: btn } });
          session.lastCaption = cap;
          session.lastButtons = btn;
        }
        
      } else if (now - session.lastEditTime >= 60000) {
        // Update every minute
        const minutesLeft = Math.ceil(secondsLeft / 60);
        
        // Answer pending callbacks
        for (const ctx of session.ctxList) {
          try {
            await ctx.answerCbQuery(`⏱️ Sisa ${minutesLeft} menit | ${formatTime(session.startTime)} - ${formatTime(session.endTime)}`);
          } catch (e) {
            console.log("AnswerCbQuery error:", e.message);
          }
        }

        // Update caption
        const cap = buildCaption(session.query, session.page, session.items.length, minutesLeft, session.startTime, session.endTime);
        const btn = buildButtons(chatId, session.page, session.items.length, minutesLeft);
        
        if (cap !== session.lastCaption && session.currentMessageId) {
          await conn.editMessage(chatId, session.currentMessageId, { caption: cap }, { reply_markup: { inline_keyboard: btn } });
          session.lastCaption = cap;
          session.lastButtons = btn;
        }
        session.lastEditTime = now;
      }
    } catch (e) {
      console.error("Countdown update error:", e.message);
    }
  }, 1000);
}


async function closeSessionAuto(conn, chatId) {
  const session = pinterestResults[chatId];
  if (!session) return;

  console.log("Auto-closing session for:", chatId);

  // Preserve query for restart button
  const preservedQuery = session.query;

  try {
    if (session.currentMessageId) {
      await conn.editMessage(
        chatId,
        session.currentMessageId,
        { caption: `❌ *Sesi berakhir otomatis*\n\n_Pencarian: "${escapeMarkdown(preservedQuery)}"_\n_Klik tombol di bawah untuk mencari lagi_` },
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "🔄 Cari Lagi", callback_data: `pin_restart_${chatId}_${encodeURIComponent(preservedQuery)}` }
            ]]
          }
        }
      );
    }
  } catch (e) {
    console.error("Close session error:", e.message);
  } finally {
    // Clean up resources
    cleanup(chatId);
  }
}


function cleanup(chatId) {
  console.log("Cleaning up session for:", chatId);
  
  if (pinterestResults[chatId]) {
    delete pinterestResults[chatId];
  }
  
  if (countdownIntervals[chatId]) {
    clearInterval(countdownIntervals[chatId]);
    delete countdownIntervals[chatId];
  }
}


handler.callback = async (conn, ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("pin_")) return;

  console.log("Callback received:", data);

  const parts = data.split("_");
  if (parts.length < 3) return;
  
  const action = parts[1];
  const chatId = parts[2];
  const session = pinterestResults[chatId];

  console.log("Action:", action, "ChatId:", chatId);

  // Special handling for restart action
  if (action === "restart") {
    let lastQuery = "kucing lucu"; // default fallback
    
    // Try to get query from current session
    if (session && session.query) {
      lastQuery = session.query;
    }
    // Try to get query from callback data (for auto-close restart)
    else if (parts.length > 3) {
      try {
        lastQuery = decodeURIComponent(parts.slice(3).join('_'));
        console.log("Extracted query from callback:", lastQuery);
      } catch (e) {
        console.log("Failed to decode query from callback:", e.message);
      }
    }
    
    console.log("Restarting with query:", lastQuery);
    
    // Create a proper message object for the restart
    const msg = {
      chat: chatId,
      message_id: ctx.callbackQuery.message.message_id,
      key: { 
        id: ctx.callbackQuery.message.message_id, 
        remoteJid: chatId 
      },
      reply: async (txt) => await conn.sendMessage(chatId, { text: txt })
    };
    
    try {
      await ctx.answerCbQuery("🔄 Memulai pencarian baru...");
      
      // Clean up old session if exists
      if (session) cleanup(chatId);
      
      // Start new search with preserved query
      await handler(msg, { conn, text: lastQuery });
    } catch (e) {
      console.error("Restart error:", e.message);
      await ctx.answerCbQuery("❌ Gagal restart: " + e.message, true);
    }
    return;
  }

  // Check if session exists for other actions
  if (!session) {
    return ctx.answerCbQuery("❌ Sesi sudah tidak berlaku!", true);
  }

  // Add context to session for callback notifications
  if (!session.ctxList.some(x => x.from.id === ctx.from.id)) {
    session.ctxList.push(ctx);
  }

  try {
    switch (action) {
      case "prev":
        await ctx.answerCbQuery("⏳ Memuat sebelumnya...");
        if (session.page === 0) {
          return ctx.answerCbQuery("❌ Ini sudah gambar pertama!", true);
        }
        session.page--;
        await sendPinterestPage(conn, chatId, ctx.callbackQuery.message, true);
        break;

      case "next":
        await ctx.answerCbQuery("⏳ Memuat selanjutnya...");
        if (session.page >= session.items.length - 1) {
          return ctx.answerCbQuery("❌ Ini sudah gambar terakhir!", true);
        }
        session.page++;
        await sendPinterestPage(conn, chatId, ctx.callbackQuery.message, true);
        break;

      case "download":
        await ctx.answerCbQuery("📥 Menampilkan link download...");
        const imageUrl = session.items[session.page];
        const downloadButtons = [
          [{ text: "🔗 Open Link", url: imageUrl }],
          [{ text: "🔙 Back", callback_data: `pin_back_${chatId}` }]
        ];
        
        if (session.currentMessageId) {
          try { 
            await conn.deleteMessage(chatId, session.currentMessageId); 
          } catch (e) {
            console.log("Delete download message error:", e.message);
          }
        }
        
        const sent = await conn.sendButt(
          chatId, 
          `📥 *Download Image*\n\n🔗 Link: ${imageUrl}\n\n_Klik "Open Link" untuk membuka atau "Back" untuk kembali_`, 
          downloadButtons, 
          { message_id: session.originalMessageId }
        );
        session.currentMessageId = sent.message_id || sent.key?.id || sent.id;
        break;

      case "close":
        await ctx.answerCbQuery("❌ Menutup Pinterest...");
        
        // Preserve query for restart
        const preservedQuery = session.query;
        
        if (session.currentMessageId) {
          try { 
            await conn.deleteMessage(chatId, session.currentMessageId); 
          } catch (e) {
            console.log("Delete close message error:", e.message);
          }
        }
        
        cleanup(chatId);
        
        await conn.sendButt(
          chatId, 
          `❌ *Pinterest search ditutup*\n\n_Pencarian: "${escapeMarkdown(preservedQuery)}"_\n_Klik tombol di bawah untuk mencari lagi_`, 
          [[{ text: "🔄 Cari Lagi", callback_data: `pin_restart_${chatId}_${encodeURIComponent(preservedQuery)}` }]], 
          { message_id: session.originalMessageId }
        );
        break;

      case "back":
        await ctx.answerCbQuery("🔙 Kembali...");
        await sendPinterestPage(conn, chatId, ctx.callbackQuery.message, true);
        break;

      default:
        await ctx.answerCbQuery("❌ Action tidak dikenal", true);
        break;
    }
  } catch (e) {
    console.error("Callback handler error:", e.message);
    await ctx.answerCbQuery("❌ Terjadi kesalahan: " + e.message, true);
  }
};

// Handler configuration
handler.help = ["pinterest"];
handler.tags = ["internet", "downloader"];
handler.command = /^pinterest$/i;

module.exports = handler;
*/
