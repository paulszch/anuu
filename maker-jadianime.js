/*
const uploadImage = require('../lib/uploadImage');
const fetch = require('node-fetch');

let handler = async (m, { conn, usedPrefix, command }) => {
    var q = m.quoted ? m.quoted : m;
    var mime = (q.msg || q).mimetype || q.mediaType || '';
    
    if (/image/g.test(mime) && !/webp/g.test(mime)) {
        await conn.reply(m.chat, wait, m);
        try {
            const img = await q.download?.();
            let out = await uploadImage(img);
            let old = new Date();
            
            let res = await fetch(`https://api.betabotz.eu.org/api/maker/jadianime?url=${out}&apikey=${lann}`);
            let convert = await res.json();

            if (!convert.result || !convert.result.img_1 || !convert.result.img_2) {
                return m.reply("[ ! ] Gagal mendapatkan hasil.");
            }

            let img1 = await fetch(convert.result.img_1).then(res => res.buffer());
            let img2 = await fetch(convert.result.img_2).then(res => res.buffer());

            await conn.sendMessage(m.chat, { 
                image: img1, 
                caption: `🍟 *Fetching:* ${((new Date() - old) * 1)} ms\n*Style:* Anime 2D` 
            }, { quoted: m });

            await conn.sendMessage(m.chat, { 
                image: img2, 
                caption: `🍟 *Fetching:* ${((new Date() - old) * 1)} ms\n*Style:* Anime 3D` 
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply("[ ! ] Terjadi kesalahan saat memproses gambar.");
        }
    } else {
        m.reply(`Kirim gambar dengan caption *${usedPrefix + command}* atau tag gambar yang sudah dikirim.`);
    }
};

handler.help = ['jadianime'];
handler.command = ['toanime', 'jadianime'];
handler.tags = ['maker'];
handler.premium = false;
handler.limit = true;

module.exports = handler;
*/

const uploadImage = require('../lib/uploadImage');
const axios = require('axios');
const fetch = require('node-fetch');

let handler = async (m, { conn, usedPrefix, command }) => {
    var q = m.quoted ? m.quoted : m;
    var mime = (q.msg || q).mimetype || q.mediaType || '';
    
    if (/image/g.test(mime) && !/webp/g.test(mime)) {
        await conn.reply(m.chat, wait, m);
        try {
            const img = await q.download?.();
            let out = await uploadImage(img);
            let old = new Date();
            
            let res = await fetch(`https://api.betabotz.eu.org/api/maker/jadianime?url=${out}&apikey=${lann}`);
            let convert = await res.json();

            if (!convert.result || !convert.result.img_1 || !convert.result.img_2) {
                return m.reply("[ ! ] Gagal mendapatkan hasil.");
            }
            
            let image1 = await fetch(convert.result.img_1).then(res => res.buffer());
            let image2 = await fetch(convert.result.img_2).then(res => res.buffer());
            
            let rem1 = await uploadImage(image1);
            let rem2 = await uploadImage(image2);
            
            
            let enhanceImg1 = await reminiEnhance(convert.result.img_1)
            let enhanceImg2 =  await reminiEnhance(convert.result.img_2)
            
            let img1 = await fetch(enhanceImg1).then(res => res.buffer());
            let img2 = await fetch(enhanceImg2).then(res => res.buffer());

            await conn.sendMessage(m.chat, { 
                image: img1, 
                caption: `🍟 *Fetching:* ${((new Date() - old) * 1)} ms\n*Style:* Anime 2D\nUrl Asli: ${rem1}\nUrl Enhance: ${enhanceImg1}` 
            }, { quoted: m });

            await conn.sendMessage(m.chat, { 
                image: img2, 
                caption: `🍟 *Fetching:* ${((new Date() - old) * 1)} ms\n*Style:* Anime 3D\nUrl Asli: ${rem2}\nUrl Enhance: ${enhanceImg2}` 
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply("[ ! ] Terjadi kesalahan saat memproses gambar.");
        }
    } else {
        m.reply(`Kirim gambar dengan caption *${usedPrefix + command}* atau tag gambar yang sudah dikirim.`);
    }
};

handler.help = ['jadianime'];
handler.command = ['toanime', 'jadianime'];
handler.tags = ['maker'];
handler.premium = false;
handler.limit = true;

module.exports = handler;

async function reminiEnhance(url) {
  try {
    const { data } = await axios.get(
      `https://api.betabotz.eu.org/api/tools/remini?url=${encodeURIComponent(url)}&apikey=${lann}`
    );

    if (data.status && data.url) {
      return data.url;
    } else {
      console.log("Remini enhancement failed - API returned unsuccessful status:", data);
      return url;
    }
  } catch (error) {
    console.log("Remini enhancement failed, returning original URL:", error.message);
    return url;
  }
}