let fs = require('fs')
let moment = require('moment-timezone')
let path = require('path')

let handler = async (m, { args }) => {
    const pluginDir = './plugins'
    const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'))
    if (files.length === 0) return m.reply('❌ Tidak ada file .js di folder ./plugins')

    // Cek apakah ada query pencarian
    const query = args.find(arg => !['↑', '↓', '×', 'a-z', 'z-a'].includes(arg))
    let filteredFiles = files

    // Filter berdasarkan query jika ada
    if (query) {
        filteredFiles = files.filter(file => 
            file.toLowerCase().includes(query.toLowerCase())
        )
        
        if (filteredFiles.length === 0) {
            return m.reply(`❌ Tidak ditemukan plugin dengan kata kunci "${query}"`)
        }
    }

    // Mapping file info
    let fileInfo = filteredFiles.map(file => {
        const filePath = path.join(pluginDir, file)
        const stats = fs.statSync(filePath)
        return {
            name: file,
            size: (stats.size / 1024).toFixed(2),
            mtime: stats.mtime
        }
    })

    // Default sort ↑ (terbaru)
    const sortArg = args.find(arg => ['↑', '↓', '×', 'a-z', 'z-a'].includes(arg)) || '↑'
    
    // Sorting berdasarkan argumen
    if (sortArg === '↑') {
        fileInfo.sort((a, b) => b.mtime - a.mtime)
    } else if (sortArg === '↓') {
        fileInfo.sort((a, b) => a.mtime - b.mtime)
    } else if (sortArg === '×') {
        fileInfo.sort(() => Math.random() - 0.5)
    } else if (sortArg === 'a-z') {
        fileInfo.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    } else if (sortArg === 'z-a') {
        fileInfo.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()))
    }

    // Mendapatkan deskripsi urutan
    const getSortDescription = (sort) => {
        switch (sort) {
            case '↑': return 'Terbaru'
            case '↓': return 'Terlama'
            case '×': return 'Acak'
            case 'a-z': return 'Abjad A-Z'
            case 'z-a': return 'Abjad Z-A'
            default: return 'Terbaru'
        }
    }

    let text = `📂 *Daftar File Plugin (.js)*\n`
    text += `*Total:* ${fileInfo.length} file${query ? ` (hasil pencarian: "${query}")` : ''}\n`
    text += `*Urutan:* ${getSortDescription(sortArg)}\n`

    for (let { name, size, mtime } of fileInfo) {
        const modified = moment(mtime).tz('Asia/Jakarta').format('DD/MM/YY HH:mm')
        text += `\n• *${name}*\n  ├ Size: ${size} KB\n  └ Update: ${modified}`
    }

    m.reply(text)
}

handler.help = ['listplug [query] [↑|↓|×|a-z|z-a]']
handler.tags = ['owner']
handler.command = /^(listplug)$/i
handler.owner = false

module.exports = handler