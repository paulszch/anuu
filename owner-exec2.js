let cp = require('child_process')
let { promisify } = require('util')
let exec = promisify(cp.exec).bind(cp)
let handler = async (m, { conn, isOwner, command, text }) => {
  // Skip pengecekan connection jika tidak diperlukan untuk Telegram
  // atau ganti dengan pengecekan lain seperti isOwner
  if (!isOwner) return
  
  m.reply('Executing...')
  let o
  try {
    o = await exec(command.trimStart() + ' ' + text.trimEnd())
  } catch (e) {
    o = e
  } finally {
    let { stdout, stderr } = o
    if (stdout?.trim()) m.reply(stdout)
    if (stderr?.trim()) m.reply(stderr)
  }
}
handler.help = ['$']
handler.tags = ['advanced']
handler.customPrefix = /^[$] /
handler.command = new RegExp
handler.rowner = true
module.exports = handler