const fetch = require('node-fetch');

let handler = async (m, { text, usedPrefix, command, conn }) => {
    if (!text) {
        return m.reply(`Contoh:\n${usedPrefix + command} Paul_Yans`);
    }
    
    try {
        await m.reply(wait); // Loading message
        
        // Fetch API
        let res = await fetch(`https://api.betabotz.eu.org/api/stalk/roblox?username=${text}&apikey=${lann}`);
        let json = await res.json();
        
        // Validasi response
        if (!json || json.code !== 200 || !json.result) {
            return m.reply('❌ User tidak ditemukan atau API error!');
        }
        
        let account = json.result.account;
        let presence = json.result.presence;
        let stats = json.result.stats;
        let badges = json.result.badges || [];
        let friends = json.result.friendList || [];
        
        // Format badges
        let badgeText = badges.length > 0 
            ? badges.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`).join('\n')
            : 'Tidak ada badge';
        
        // Format friends
        let friendText = friends.length > 0
            ? friends.slice(0, 5).map((f, i) => `${i + 1}. ID: ${f.id}`).join('\n')
            : 'Tidak ada teman';
        
        // Build caption
        let caption = `乂 *R O B L O X  S T A L K E R*

┌─⭓ *Account Info*
│◦ *Username:* ${account.username}
│◦ *Display Name:* ${account.displayName}
│◦ *Description:* ${account.description}
│◦ *Created:* ${new Date(account.created).toLocaleDateString('id-ID')}
│◦ *Banned:* ${account.isBanned ? 'Yes ❌' : 'No ✅'}
│◦ *Verified:* ${account.hasVerifiedBadge ? 'Yes ✅' : 'No ❌'}
└─────────────

┌─⭓ *Presence*
│◦ *Online:* ${presence.isOnline ? 'Yes 🟢' : 'No 🔴'}
│◦ *Last Online:* ${presence.lastOnline}
│◦ *Recent Game:* ${presence.recentGame}
└─────────────

┌─⭓ *Statistics*
│◦ *Friends:* ${stats.friendCount}
│◦ *Followers:* ${stats.followers}
│◦ *Following:* ${stats.following}
└─────────────

┌─⭓ *Badges* (Top 5)
${badgeText}
└─────────────

┌─⭓ *Friends* (Top 5)
${friendText}
└─────────────

🔗 *Profile:* https://www.roblox.com/users/${account.username}/profile`;

        // Send message with profile picture
        await conn.sendMessage(m.chat, {
            photo: account.profilePicture,
            caption: caption
        }, { quoted: m });
        
    } catch (e) {
        console.error('Roblox Stalk Error:', e);
        m.reply('❌ Sistem sedang bermasalah!\n' + e.message);
    }
};

handler.help = ['robloxstalk <username>'];
handler.tags = ['stalk'];
handler.command = /^(robloxstalk|rbxstalk)$/i;
handler.limit = true;

module.exports = handler;