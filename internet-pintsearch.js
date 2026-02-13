const axios = require("axios")
const cheerio = require("cheerio")
const moment = require("moment-timezone")

const TOTAL_MINUTES = 3
const TIMEZONE = "Asia/Jakarta"
const ADMIN_IDS = ["1087968824", "136817688"]

let pinterestResults = {}
let countdownIntervals = {}

const toStr = (v) => (v === undefined || v === null ? null : String(v))

function pinterest(query) {
  return new Promise(async(resolve, reject) => {
    axios.get('https://id.pinterest.com/search/pins/?autologin=true&q=' + query, {
      headers: {
        "cookie": "_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dU8ybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYcGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0=; _ir=0"
      }
    }).then(({ data }) => {
      const $ = cheerio.load(data)
      const result = []
      const hasil = []
      $('div > a').get().map(b => {
        const link = $(b).find('img').attr('src')
        result.push(link)
      })
      result.forEach(v => {
        if(v == undefined) return
        hasil.push(v.replace(/236/g,'736'))
      })
      hasil.shift()
      resolve(hasil)
    }).catch(reject)
  })
}

async function pinterest2(query) {
  return new Promise(async (resolve, reject) => {
    const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/'
    const queryParams = {
      source_url: '/search/pins/?q=' + encodeURIComponent(query),
      data: JSON.stringify({
        options: {
          isPrefetch: false,
          query,
          scope: 'pins',
          no_fetch_context_on_resource: false
        },
        context: {}
      }),
      _: Date.now()
    }
    const url = new URL(baseUrl)
    Object.entries(queryParams).forEach(entry => url.searchParams.set(entry[0], entry[1]))
    try {
      const json = await (await fetch(url.toString())).json()
      const results = json.resource_response?.data?.results?? []
      const result = results.map(item => ({
        pin: 'https://www.pinterest.com/pin/' + item.id?? '',
        link: item.link?? '',
        created_at: (new Date(item.created_at)).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) ?? '',
        id: item.id?? '',
        images_url: item.images?.['736x']?.url?? '',
        grid_title: item.grid_title?? ''
      }))
      resolve(result)
    } catch (e) {
      reject([])
    }
  })
}

async function getPinterestResults(query) {
  try {
    const { data } = await axios.get(`https://api.betabotz.eu.org/api/search/pinterest?text1=${encodeURIComponent(query)}&apikey=${lann}`)
    if (data && data.result && data.result.length) {
      return data.result
    }
  } catch (e) {
    console.log('Primary API failed:', e.message)
  }

  try {
    const results = await pinterest2(query)
    if (results && results.length) {
      return results.map(item => item.images_url).filter(url => url)
    }
  } catch (e) {
    console.log('Fallback API 1 failed:', e.message)
  }

  try {
    const results = await pinterest(query)
    if (results && results.length) {
      return results
    }
  } catch (e) {
    console.log('Fallback API 2 failed:', e.message)
  }

  throw new Error('Semua API gagal')
}
  function escapeMarkdown(text) {
  if (!text) return ""
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}

function isAdmin(userId) {
  const idStr = toStr(userId)
  return ADMIN_IDS.includes(idStr)
}

function isAnonymousId(userId) {
  const id = Number(userId)
  return id === 1087968824 || id === 136817688
}

function getSafeChatId(m) {
  return (
    m?.chat?.id ??
    m?.message?.chat?.id ??
    m?.callbackQuery?.message?.chat?.id ??
    m?.update?.message?.chat?.id ??
    m?.msgs?.chat?.id ??
    m?.msgs?.message?.chat?.id ??
    m?.fakeObj?.update?.message?.chat?.id ??
    null
  )
}

function getSenderId(m) {
  const id = (
    m?.from?.id ??
    m?.message?.from?.id ??
    m?.callbackQuery?.from?.id ??
    m?.update?.message?.from?.id ??
    m?.sender ??
    m?.senderId ??
    m?.msgs?.from?.id ??
    m?.msgs?.message?.from?.id ??
    m?.fakeObj?.update?.message?.from?.id ??
    null
  )
  
  if (isAnonymousId(id)) {
    return 'anon'
  }
  
  return id
}

function formatTime(ts) {
  return moment(ts).tz(TIMEZONE).format("HH:mm:ss")
}

