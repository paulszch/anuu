let handler = async (m, { isAdmin, isOwner, isBotAdmin, conn, args, usedPrefix, command }) => {
  // ===== DEBUG LENGKAP =====
  console.log('=== DEBUG GROUP HANDLER ===')
  console.log('Full m object:', JSON.stringify(m, null, 2))
  console.log('m.chat:', m.chat)
  console.log('m.sender:', m.sender)
  console.log('m.from:', m.from)
  console.log('m.message:', m.message)
  console.log('isAdmin:', isAdmin)
  console.log('isOwner:', isOwner)
  console.log('isBotAdmin:', isBotAdmin)
  console.log('args:', args)
  console.log('usedPrefix:', usedPrefix)
  console.log('command:', command)
  console.log('=========================')
  // ===== END DEBUG =====
  
  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn)
    throw false
  }
  if (!isBotAdmin) {
    global.dfail('botAdmin', m, conn)
    throw false
  }
  
  // Ambil chat_id yang benar
  let chatId = m.chat?.id || m.chat || m.message?.chat?.id
  
  if (!chatId) {
    console.log('❌ Error: chat_id tidak ditemukan!')
    console.log('Debug m object:', JSON.stringify(m, null, 2))
    return m.reply('Error: Tidak dapat menemukan chat_id')
  }
  
  console.log('✅ Chat ID (ID Grup) berhasil diambil:', chatId)
  console.log('   Chat Type:', m.chat?.type || m.message?.chat?.type)
  console.log('   Chat Title:', m.chat?.title || m.message?.chat?.title)
  
  let prefix = usedPrefix
  
  // Ambil info sender yang benar
  let senderName = m.name || 'Admin'
  
  // Cek apakah anonymous admin
  if (m.sender?.id === 1087968824 || m.from?.id === 1087968824) {
    senderName = 'Admin (Anonymous)'
  }
  
  console.log('✅ Sender name:', senderName)
  
  let bu = `Group telah di buka oleh ${senderName} dan sekarang semua member dapat mengirim pesan
ketik *${usedPrefix}group buka*
Untuk membuka grup!`.trim()
  
  let isClose = {
    'open': 'not_announcement',
    'buka': 'not_announcement',
    'on': 'not_announcement',
    '1': 'not_announcement',
    'close': 'announcement',
    'tutup': 'announcement',
    'off': 'announcement',
    '0': 'announcement',
  }[(args[0] || '')]
  
  if (isClose === undefined) {
    var text5 = `contoh:
${usedPrefix + command} tutup
${usedPrefix + command} buka`
    console.log('⚠️ Command tidak valid, mengirim contoh penggunaan')
    m.reply(text5)
    throw false
  } else if (isClose === 'announcement') {
    console.log('🔒 Menutup grup...')
    // Tutup grup - hanya admin yang bisa kirim pesan
    await conn.telegram.setChatPermissions(chatId, {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false
    })
    console.log('✅ Grup berhasil ditutup')
    
    let teks = `Group telah di tutup oleh ${senderName} dan sekarang hanya admin yang dapat mengirim pesan
ketik *${usedPrefix}group buka*
Untuk membuka grup!`.trim()
    await m.reply(teks)
  } else if (isClose === 'not_announcement') {
    console.log('🔓 Membuka grup...')
    // Buka grup - semua member bisa kirim pesan
    await conn.telegram.setChatPermissions(chatId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true
    })
    console.log('✅ Grup berhasil dibuka')
    
    await m.reply(bu)
  } else if (isClose === undefined) {
    var te = `
contoh:
${usedPrefix + command} tutup
${usedPrefix + command} buka`
    m.reply(te)
  }
}

handler.help = ['grup <open/close>']
handler.tags = ['group']
handler.command = /^(g(ro?up|c?)?)$/i
handler.group = true
handler.botAdmin = false

module.exports = handler