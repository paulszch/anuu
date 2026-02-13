let handler = async (m, { args, isAdmin, isBotAdmin }) => {
  console.log('ANTIPROMOSI', m.chat, 'by', m.sender);

  if (!m.isGroup) return m.reply("❌ Fitur ini hanya bisa digunakan di grup!");
  if (!isBotAdmin) return m.reply("🤖 Bot harus jadi admin untuk menjalankan fitur ini!");
  if (!isAdmin) return m.reply("⚠️ Kamu harus jadi admin untuk pakai fitur ini!");

  // Pastikan struktur DB aman
  global.db = global.db || {};
  global.db.data = global.db.data || {};
  global.db.data.chats = global.db.data.chats || {};
  let chat = global.db.data.chats[m.chat];
  if (!chat) chat = global.db.data.chats[m.chat] = { antipromosi: false };

  const isAntiPromosi = !!chat.antipromosi;
  const command = (args[0] || "").toLowerCase();

  switch (command) {
    case "on":
    case "enable":
    case "1":
      if (isAntiPromosi) return m.reply("✅ Fitur anti-promosi sudah aktif sebelumnya!");
      chat.antipromosi = true;
      if (global.db && typeof global.db.write === "function") {
        try { await global.db.write(); } catch (e) { console.error('DB write error:', e); }
      }
      return m.reply(
        "✅ *Fitur anti-promosi berhasil diaktifkan!*\n\n" +
        "Pesan yang mengandung kata kunci promosi akan otomatis dihapus. Admin tetap bisa mengirim promosi.\n\n" +
        "Kata kunci contoh: jual, promo, diskon, harga, order, ready, jasa, sewa, dana, gopay, ovo, wa.me, http"
      );

    case "off":
    case "disable":
    case "0":
      if (!isAntiPromosi) return m.reply("❌ Fitur anti-promosi sudah nonaktif sebelumnya!");
      chat.antipromosi = false;
      if (global.db && typeof global.db.write === "function") {
        try { await global.db.write(); } catch (e) { console.error('DB write error:', e); }
      }
      return m.reply("❌ *Fitur anti-promosi berhasil dimatikan!*\n\nPesan promosi tidak akan dihapus otomatis.");

    case "status":
    case "cek":
    case "check":
      return m.reply(
        `📊 *Status Anti-Promosi*\n\n` +
        `Status: ${isAntiPromosi ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `Chat ID: ${m.chat}\n` +
        `Bot Admin: ${isBotAdmin ? '✅ Ya' : '❌ Tidak'}\n\n` +
        `Gunakan /antipromosi on/off untuk mengatur.`
      );

    default:
      return m.reply(
        "⚙️ *Penggunaan Anti-Promosi*\n\n" +
        "• /antipromosi on - Aktifkan\n" +
        "• /antipromosi off - Matikan\n" +
        "• /antipromosi status - Cek status\n\n" +
        `Status saat ini: ${isAntiPromosi ? '✅ Aktif' : '❌ Nonaktif'}`
      );
  }
};

handler.help = ["antipromosi"];
handler.tags = ["group"];
handler.command = ["antipromosi"];
handler.group = true;
handler.admin = true;

module.exports = handler;