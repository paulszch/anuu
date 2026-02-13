let fs = require('fs')

let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`Format salah!\n\nContoh: ${usedPrefix + command} menu | console.log("test")`)
    }

    let parts = text.split('|')
    if (parts.length < 2) {
        return m.reply(`Format salah! Harus: <nama_file> | <kode>\n\nContoh: ${usedPrefix + command} menu | console.log("test")`)
    }

    let fileName = parts[0].trim()
    let code = parts.slice(1).join('|').trim()

    if (!fileName) {
        return m.reply(`Nama file tidak boleh kosong!`)
    }

    if (!code) {
        return m.reply(`Kode tidak boleh kosong!`)
    }

    try {
        let filePath = `plugins/${fileName}.js`
        
        if (!fs.existsSync('plugins')) {
            fs.mkdirSync('plugins')
        }
        
        fs.writeFileSync(filePath, code)
        
        return m.reply(`Plugin ${fileName}.js berhasil diedit!`)
        
    } catch (error) {
        return m.reply(`Gagal edit plugin!\n\n${error.message}`)
    }
}

handler.help = ['editfitur <nama_file> | <kode>']
handler.tags = ['owner']
handler.command = /^editfitur$/i
handler.rowner = true

module.exports = handler