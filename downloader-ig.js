let axios = require('axios')

let handler = async (m, { conn, args, usedPrefix, command }) => {
   const eror = '❌ Terjadi kesalahan saat memproses permintaan'
   
   if (!args[0]) {
       throw `*Contoh:* ${usedPrefix}${command} username_instagram`
   }
   
   let result = await igdl(args[0])

   // Kirim info user
   if (result.user) {
       await m.reply(`*Username:* ${result.user.username}\n*Followers:* ${result.user.followers}\n*Following:* ${result.user.following}\n*Posts:* ${result.user.posts_count}`)
   }

   // Kirim stories jika ada
   if (result.stories && result.stories.length > 0) {
       await m.reply(`Terdeteksi ${result.stories.length} stories, akan ku kirim`)
       for (const story of result.stories) {
           if (story.type === 'image') {
               await conn.sendMessage(m.chat, { image: { url: story.url } }, { quoted: m })
           } else if (story.type === 'video') {
               await conn.sendMessage(m.chat, { video: { url: story.url } }, { quoted: m })
           }
       }
   }

   // Kirim highlights jika ada
   if (result.highlights && result.highlights.length > 0) {
       await m.reply(`Terdeteksi ${result.highlights.length} highlights`)
       for (const highlight of result.highlights) {
           if (highlight.type === 'image') {
               await conn.sendMessage(m.chat, { image: { url: highlight.url } }, { quoted: m })
           } else if (highlight.type === 'video') {
               await conn.sendMessage(m.chat, { video: { url: highlight.url } }, { quoted: m })
           }
       }
   }

   // Kirim posts jika ada
   if (result.posts && result.posts.length > 0) {
       await m.reply(`Terdeteksi ${result.posts.length} posts`)
       for (const post of result.posts) {
           if (post.type === 'image') {
               await conn.sendMessage(m.chat, { image: { url: post.url } }, { quoted: m })
           } else if (post.type === 'video') {
               await conn.sendMessage(m.chat, { video: { url: post.url } }, { quoted: m })
           }
       }
   }
}

handler.help = ['instagram'].map(v => v + ' <username>')
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstory)$/i
handler.limit = true

module.exports = handler

function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms))
}

async function igdl(usrname) {
  try {
    const h = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://story-viewer.co/'
    };
    
    const urlb = 'https://api.story-viewer.co';
    
    const ures = await axios.get(`${urlb}/user/${usrname}?sig=4=eX9raGd4Jm94eWZ/Oi4zPz44OzI8Mj0/OzAtMT`, {
      headers: h
    });
    const udata = ures.data;
    
    const hrest = await axios.get(`${urlb}/highlights/${udata.id}?sig=pOT01CSkxDSUdJCFMPHBcSExIcEx1XS0hCT0pPTUNDTkpMLUIzMT`, {
      headers: h
    });
    const hdata = hrest.data;
    
    const sres = await axios.get(`${urlb}/stories/${usrname}?sig=egtaaxpri5p/2xprC7p6D45+Lg5uXg4uzs4eXjLeEyMj`, {
      headers: h
    });
    const sdata = sres.data;
    
    const prest = await axios.get(`${urlb}/posts/${usrname}?sig=pAGjtbKyvaP8pK+joLT86ODo4+Hk5ujo5eHnLeA4Mj`, {
      headers: h
    });
    const pdata = prest.data;
    
    const hasil = {
      user: udata,
      highlights: hdata,
      stories: sdata,
      posts: pdata
    };
    
    return hasil;
  } catch (e) {
    throw new Error(`${e.message}`);
  }
}