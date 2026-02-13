const fs = require('fs');
const sharp = require('sharp');

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';
    
    if (/image/.test(mime)) {
        let media = await q.download();

        let processedMedia = await sharp(media)
            .resize(512, 512, { 
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 } 
            })
            .webp({ quality: 80 })
            .toBuffer();
        if (processedMedia.length > 500000) {
            processedMedia = await sharp(media)
                .resize(512, 512, { 
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .webp({ quality: 60 })
                .toBuffer();
        }
        await conn.sendMessage(m.chat, { 
            sticker: processedMedia 
        }, { 
            quoted: m,
            packname: global.packname, 
            author: global.author 
        });

    } else if (/video/.test(mime)) {
        if ((q.msg || q).seconds > 7) return m.reply('Maksimal 6 detik!');
        let media = await q.download();
        await conn.sendMessage(m.chat, { 
            sticker: media 
        }, { 
            quoted: m,
            packname: global.packname, 
            author: global.author 
        });

    } else {
        throw `Kirim gambar/video dengan caption ${usedPrefix + command}\nDurasi video 1-6 detik.`;
    }
};

handler.help = ['sticker'];
handler.tags = ['sticker'];
handler.command = /^(stiker|s|sticker)$/i;
handler.limit = true;

module.exports = handler;