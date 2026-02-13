const fetch = require('node-fetch');
const uploader = require('../lib/uploadFile')

let handler = async (m, { conn, args, usedPrefix, command }) => {   
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';

    if (/webp|webm/.test(mime)) {
        let buffer = await q.download();
        await m.reply(wait);

        try {
            let out = await uploader(buffer);
            let json 

            if (command === 'togif') {
                json = await (await fetch(`https://api.betabotz.eu.org/api/tools/webp2mp4?url=${out}&apikey=${lann}`)).json();
                await conn.sendMessage(m.chat, {
                    video: json.result,
                    caption: '*DONE*',
                    gifPlayback: true
                }, { quoted: m });
            } else if (command === 'toimg') {
                if (/webm/.test(mime)) {
                    return m.reply('❌ Animated sticker tidak bisa diconvert ke gambar!\nGunakan /togif untuk convert ke GIF.');
                }

                json = await (await fetch(`https://api.betabotz.eu.org/api/tools/webp2png?url=${out}&apikey=${lann}`)).json();

                await conn.sendMessage(m.chat, {
                    image: json.result,
                    caption: '*DONE*'
                }, { quoted: m });
            }
        } catch (e) {
            console.log(e);
            throw e;
        }
    } else {
        throw `Kirim stiker dengan caption ${usedPrefix + command}\nDurasi video maksimal 6 detik.`;
    }
};

handler.help = ['toimg', 'togif'];
handler.tags = ['sticker'];
handler.command = /^(toimg|togif)$/i;
handler.limit = true;
module.exports = handler;
