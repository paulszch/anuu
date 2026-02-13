let handler = async (m, { conn, usedPrefix, command }) => {
  conn.sendMessage(m.chat, { text: '🕒' }, { quoted: m })
  
  // Ambil 3-5 video random untuk album
  const albumSize = Math.floor(Math.random() * 3) + 3 // 3-5 video
  const selectedVideos = []
  
  // Pilih video secara random tanpa duplikasi
  const viralCopy = [...viral]
  for (let i = 0; i < albumSize && viralCopy.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * viralCopy.length)
    selectedVideos.push(viralCopy.splice(randomIndex, 1)[0])
  }
  
  // Buat album dari video yang dipilih
  const albumMedia = selectedVideos.map((url, index) => 
    conn.createVideo(url, index === 0 ? done : undefined) // Caption hanya di video pertama
  )
  
  await conn.sendAlbum(m.chat, albumMedia, done, m)
}

handler.help = ['viral']
handler.tags = ['info']
handler.command = /^(viral)$/i

handler.premium = true
handler.limit = true

handler.fail = null
handler.register = true

module.exports = handler

const done = `*Viral Video Collection* 🔥

_Kumpulan video viral pilihan untuk hiburan_`

const viral = [
  "https://telegra.ph/file/f9f3d01fead02386e5331.mp4",
  "https://telegra.ph/file/d1d7b11f5ab57b3e57d01.mp4",
  "https://telegra.ph/file/11e0d15aac245accb6217.mp4",
  "https://telegra.ph/file/dadd5f030d75ff9e787c8.mp4",
  "https://telegra.ph/file/d18b06f324412d2cdb270.mp4",
  "https://telegra.ph/file/7d3a354b69fe2e1c60d34.mp4",
  "https://telegra.ph/file/1ae88269d50a627761072.mp4",
  "https://d.top4top.io/m_35325kb1z1.mp4",
  "https://e.top4top.io/m_3532komdf1.mp4",
  "https://f.top4top.io/m_35329l9va1.mp4",
  "https://g.top4top.io/m_3532zdqvr1.mp4",
  "https://i.top4top.io/m_3532sci8l1.mp4",
  "https://h.top4top.io/m_35326wsi21.mp4",
  "https://j.top4top.io/m_3532oq7pf1.mp4",
  "https://j.top4top.io/m_3532c22mk1.mp4"
]
/*
  "https://e.top4top.io/m_2344gqc9p1.mp4",
  "https://f.top4top.io/m_2344zxnbv0.mp4",
  "https://e.top4top.io/m_234403ua01.mp4",
  "https://g.top4top.io/m_23444af6m0.mp4",
  "https://e.top4top.io/m_23444qdm11.mp4",
  "https://d.top4top.io/m_2344zr3je1.mp4",
  "https://b.top4top.io/m_2344w2x0n1.mp4",
  "https://f.top4top.io/m_23441a9rx1.mp4",
  "https://d.top4top.io/m_234461kmn0.mp4"
*/