let fs = require('fs');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return conn.reply(m.chat, `• *Example :* ${usedPrefix + command} menu`, m);

    try {
        if (!m.quoted) return conn.reply(m.chat, `🚩 Reply to a message or file!`, m);

        // Set nama file dengan ekstensi .js
        let filePath = `plugins/${text}.js`;

        // Jika pesan yang di-reply adalah teks
        if (m.quoted.text) {
            await fs.writeFileSync(filePath, m.quoted.text);
            conn.reply(m.chat, `🚩 Text saved as ${filePath}`, m);
        }

        // Jika pesan yang di-reply adalah file
        else if (m.quoted.mimetype) {
            let buffer = await m.quoted.download();
            fs.writeFileSync(filePath, buffer);
            conn.reply(m.chat, `🚩 File saved as ${filePath}`, m);
        } else {
            conn.reply(m.chat, "🚩 Reply to a text or file!", m);
        }
    } catch (error) {
        console.error(error);
        conn.reply(m.chat, "🚩 An error occurred!", m);
    }
};

handler.help = ['sp'].map(v => v + ' *<text>*');
handler.tags = ['owner'];
handler.command = /^sp$/i;

handler.rowner = true;
module.exports = handler;