function buildCaption(query, page, total, timeLeft, startTime, endTime, isAdminUser = false) {
  const cleanQuery = escapeMarkdown(query)
  const adminBadge = isAdminUser ? " \\👑" : ""
  return `🔍 *Pinterest Search*${adminBadge}
🖼️ *${page + 1} / ${total}*
🔎 Query: \`${cleanQuery}\`
🕒 *Mulai:* ${formatTime(startTime)}
⏳ *Selesai:* ${formatTime(endTime)}
⏱️ *Sisa:* ${timeLeft} menit`
}

function buildCaptionSeconds(query, page, total, secondsLeft, startTime, endTime, isAdminUser = false) {
  const cleanQuery = escapeMarkdown(query)
  const adminBadge = isAdminUser ? " \\👑" : ""
  return `🔍 *Pinterest Search*${adminBadge}
🖼️ *${page + 1} / ${total}*
🔎 Query: \`${cleanQuery}\`
🕒 *Mulai:* ${formatTime(startTime)}
⏳ *Selesai:* ${formatTime(endTime)}
⚠️ *Sisa:* ${secondsLeft} detik`
}

function buildButtons(conn, ownerKey, page, total, timeLeft, currentUrl, isAdminUser = false) {
  const k = String(ownerKey)
  const nav = []
  if (page > 0) nav.push(conn.createButton("⬅️ Prev", { callback_data: `pin_prev_${k}` }))
  if (page < total - 1) nav.push(conn.createButton("➡️ Next", { callback_data: `pin_next_${k}` }))
  
  const closeText = isAdminUser ? `❌ Close (${timeLeft + 10}m)` : `❌ Close (${timeLeft}m)`
  
  return [
    ...(nav.length ? [nav] : []),
    [
      conn.createButton("💾 Download", { url: currentUrl }),
      conn.createButton(closeText, { callback_data: `pin_close_${k}` })
    ]
  ]
}

function buildButtonsSeconds(conn, ownerKey, page, total, secondsLeft, currentUrl, isAdminUser = false) {
  const k = String(ownerKey)
  const nav = []
  if (page > 0) nav.push(conn.createButton("⬅️ Prev", { callback_data: `pin_prev_${k}` }))
  if (page < total - 1) nav.push(conn.createButton("➡️ Next", { callback_data: `pin_next_${k}` }))
  
  const closeText = isAdminUser ? `👑 Close (${secondsLeft}s)` : `⚠️ Close (${secondsLeft}s)`
  
  return [
    ...(nav.length ? [nav] : []),
    [
      conn.createButton("💾 Download", { url: currentUrl }),
      conn.createButton(closeText, { callback_data: `pin_close_${k}` })
    ]
  ]
}

async function forceCloseExisting(conn, ownerKey, reasonText = "Sesi sebelumnya ditutup karena membuat sesi baru.") {
  const s = pinterestResults[ownerKey]
  if (!s) return
  const { chatId, sentMessages } = s
  if (sentMessages && sentMessages.length) {
    for (const msgId of sentMessages) {
      try { await conn.deleteMessage(chatId, msgId) } catch {}
    }
  }
  cleanup(ownerKey)
  try { await conn.sendMessage(chatId, { text: `⚠️ ${reasonText}` }) } catch {}
}

