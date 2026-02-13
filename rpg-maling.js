const timeout = 300000; // 5 menit

let handler = async (m, { conn }) => {
  // Inisialisasi data pengguna
  if (!global.db.data.users[m.sender]) {
    global.db.data.users[m.sender] = {
      lastmaling: 0,
      kardus: 0
    };
  }

  let user = global.db.data.users[m.sender];
  let time = user.lastmaling + timeout;
  if (new Date - user.lastmaling < timeout) {
    return conn.reply(m.chat, `Anda sudah merampok sebelumnya\nTunggu selama ${msToTime(time - new Date())} lagi`, m);
  }

  // Variasi lokasi
  const locations = [
    { name: 'Bank', bonus: 1.5, risk: 0.25 }, // Bonus besar, risiko tinggi
    { name: 'Toko', bonus: 1.2, risk: 0.15 },
    { name: 'Rumah', bonus: 1.0, risk: 0.1 } // Bonus standar, risiko rendah
  ];
  const location = locations[Math.floor(Math.random() * locations.length)];

  // Peluang insiden
  let successChance = Math.random() < (0.85 - location.risk);
  let caughtByCitizens = Math.random() < 0.15; // 15% ditangkap warga
  let caughtByPolice = Math.random() < 0.10; // 10% ditangkap polisi
  let alarmChance = Math.random() < 0.2; // 20% alarm berbunyi

  // Hadiah
  let money = Math.floor(Math.random() * 30000) * location.bonus;
  let exp = Math.floor(Math.random() * 999) * location.bonus;
  let kardus = Math.floor(Math.random() * 1000);
  let incidentMessage = '';

  if (caughtByPolice) {
    money = 0;
    exp = 0;
    kardus = 0;
    user.lastmaling = new Date * 1 + 86400000; // Tambah 1 hari cooldown
    incidentMessage = `🚨 Ditangkap polisi di ${location.name}! Kamu masuk penjara dan kehilangan semua hasil!\n`;
  } else if (caughtByCitizens) {
    money = Math.floor(money * 0.5); // Kehilangan 50% hadiah
    exp = Math.floor(exp * 0.5);
    kardus = Math.floor(kardus * 0.5);
    incidentMessage = `👥 Ditangkap warga di ${location.name}! Kamu dihajar dan kehilangan sebagian hasil!\n`;
  } else if (alarmChance) {
    money = Math.floor(money * 0.7); // Kehilangan 30% hadiah
    exp = Math.floor(exp * 0.7);
    incidentMessage = `🔔 Alarm berbunyi di ${location.name}, hasil berkurang!\n`;
  }

  // Narasi dinamis
  const messages = [
    `🔍 Merencanakan perampokan di ${location.name}...`,
    `🚪 Menyusup ke ${location.name}!`,
    `💰 Mengambil barang di ${location.name}!`,
    `🏃 Kabur dari ${location.name}${caughtByCitizens ? ', tapi warga mengejar!' : caughtByPolice ? ', tapi polisi mengejar!' : '!'}`,
    `Selamat kamu mendapatkan dari ${location.name}:\n+${money} Money\n+${kardus} Kardus\n+${exp} Exp\n${incidentMessage}© maling-sim`
  ];

  // Kirim pesan dengan animasi
  for (let i = 0; i < messages.length; i++) {
    await new Promise(resolve => setTimeout(resolve, i * 2000)); // Delay 2 detik per pesan
    conn.reply(m.chat, messages[i], m);
  }

  // Update data pengguna
  user.money += money;
  user.exp += exp;
  user.kardus += kardus;
  user.lastmaling = caughtByPolice ? new Date * 1 + 86400000 : new Date * 1;
};

handler.help = ['maling'];
handler.tags = ['rpg'];
handler.command = /^(maling)$/i;
handler.group = false;
handler.rpg = true;
handler.limit = false;

module.exports = handler;

function msToTime(duration) {
  if (!duration || duration <= 0 || isNaN(duration)) return '00:00:00';
  let hours = Math.floor(duration / (1000 * 60 * 60)) % 24;
  let minutes = Math.floor(duration / (1000 * 60)) % 60;
  let seconds = Math.floor(duration / 1000) % 60;
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;
  return hours + ' jam ' + minutes + ' menit ' + seconds + ' detik';
}