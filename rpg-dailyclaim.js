const prem = 1000;
const free = 100;

let handler = async (ctx, { conn, text, isPrems }) => {
    console.log('ctx:', ctx); // Log seluruh ctx
    console.log('ctx.msgs:', ctx.msgs); // Log ctx.msgs
    console.log('ctx.msgs.from:', ctx.msgs?.from); // Log ctx.msgs.from

    if (!ctx.msgs || !ctx.msgs.from) {
        ctx.reply('Error: Tidak dapat mengidentifikasi pengguna. Coba lagi di chat pribadi atau grup.');
        return;
    }

    let userId = ctx.msgs.from.id;
    console.log('userId:', userId); // Log ID pengguna

    let lastClaimTime = global.db.data.users[userId].lastclaim || 0;
    let currentTime = new Date().getTime();
    console.log('lastClaimTime:', lastClaimTime, 'currentTime:', currentTime); // Log waktu klaim

    if (currentTime - lastClaimTime < 86400000) {
        ctx.reply(`🎁 *Anda telah mengumpulkan hadiah harian Anda*\n\n🕚 Masuk kembali *${msToTime(86400000 - (currentTime - lastClaimTime))}*`);
        return;
    }

    global.db.data.users[userId].exp += isPrems ? prem : free;
    ctx.reply(`
🎁 *HADIAH XP*
*Spam terus untuk mendapatkan xp*
cek /balance jumlah xp mu!
🆙 *XP* : +${isPrems ? prem : free}`);

    global.db.data.users[userId].lastclaim = currentTime;
}

handler.help = ['daily'];
handler.command = /^daily$/i;
handler.tags = ['rpg'];
handler.rpg = true;

module.exports = handler;

function msToTime(duration) {
    var milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + " Jam " + minutes + " Menit";
}