let handler = async (m, { conn, text }) => {
  if (!text) throw "🚩 Contoh: /pinterest kucing lucu"

  const chatIdRaw = getSafeChatId(m)
  const senderIdRaw = getSenderId(m)
  if (chatIdRaw === null || senderIdRaw === null) throw "❌ Error: ID tidak ditemukan"

  const chatId = chatIdRaw
  const ownerKey = toStr(senderIdRaw)
  if (!ownerKey) throw "❌ Error: ID tidak ditemukan"

  const isAdminUser = isAdmin(senderIdRaw) || ownerKey === 'anon'
  
  if (pinterestResults[ownerKey]) {
    await forceCloseExisting(conn, ownerKey)
  }

  if (typeof m.reply !== "function") m.reply = async (txt) => await conn.sendMessage(chatId, { text: txt })
  
  const searchMessage = isAdminUser ? "👑 Admin - Mencari di Pinterest..." : "🔄 Mencari di Pinterest..."
  await m.reply(searchMessage)

  try {
    const res = await getPinterestResults(text)
    if (!res || !res.length) return m.reply("❌ Tidak ada hasil ditemukan.")
    const originalMessageId =
      m?.message_id ||
      m?.id ||
      m?.message?.message_id ||
      m?.callbackQuery?.message?.message_id ||
      null

    const startTime = Date.now()
    const sessionMinutes = isAdminUser ? TOTAL_MINUTES + 10 : TOTAL_MINUTES
    const endTime = startTime + sessionMinutes * 60 * 1000

    pinterestResults[ownerKey] = {
      chatId,
      ownerKey,
      query: text,
      items: res,
      page: 0,
      originalMessageId,
      currentMessageId: null,
      startTime,
      endTime,
      lastCaption: null,
      lastButtons: null,
      lastEditTime: Date.now(),
      sentMessages: [],
      isAdmin: isAdminUser,
      sessionMinutes: sessionMinutes
    }

    await sendPinterestPage(conn, ownerKey)
    startCountdown(conn, ownerKey)
  } catch (e) {
    m.reply("❌ Terjadi kesalahan: " + (e?.response?.data?.message || e.message))
  }
}

async function sendPinterestPage(conn, ownerKey, shouldDelete = false) {
  const s = pinterestResults[ownerKey]
  if (!s) return
  const { chatId, query, items, page, originalMessageId, startTime, endTime, isAdmin } = s

  if (shouldDelete && s.currentMessageId) {
    try { await conn.deleteMessage(chatId, s.currentMessageId) } catch {}
  }

  const timeLeft = Math.ceil((endTime - Date.now()) / (60 * 1000))
  const caption = buildCaption(query, page, items.length, timeLeft, startTime, endTime, isAdmin)
  const buttons = buildButtons(conn, ownerKey, page, items.length, timeLeft, items[page], isAdmin)

  s.lastCaption = caption
  s.lastButtons = buttons
  s.lastEditTime = Date.now()

  try {
    const sent = await conn.sendButt(chatId, { text: caption, image: items[page] }, buttons, { message_id: originalMessageId })
    s.currentMessageId = sent?.message_id || sent?.id
    if (s.currentMessageId) s.sentMessages.push(s.currentMessageId)
  } catch {
    const sent = await conn.sendMessage(chatId, { text: caption, reply_markup: { inline_keyboard: buttons } })
    s.currentMessageId = sent?.message_id || sent?.id
    if (s.currentMessageId) s.sentMessages.push(s.currentMessageId)
  }
}

function startCountdown(conn, ownerKey) {
  if (countdownIntervals[ownerKey]) clearInterval(countdownIntervals[ownerKey])
  countdownIntervals[ownerKey] = setInterval(async () => {
    const s = pinterestResults[ownerKey]
    if (!s) {
      clearInterval(countdownIntervals[ownerKey])
      return
    }
    const now = Date.now()
    const secondsLeft = Math.floor((s.endTime - now) / 1000)
    if (secondsLeft <= 0) {
      clearInterval(countdownIntervals[ownerKey])
      return await closeSessionAuto(conn, ownerKey)
    }
    try {
      if (secondsLeft <= 60) {
        const cap = buildCaptionSeconds(s.query, s.page, s.items.length, secondsLeft, s.startTime, s.endTime, s.isAdmin)
        const btn = buildButtonsSeconds(conn, ownerKey, s.page, s.items.length, secondsLeft, s.items[s.page], s.isAdmin)
        if (cap !== s.lastCaption && s.currentMessageId) {
          await conn.editMessage(s.chatId, s.currentMessageId, { caption: cap }, { reply_markup: { inline_keyboard: btn } })
          s.lastCaption = cap
          s.lastButtons = btn
        }
      } else if (now - s.lastEditTime >= 60000) {
        const minutesLeft = Math.ceil(secondsLeft / 60)
        const cap = buildCaption(s.query, s.page, s.items.length, minutesLeft, s.startTime, s.endTime, s.isAdmin)
        const btn = buildButtons(conn, ownerKey, s.page, s.items.length, minutesLeft, s.items[s.page], s.isAdmin)
        if (cap !== s.lastCaption && s.currentMessageId) {
          await conn.editMessage(s.chatId, s.currentMessageId, { caption: cap }, { reply_markup: { inline_keyboard: btn } })
          s.lastCaption = cap
          s.lastButtons = btn
        }
        s.lastEditTime = now
      }
    } catch {}
  }, 1000)
}

