let fetch = require('node-fetch');
let moment = require('moment-timezone');

let warTakjil = null;
let warMessageKey = null;

// **Mengambil daftar item War Takjil dari GitHub**
async function fetchWarTakjil() {
    try {
        let res = await fetch('https://raw.githubusercontent.com/dreamliner21/db-rpg/main/warTakjil.json');
        let json = await res.json();
        return json;
    } catch (err) {
        console.error("❌ Gagal mengambil War Takjil:", err);
        return { warTakjil: [], rareTakjil: [] };
    }
}

// **Membuat War Takjil dengan item acak**
async function generateWarTakjil() {
    let { warTakjil, rareTakjil } = await fetchWarTakjil();

    // Pilih 3 item dari daftar War Takjil
    let items = [];
    while (items.length < 3) {
        let item = warTakjil[Math.floor(Math.random() * warTakjil.length)];
        if (!items.find(i => i.item.name === item.name)) {
            items.push({
                item,
                amount: Math.floor(Math.random() * 5) + 1,
                price: Math.random() < 0.3 ? 0 : Math.floor(Math.random() * (900 - 100 + 1)) + 100, // Harga antara 100-900
                bought: false
            });
        }
    }

    // 10% kemungkinan muncul Rare Takjil
    if (Math.random() < 0.1) {
        let rare = rareTakjil[Math.floor(Math.random() * rareTakjil.length)];
        items.push({
            item: rare,
            amount: Math.floor(Math.random() * 5) + 1,
            price: Math.floor(Math.random() * (500 - 200 + 1)) + 200, // Harga lebih kecil dari War Takjil
            bought: false
        });
    }

    return items;
}

// **Memulai War Takjil dengan Hidetag**
async function startWarTakjil(conn, chatId, participants) {
    if (warTakjil) return;
    warTakjil = await generateWarTakjil();

    let wib = moment.tz('Asia/Jakarta').format('HH:mm:ss');
    let message = `🔥 *WAR TAKJIL DIMULAI!* 🔥\n🕰️ ${wib} WIB\n\nSiapa cepat dia dapat! 3 item tersedia:\n`;

    warTakjil.forEach((w, i) => {
        message += `🎁 *${w.amount} ${w.item.name}*\n💰 Harga: *${w.price > 0 ? w.price + " money" : "GRATIS!"}*\n🛒 Ketik: *.beliwartakjil ${i + 1}*\n\n`;
    });

    let mentionedJid = participants.map(p => p.id);
    let msg = await conn.sendMessage(chatId, { text: message, mentions: mentionedJid }, { quoted: null });

    warMessageKey = msg.key;
}

// **Membeli War Takjil**
let handler = async (m, { conn, args }) => {
    if (!warTakjil) return conn.reply(m.chat, "❌ Tidak ada War Takjil saat ini!", m);
    let index = parseInt(args[0]) - 1;
    if (isNaN(index) || index < 0 || index >= warTakjil.length) return conn.reply(m.chat, "❌ Pilih item yang benar! Gunakan `.beliwartakjil 1/2/3`.", m);
    if (warTakjil[index].bought) return conn.reply(m.chat, `❌ *${warTakjil[index].item.name}* sudah dibeli orang lain!`, m);

    let db = global.db.data;
    let user = db.users[m.sender];
    if (!user) return conn.reply(m.chat, "❌ Kamu belum terdaftar!", m);
    if (user.money < warTakjil[index].price) return conn.reply(m.chat, `❌ Uangmu tidak cukup! Butuh 💰${warTakjil[index].price} money.`, m);

    if (warTakjil[index].price > 0) user.money -= warTakjil[index].price;

    // Pastikan user.takjil ada di database
    if (!user.takjil) user.takjil = {};

    let rewardName = warTakjil[index].item.reward;
    user.takjil[rewardName] = (user.takjil[rewardName] || 0) + warTakjil[index].amount;
    warTakjil[index].bought = true;

    let boughtMessage = await conn.reply(m.chat, `🎉 *KAMU BERHASIL!* 🎉\nKamu mendapatkan *${warTakjil[index].amount} ${warTakjil[index].item.name}* seharga 💰${warTakjil[index].price > 0 ? warTakjil[index].price + " money" : "GRATIS!"}!\nSekarang kamu memiliki ${user.takjil[rewardName]} ${warTakjil[index].item.name}.`, m);

    // Jika semua item sudah dibeli, hapus pesan setelah 10 detik
    if (warTakjil.every(item => item.bought)) {
        setTimeout(async () => {
            try {
    if (warMessageKey) {
        await conn.sendMessage(m.chat, { 
            delete: { remoteJid: m.chat, fromMe: true, id: warMessageKey.id } 
        });
    }
    if (boughtMessage?.key) { 
        await conn.sendMessage(m.chat, { 
            delete: { remoteJid: m.chat, fromMe: true, id: boughtMessage.key } 
        });
    }
} catch (err) {
    console.error("❌ Gagal menghapus pesan War Takjil:", err);
}
        }, 10000);
    }
};

handler.help = ['beliwartakjil <1/2/3>'];
handler.tags = ['rpg'];
handler.command = /^beliwartakjil$/i;
handler.rpg = true;
module.exports = handler;

// **Jadwal otomatis War Takjil dengan Hidetag**
setInterval(async () => {
    let conn = global.conn;
    if (!conn) return;

    let groupIds = ["120363386901747514@g.us"];

    for (let chatId of groupIds) {
        try {
            let groupMetadata = await conn.groupMetadata(chatId);
            let participants = groupMetadata.participants;
            await startWarTakjil(conn, chatId, participants);
        } catch (err) {
            console.error(`❌ Gagal mengirim War Takjil ke grup ${chatId}:`, err);
        }
    }
}, Math.floor(Math.random() * (120 - 30 + 1)) + 30 * 1000);  // 30 - 120 detik