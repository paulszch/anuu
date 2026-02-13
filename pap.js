let handler = async (m, { conn, args }) => {
  const pageArg = parseInt(args && args[0], 10)
  const page = isNaN(pageArg) || pageArg < 1 ? 1 : pageArg

  // Ambil user ID pengirim (m.sender sudah langsung ID number)
  // Untuk anonymous admin, gunakan ID khusus: 1087968824 atau 136817688
  const senderId = m.from?.id || m.sender
  
  // Debug anonymous
  console.log('=== SENDER INFO ===')
  console.log('senderId:', senderId)
  console.log('Is Anonymous?:', senderId === 1087968824 || senderId === 136817688)
  console.log('===================')
  
  // Jika anonymous admin, skip validasi button (allow semua admin)
  const isAnonymous = senderId === 1087968824 || senderId === 136817688
  
  await sendMediaPage(conn, m.chat, page, m, senderId, isAnonymous)
}

handler.help = ['asups']
handler.tags = ['owner']
handler.command = /^(asups)$/i

handler.premium = false
handler.limit = false
handler.level = false
handler.group = true
handler.register = true
handler.owner = true

handler.callback = async (conn, ctx) => {
  const data = ctx.callbackQuery?.data
  if (!data) return

  const chatId = ctx.callbackQuery?.message?.chat?.id
  if (!chatId) return

  // Ambil ID user yang klik button
  const clickerId = ctx.callbackQuery?.from?.id

  // Handle button current page (dengan info halaman)
  if (data.startsWith('asupp_page_current_')) {
    const parts = data.replace('asupp_page_current_', '').split('_')
    const currentPage = parts[0]
    const senderId = parts[1]
    
    // Validasi: hanya pengirim atau anonymous yang bisa klik
    const isAnonymous = clickerId === 1087968824 || clickerId === 136817688
    if (!isAnonymous && clickerId !== Number(senderId) && senderId !== 'anon') {
      return ctx.answerCbQuery('❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
    }
    
    return ctx.answerCbQuery(`${currentPage} adalah urutan saat ini.`, { show_alert: false })
  }

  // Navigasi halaman
  if (data.startsWith('asupp_page_')) {
    const parts = data.replace('asupp_page_', '').split('_')
    const nextPage = Number(parts[0]) || 1
    const senderId = parts[1]
    
    // Validasi: hanya pengirim atau anonymous yang bisa klik
    const isAnonymous = clickerId === 1087968824 || clickerId === 136817688
    if (!isAnonymous && clickerId !== Number(senderId) && senderId !== 'anon') {
      return ctx.answerCbQuery('❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
    }
    
    // Hapus pesan lama
    const messageId = ctx.callbackQuery.message?.message_id
    if (messageId) {
      await conn.telegram.deleteMessage(chatId, messageId).catch(() => {})
    }
    
    // Kirim pesan baru
    await sendMediaPage(conn, chatId, nextPage, null, clickerId, isAnonymous)
    return ctx.answerCbQuery().catch(() => {})
  }

  // Kirim media yang sedang ditampilkan ke PM
  if (data.startsWith('asupp_pm_')) {
    const parts = data.replace('asupp_pm_', '').split('_')
    const idx = Number(parts[0])
    const senderId = parts[1]
    
    // Validasi: hanya pengirim atau anonymous yang bisa klik
    const isAnonymous = clickerId === 1087968824 || clickerId === 136817688
    if (!isAnonymous && clickerId !== Number(senderId) && senderId !== 'anon') {
      return ctx.answerCbQuery('❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
    }
    
    if (Number.isNaN(idx) || idx < 0 || idx >= asupp.length) {
      return ctx.answerCbQuery('Item tidak ditemukan.', { show_alert: true })
    }
    const url = asupp[idx]
    const isVid = /\.mp4$/i.test(url)
    const targetId = ctx.callbackQuery.from?.id

    const pmCaption = `📦 Terkirim ke pribadi: #${idx + 1}`
    
    // Semua pakai sendButt (video & image)
    await conn.sendButt(targetId, {
      text: pmCaption,
      ...(isVid ? { video: url } : { image: url }),
      parseMode: 'Markdown'
    }, [], null)
    
    return ctx.answerCbQuery('Mengirim ke chat pribadimu.', { show_alert: true })
  }
}

module.exports = handler

function formatDateTime() {
  const now = new Date()
  
  const date = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(now)
  
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(now)
  
  return { date, time }
}

async function sendMediaPage(conn, jid, page, quoted, senderId, isAnonymous = false) {
  const { date, time } = formatDateTime()
  const totalPages = asupp.length
  const currentPage = Math.max(1, Math.min(page, totalPages))
  const idx = currentPage - 1
  const mediaUrl = asupp[idx]
  const isVid = /\.mp4$/i.test(mediaUrl)

  const caption = [
    `*Asupan*`,
    `Media ke ${currentPage} Dari ${totalPages}`,
    `Tanggal: ${date}`,
    `Waktu: ${time}`,
    ``,
    `_Prev/Next untuk pindah item_`,
    `_📤 Send to PM untuk kirim ke pribadi_`
  ].join('\n')

  // Gunakan 'anon' sebagai identifier untuk anonymous admin
  const buttonSenderId = isAnonymous ? 'anon' : senderId

  // Tombol Send to PM (dengan senderId)
  const sendPmButton = [
    conn.createButton('📤 Send to PM', { callback_data: `asupp_pm_${idx}_${buttonSenderId}` })
  ]

  // Buat navigation buttons manual (dengan senderId)
  const navButtons = []
  if (currentPage > 1) {
    navButtons.push(conn.createButton('◀️ Prev', { callback_data: `asupp_page_${currentPage - 1}_${buttonSenderId}` }))
  }
  // Button current dengan encode currentPage dan senderId di callback_data
  navButtons.push(conn.createButton(`${currentPage} from ${totalPages}`, { 
    callback_data: `asupp_page_current_${currentPage}_${buttonSenderId}` 
  }))
  if (currentPage < totalPages) {
    navButtons.push(conn.createButton('Next ▶️', { callback_data: `asupp_page_${currentPage + 1}_${buttonSenderId}` }))
  }

  // Gabungkan semua buttons
  const buttons = [
    sendPmButton,
    navButtons
  ]

  // Kirim media menggunakan sendButt dengan pagination (support video & image)
  await conn.sendButt(
    jid,
    { 
      text: caption, 
      ...(isVid ? { video: mediaUrl } : { image: mediaUrl }),
      parseMode: 'Markdown' 
    },
    buttons,
    quoted
  )
}

const asupp = [
  "https://tmp.filn.xyz/uploads/b33ca9f6c4667501.jpg",
  "https://tmp.filn.xyz/uploads/65ef70eaa4b887a1.jpg",
  "https://tmp.filn.xyz/uploads/e8b751d7d4ec2cfb.mp4",
  "https://tmp.filn.xyz/uploads/b0536f23bf4e7ea5.mp4",
  "https://tmp.filn.xyz/uploads/db648361879fb246.mp4",
  "https://tmp.filn.xyz/uploads/e283721c547ee56b.mp4",
  "https://tmp.filn.xyz/uploads/f83247dccf35e75c.mp4",
  "https://tmp.filn.xyz/uploads/9115464b72fc77f7.mp4",
  "https://tmp.filn.xyz/uploads/f0e06ce24abb6e1e.mp4",
  "https://tmp.filn.xyz/uploads/2eeb7107b9eea1a1.jpg",
  "https://tmp.filn.xyz/uploads/beb47defeddd5b4c.jpg",
  "https://tmp.filn.xyz/uploads/eb929c7b38cc79f4.jpg",
  "https://tmp.filn.xyz/uploads/f0c4c8eb6d2c18d9.jpg"
]