/*let handler = async (m, { conn }) => {
  let id = m.sender;
  let name = m.pushName || 'Unknown';
  let message = `Your ID: ${id}\nYour Name: ${name}`;
  m.reply(message);
}
handler.help = handler.command = ['getid', 'myid'];
handler.tags = ['info'];
module.exports = handler;
*/


let handler = async (m, { conn, command }) => {
  try {
    if (command === 'getid' || command === 'myid') {
      let userId = m.sender
      let name = m.pushName || 'Unknown'
      let message = `
╭─「 🏷️ USER INFO 」
│ 👥 User ID   : ${userId}
│ 📛 User Name : ${name}
╰───────
`;

      // Perbaikan: gunakan format yang sama dengan getidgc
      await conn.sendMessage(
        m.chat, // Kirim ke chat saat ini, bukan userId
        { text: message },
        { quoted: { message_id: m.id } } // Format sama dengan getidgc
      );

    } else if (command === 'getidgc' || command === 'idgc') {
      if (m.chat === m.sender) {
        return m.reply('❌ Command ini hanya bisa digunakan di grup!')
      }

      let chatId = m.chat
      let chatName = m.groupName || 'Unknown Group'

      let message = `
╭─「 🏷️ GROUP INFO 」
│ 👥 Group ID   : ${chatId}
│ 📛 Group Name : ${chatName}
╰───────
`;

      // Ini sudah benar, tidak perlu diubah
      await conn.sendMessage(
        chatId,
        { text: message },
        { quoted: { message_id: m.id } }
      );
    }
  } catch (e) {
    console.error('Error:', e)
    m.reply('❌ Terjadi error saat memproses command')
  }
}

handler.help = ['getid', 'myid', 'getidgc', 'idgc']
handler.command = ['getid', 'myid', 'getidgc', 'idgc']
handler.tags = ['info']

module.exports = handler


/*
let handler = async (m, { conn, command }) => {
  try {
    if (command === 'getid' || command === 'myid') {
      let userId = m.sender
      let name = m.pushName || 'Unknown'
      let message = 
`\`\`\`${name}
👤 Your User ID: ${userId}
📝 Your Name   : ${name}
\`\`\``
      await conn.telegram.sendMessage(m.chat, message, { parse_mode: "MarkdownV2" })

    } else if (command === 'getidgc' || command === 'idgc') {
      if (m.chat === m.sender) {
        return m.reply('❌ Command ini hanya bisa digunakan di grup!')
      }

      let chatId = m.chat
      let chatName = m.groupName || 'Unknown Group'

      //let message = `
👥 Group ID   : ${chatId}
📛 Group Name : ${chatName}

// Hindari template literal sama sekali
let message = `👥 Group ID   : ${chatId}\n📛 Group Name : ${chatName}`
await conn.sendMessage(
  m.chat,
  { 
    text: "```\n" + message + "\n```",
    encoding: 'utf-8'  // ✅ EXPLICIT ENCODING
  },
  { quoted: m }
)
      //await conn.telegram.sendMessage(m.chat, message, { parse_mode: "MarkdownV2" })
      
    }
  } catch (e) {
    console.error('Error:', e)
    m.reply('❌ Terjadi error saat memproses command')
  }
}

handler.help = ['getid', 'myid', 'getidgc', 'idgc']
handler.command = ['getid', 'myid', 'getidgc', 'idgc']
handler.tags = ['info']

module.exports = handler
*/