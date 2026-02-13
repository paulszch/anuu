let handler = async (m, { conn }) => {
  // Inisialisasi data pengguna
  if (!global.db.data.users[m.sender]) {
    global.db.data.users[m.sender] = {
      lastngewe: 0,
      koin: 0,
      exp: 0,
      limit: 0,
      stamina: 100
    };
  }

  let user = global.db.data.users[m.sender];
  const currentTime = Date.now();
  const COOLDOWN = 500_000; // 8m 20s
  const wm = global.wm

  // --- VALIDASI & KOERSI DULU ---
  let last = Number(user.lastngewe);
  if (!isFinite(last) || last < 0 || last > currentTime) {
    last = 0; // reset kalau korup/masa depan
  }
  user.lastngewe = last; // simpan balik yang sudah bersih

  // --- BARU HITUNG TIMERS ---
  let elapsed = currentTime - user.lastngewe;
  let remaining = Math.max(0, COOLDOWN - elapsed);
  let timers = clockString(remaining);

  if (remaining === 0 && user.stamina >= 20) {
    // Variasi lokasi
    const locations = [
      { name: 'Hotel Bintang 5', vibe: '✨ Mewah bro, pelanggan kelas atas!' },
      { name: 'Motel Murah', vibe: '🏚️ Agak kumuh, tapi seru!' },
      { name: 'Apartemen VIP', vibe: '🏙️ Elite abis, penuh gaya!' }
    ];
    const location = locations[Math.floor(Math.random() * locations.length)];

    // Peluang insiden
    const successChance = Math.random() < 0.85; // 85% sukses
    const difficultCustomer = Math.random() < 0.2; // 20% rewel
    const fatigueChance = Math.random() < 0.15; // 15% capek

    let koin = successChance ? 3000 : 1500;
    let exp = successChance ? 1000 : 500;
    let limit = successChance ? 10 : 5;
    let staminaCost = fatigueChance ? 30 : 20;

    let incidentMessage = '';
    if (difficultCustomer) {
      incidentMessage += `😣 Pelanggan di ${location.name} rewel abis, bayaran dikurangi!\n`;
    }
    if (fatigueChance) {
      incidentMessage += `😴 Skidipapap di ${location.name} bikin capek banget, stamina drop!\n`;
    }

    const messages = [
      `🔍 Lagi cari pelanggan untuk ${location.name}...`,
      `🏃 Nyampe di ${location.name}! ${location.vibe}`,
      `💦 Mulai Skidipapap di ${location.name}, gas pol!`,
      `🥵 Skidipapap 24 jam di ${location.name}${difficultCustomer ? ', tapi pelanggan nyebelin!' : '!'}`,
      `Kamu Terbaring Lemas Karna Melakukan Skidipapap 24 Jam di ${location.name} Tetapi Kamu Mendapatkan:
${koin} Koin
${exp} Exp
${limit} Limit
${successChance ? 'Dan Gratis Boba + Nasi Padang' : 'Tapi Tanpa Boba dan Nasi Padang Karna Pelanggan Rewel'}
${incidentMessage}${wm}`
    ];

    // Kirim pesan berurutan
    for (let i = 0; i < messages.length; i++) {
      if (i) await new Promise(r => setTimeout(r, 4000)); // 4 detik antar pesan
      await conn.reply(m.chat, messages[i], m);
    }

    // Update user
    user.koin = (user.koin || 0) + koin;
    user.exp = (user.exp || 0) + exp;
    user.limit = (user.limit || 0) + limit;
    user.stamina = Math.max(0, (user.stamina || 0) - staminaCost);
    user.lastngewe = currentTime; // mulai cooldown sekarang
  } else {
    // Cabang cooldown / stamina habis
    const msg = (user.stamina || 0) < 20
      ? '😴 Stamina kamu habis! Chug boba dulu lah!'
      : `*Kamu Sudah Kecapekan*\n*Silahkan Istirahat Dulu Selama* ${timers}`;
    await conn.reply(m.chat, msg, m);
  }
};

handler.help = ['openbo'];
handler.tags = ['rpg'];
handler.command = /^(openbo)$/i;
handler.group = true;
handler.rpg = true;
module.exports = handler;

function clockString(ms) {
  if (!ms || ms <= 0 || isNaN(ms)) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}