async function closeSessionAuto(conn, ownerKey) {
  const s = pinterestResults[ownerKey]
  if (!s) return
  const { chatId, query, sentMessages, isAdmin } = s
  if (sentMessages && sentMessages.length) {
    for (const msgId of sentMessages) {
      try { await conn.deleteMessage(chatId, msgId) } catch {}
    }
  }
  cleanup(ownerKey)
  
  const endMessage = isAdmin 
    ? `👑 *Admin Pinterest search berakhir otomatis*\n\n_Pencarian: "${escapeMarkdown(query)}"_`
    : `❌ *Pinterest search berakhir otomatis*\n\n_Pencarian: "${escapeMarkdown(query)}"_`
    
  await conn.sendMessage(chatId, {
    text: endMessage,
    parse_mode: "Markdown"
  })
}

function cleanup(ownerKey) {
  if (pinterestResults[ownerKey]) delete pinterestResults[ownerKey]
  if (countdownIntervals[ownerKey]) {
    clearInterval(countdownIntervals[ownerKey])
    delete countdownIntervals[ownerKey]
  }
}

handler.callback = async (conn, ctx) => {
  const data = ctx?.callbackQuery?.data
  if (!data || !data.startsWith("pin_")) return
  const parts = data.split("_")
  if (parts.length < 3) return
  const action = parts[1]
  const ownerKey = parts[2]
  const s = pinterestResults[ownerKey]
  const actorId = toStr(ctx?.from?.id)

  if (!s) return ctx.answerCbQuery("❌ Sesi tidak ditemukan atau sudah berakhir.", { show_alert: true })
  
  const isActorAnonymous = isAnonymousId(ctx?.from?.id)
  const isOwnerAnonymous = ownerKey === 'anon'
  const isActorAdmin = isAdmin(ctx?.from?.id)
  
  if (!isActorAdmin && !isActorAnonymous && !isOwnerAnonymous && actorId !== ownerKey) {
    return ctx.answerCbQuery("❌ Hanya pengirim perintah yang bisa memakai tombol ini.", { show_alert: true })
  }

  try {
    switch (action) {
      case "prev":
        await ctx.answerCbQuery("⏳ Memuat sebelumnya...")
        if (s.page === 0) return ctx.answerCbQuery("❌ Ini sudah gambar pertama!", { show_alert: true })
        s.page--
        await sendPinterestPage(conn, ownerKey, true)
        break
      case "next":
        await ctx.answerCbQuery("⏳ Memuat selanjutnya...")
        if (s.page >= s.items.length - 1) return ctx.answerCbQuery("❌ Ini sudah gambar terakhir!", { show_alert: true })
        s.page++
        await sendPinterestPage(conn, ownerKey, true)
        break
      case "close":
        const closeAlert = isActorAdmin || isActorAnonymous ? "👑 Admin - Menutup Pinterest..." : "❌ Menutup Pinterest..."
        await ctx.answerCbQuery(closeAlert, { show_alert: true })
        if (s.sentMessages && s.sentMessages.length) {
          for (const msgId of s.sentMessages) {
            try { await conn.deleteMessage(s.chatId, msgId) } catch {}
          }
        }
        const q = s.query
        const c = s.chatId
        cleanup(ownerKey)
        
        const closeMessage = isActorAdmin || isActorAnonymous
          ? `👑 *Admin menutup Pinterest search*\n\n_Pencarian: "${escapeMarkdown(q)}"_`
          : `❌ *Pinterest search ditutup*\n\n_Pencarian: "${escapeMarkdown(q)}"_`
          
        await conn.sendMessage(c, {
          text: closeMessage,
          parse_mode: "Markdown"
        })
        break
      default:
        await ctx.answerCbQuery("❌ Action tidak dikenal", { show_alert: true })
        break
    }
  } catch (e) {
    await ctx.answerCbQuery("❌ Terjadi kesalahan: " + e.message, { show_alert: true })
  }
}

handler.help = ["pinterest"]
handler.tags = ["internet", "downloader"]
handler.command = /^pinterest$/i

module.exports = handler