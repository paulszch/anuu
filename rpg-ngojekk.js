let handler = async (m, { conn }) => {
  if (!global.db.data.users[m.sender]) {
    global.db.data.users[m.sender] = {
      lastngojek: 0,
      ojek: 0
    };
  }

  let __timers = (new Date - (global.db.data.users[m.sender].lastngojek || 0));
  let _timers = (300000 - __timers);
  if (__timers < 0 || isNaN(__timers)) _timers = 0; 
  let order = global.db.data.users[m.sender].ojek;
  let timers = clockString(_timers);
  let name = m.name;
  let user = global.db.data.users[m.sender];
  let wm = (typeof global.wm === 'string') ? global.wm : '© ojek-sim';

  if (_timers <= 0) {
    let randomaku1 = `${Math.floor(Math.random() * 10)}`;
    let randomaku2 = `${Math.floor(Math.random() * 10)}`;
    let randomaku4 = `${Math.floor(Math.random() * 5)}`;
    let randomaku3 = `${Math.floor(Math.random() * 10)}`;
    let randomaku5 = `${Math.floor(Math.random() * 10)}`;

    let rbrb1 = (randomaku1 * 2);
    let rbrb2 = (randomaku2 * 10);
    let rbrb3 = (randomaku3 * 1);
    let rbrb4 = (randomaku4 * 15729);
    let rbrb5 = (randomaku5 * 200);

    // Peluang insiden
    let accidentChance = Math.random() < 0.2; // 20% kecelakaan
    let trafficChance = Math.random() < 0.25; // 25% macet
    let demoChance = Math.random() < 0.1; // 10% demo

    let incidentMessage = "";
    let arrivalMessage = "➕ Sampai di tujuan..."; // Default

    if (accidentChance) {
      rbrb4 = Math.floor(rbrb4 / 2); // Uang setengah
      rbrb5 = Math.floor(rbrb5 / 2); // Exp setengah
      incidentMessage = "❗ Anda mengalami kecelakaan, hasil dikurangi setengah.\n";
      arrivalMessage = "❗ Anda mengalami kecelakaan di jalan, tapi masih bisa menyelesaikan order!";
    }

    if (trafficChance) {
      incidentMessage += "🚦 Anda terjebak macet, perjalanan lebih lama!\n";
      arrivalMessage = "🚦 Anda terlambat sampai karena macet, pelanggan sedikit kesal!";
    }

    if (demoChance) {
      incidentMessage += "🚧 Ada demo di jalan, order dibatalkan!\n";
      arrivalMessage = "🚧 Anda tidak bisa melanjutkan perjalanan karena demo, order dibatalkan!";
      rbrb4 = 0; // Tidak mendapat uang
      rbrb5 = 0; // Tidak mendapat exp
    }

    // Tampilkan nilai akhir setelah insiden
    let zero4 = `${rbrb4}`;
    let zero5 = `${rbrb5}`;

    let arr = [
      `Mendapatkan Orderan...`,
      `🚶🛵⬛⬛⬛⬛⬛⬛⬛⬛
⬛⬜⬜⬜⬛⬜⬜⬜⬛⬛
⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛
🏘️🏘️🏘️🏘️🌳  🌳 🏘️       \n\n\n➕ Mengantar ke tujuan....`,
      `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛
⬛⬜⬜⬛⬛⬜⬜⬜⬛⬛
⬛⬛⬛⬛⬛⬛⬛🛵⬛⬛
🏘️🏘️🏘️🏘️🌳  🌳 🏘️       \n\n\n${arrivalMessage}`,
      `➕ 💹Menerima gaji....`,
      `*—[ Hasil Ngojek ${name} ]—*
 ➕ 💹 Uang = [ ${zero4} ]
 ➕ ✨ Exp = [ ${zero5} ] 		 
 ➕ 😍 Order Selesai = +${demoChance ? 0 : 1}
➕ 📥 Total Order Sebelumnya : ${order}
${incidentMessage}${wm}`
    ];

    let { key } = await conn.sendMessage(m.chat, { text: 'Mencari pelanggan.....' });

    for (let i = 0; i < arr.length; i++) {
      let delay = 10000; // Delay normal 10 detik
      if (trafficChance) delay += 15000; // Jika macet, tambah 15 detik
      await new Promise(resolve => setTimeout(resolve, delay));
      await conn.sendMessage(m.chat, { text: arr[i], edit: key });
    }

    if (!demoChance) { // Jika tidak ada demo, tambahkan hasil
      global.db.data.users[m.sender].money += rbrb4;
      global.db.data.users[m.sender].exp += rbrb5;
      global.db.data.users[m.sender].ojek += 1;
    }

    user.lastngojek = new Date * 1;
  } else {
    const msg = `Sepertinya anda sudah kecapekan, silahkan istirahat dulu sekitar *${timers}*`;
    if (typeof m.reply === 'function') m.reply(msg);
    else await conn.sendMessage(m.chat, { text: msg });
  }
};

handler.help = ['ojek'];
handler.tags = ['rpg'];
handler.command = /^(ojek|ngojek|gojek)$/i;
handler.register = true;
handler.rpg = true;
module.exports = handler;

function clockString(ms) {
  if (!ms || ms <= 0 || isNaN(ms)) return '00:00:00';
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}