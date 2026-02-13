let handler = m => m

handler.before = async function (m, { isAdmin, isBotAdmin }) {
  console.log('\n=== ANTIPROMOSI AUTO DETECTOR START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Message ID:', m.id || m.message_id);
  console.log('Chat ID:', m.chat);
  console.log('Sender:', m.sender);
  console.log('Text:', m.text);
  console.log('Is Group:', m.isGroup);

  // Cek apakah di grup
  if (!m.isGroup) {
    console.log('❌ Bukan grup, skip detection');
    console.log('=== ANTIPROMOSI AUTO DETECTOR END ===\n');
    return;
  }

  console.log('Is Bot Admin (from params):', isBotAdmin);
  console.log('Is User Admin (from params):', isAdmin);
  
  // ========== DEBUG: CEK BOT ADMIN STATUS ==========
  console.log('\n🔍 ========== DEBUG BOT ADMIN CHECK START ==========');
  
  let botIsAdmin = isBotAdmin;
  
  // Jika isBotAdmin undefined, coba cek manual
  if (botIsAdmin === undefined) {
    console.log('⚠️ isBotAdmin is undefined, checking manually...');
    
    try {
      // Untuk Telegram
      if (this.telegram) {
        console.log('🤖 Platform: Telegram');
        
        // Coba berbagai cara untuk mendapatkan bot ID
        let botId = null;
        
        // Method 1: dari this.telegram.botInfo
        if (this.telegram.botInfo?.id) {
          botId = this.telegram.botInfo.id;
          console.log('Bot ID (from botInfo):', botId);
        }
        // Method 2: dari this.botInfo
        else if (this.botInfo?.id) {
          botId = this.botInfo.id;
          console.log('Bot ID (from this.botInfo):', botId);
        }
        // Method 3: dari context.botInfo
        else if (this.context?.botInfo?.id) {
          botId = this.context.botInfo.id;
          console.log('Bot ID (from context.botInfo):', botId);
        }
        // Method 4: panggil getMe() untuk mendapatkan bot info
        else {
          console.log('Bot ID not found in cache, calling getMe()...');
          const botInfo = await this.telegram.getMe();
          botId = botInfo.id;
          console.log('Bot ID (from getMe):', botId);
          console.log('Bot info:', JSON.stringify(botInfo, null, 2));
        }
        
        if (!botId) {
          throw new Error('Cannot get bot ID from any method');
        }
        
        // Cek status admin bot
        console.log('Checking bot admin status for bot ID:', botId);
        const botMember = await this.telegram.getChatMember(m.chat, botId);
        console.log('Bot member info:', JSON.stringify(botMember, null, 2));
        
        botIsAdmin = ['creator', 'administrator'].includes(botMember.status);
        console.log('Bot admin status (manual check):', botIsAdmin);
      } 
      // Untuk WhatsApp atau platform lain
      else {
        console.log('🤖 Platform: Non-Telegram (WhatsApp/Other)');
        
        // Cek dari metadata grup jika ada
        if (global.db.data.chats[m.chat]?.metadata) {
          const metadata = global.db.data.chats[m.chat].metadata;
          console.log('Chat metadata:', JSON.stringify(metadata, null, 2));
          
          // Cari bot ID dalam daftar admin
          const botJid = this.user?.jid || this.user?.id;
          console.log('Bot JID:', botJid);
          
          if (metadata.participants) {
            const botParticipant = metadata.participants.find(p => p.id === botJid);
            botIsAdmin = botParticipant?.admin !== null;
            console.log('Bot admin status (manual check):', botIsAdmin);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error checking bot admin status:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.body
      });
      
      // Jika gagal cek, asumsikan bot bukan admin untuk safety
      botIsAdmin = false;
    }
  }
  
  console.log('🔍 Final Bot Admin Status:', botIsAdmin);
  console.log('========== DEBUG BOT ADMIN CHECK END ==========\n');
  
  // Cek apakah bot admin
  if (!botIsAdmin) {
    console.log('❌ Bot bukan admin, skip detection');
    console.log('💡 Tip: Jadikan bot sebagai admin grup agar fitur anti-promosi berfungsi');
    console.log('=== ANTIPROMOSI AUTO DETECTOR END ===\n');
    return;
  }

  // Cek setting anti-promosi
  console.log('🔍 Mengecek setting anti-promosi...');
  // Gunakan m.chat untuk data grup (sesuai dengan command /antipromosi)
  let chat = global.db.data.chats[m.chat];
  console.log('Chat data (from m.chat):', chat);

  if (!chat) {
    console.log('⚠️ Chat data tidak ada, inisialisasi default...');
    // Inisialisasi jika belum ada
    global.db.data.chats[m.chat] = {
      antipromosi: false
    };
    chat = global.db.data.chats[m.chat];
    console.log('✅ Chat data diinisialisasi');
  }

  const antiPromosiStatus = chat.antipromosi || false;
  console.log('Anti-promosi aktif:', antiPromosiStatus);

  if (!antiPromosiStatus) {
    console.log('❌ Anti-promosi tidak aktif, skip detection');
    console.log('💡 Tip: Aktifkan dengan command /antipromosi on');
    console.log('=== ANTIPROMOSI AUTO DETECTOR END ===\n');
    return;
  }

  // Daftar kata kunci promosi
  const promosiKeywords = [
    "jual", "promo", "diskon", "harga", "order", "ready", "open",
    "jasa", "sedia", "transaksi", "nokos", "domain", "panel", "sewa",
    "dana", "gopay", "ovo", "menyediakan", "stok", "stock",
    "https://wa.me", "wa.me", "http://", "https://", "t.me/",
    "join", "gabung", "group", "grup"
  ];

  console.log('🔍 Mulai deteksi promosi...');
  const text = m.text ? m.text.toLowerCase() : "";
  console.log('Text yang dianalisis (lowercase):', text);

  // Cek apakah mengandung kata promosi
  const matchedKeywords = promosiKeywords.filter(k => text.includes(k));
  const isPromosi = matchedKeywords.length > 0;
  
  console.log('Kata kunci yang cocok:', matchedKeywords);
  console.log('Terdeteksi promosi:', isPromosi);

  if (isPromosi) {
    console.log('⚠️ PROMOSI TERDETEKSI!');
    
    // ========== DEBUG: CEK USER ADMIN STATUS ==========
    console.log('\n🔍 ========== DEBUG USER ADMIN CHECK START ==========');
    console.log('Is User Admin (from params):', isAdmin);
    
    let userIsAdmin = isAdmin;
    
    // Jika isAdmin undefined, cek manual
    if (userIsAdmin === undefined) {
      console.log('⚠️ isAdmin is undefined, checking manually...');
      
      try {
        if (this.telegram) {
          const userMember = await this.telegram.getChatMember(m.chat, m.sender);
          console.log('User member info:', JSON.stringify(userMember, null, 2));
          userIsAdmin = ['creator', 'administrator'].includes(userMember.status);
          console.log('User admin status (manual check):', userIsAdmin);
        } else {
          // WhatsApp check
          if (global.db.data.chats[m.sender]?.metadata?.participants) {
            const userParticipant = global.db.data.chats[m.sender].metadata.participants.find(p => p.id === m.sender);
            userIsAdmin = userParticipant?.admin !== null;
            console.log('User admin status (manual check):', userIsAdmin);
          }
        }
      } catch (err) {
        console.error('❌ Error checking user admin status:', err);
        userIsAdmin = false;
      }
    }
    
    console.log('🔍 Final User Admin Status:', userIsAdmin);
    console.log('========== DEBUG USER ADMIN CHECK END ==========\n');

    // Jika admin, skip hapus
    if (userIsAdmin) {
      console.log('✅ User adalah admin, pesan tidak dihapus');
      await this.sendMessage(m.chat, { 
        text: "⚠️ Kamu admin, jadi pesan ini nggak dihapus." 
      });
      console.log('=== ANTIPROMOSI AUTO DETECTOR END ===\n');
      return;
    }

    // ========== DEBUG MODE: DELETE MESSAGE ==========
    console.log('\n🔍 ========== DEBUG DELETE MESSAGE START ==========');
    
    // Debug: Cek object message lengkap
    console.log('📦 Full message object keys:', Object.keys(m));
    console.log('📦 Message sample:', JSON.stringify({
      id: m.id,
      message_id: m.message_id,
      chat: m.chat,
      sender: m.sender,
      from: m.from,
      key: m.key
    }, null, 2));
    
    // Debug: Cek message ID dalam berbagai format
    const messageId = m.message_id || m.id || m.key?.id;
    console.log('🆔 Message ID variants:');
    console.log('  - m.message_id:', m.message_id);
    console.log('  - m.id:', m.id);
    console.log('  - m.key?.id:', m.key?.id);
    console.log('  - Selected messageId:', messageId);
    
    // Debug: Cek chat ID dalam berbagai format
    console.log('💬 Chat ID variants:');
    console.log('  - m.chat:', m.chat);
    console.log('  - m.from?.id:', m.from?.id);
    console.log('  - m.key?.remoteJid:', m.key?.remoteJid);
    
    // Debug: Cek tipe platform
    console.log('🤖 Platform detection:');
    console.log('  - this.telegram exists:', !!this.telegram);
    console.log('  - this.deleteMessage exists:', !!this.deleteMessage);
    console.log('  - typeof this.telegram:', typeof this.telegram);
    
    // Debug: Cek bot permissions detail
    if (this.telegram) {
      try {
        // Get bot ID dengan berbagai method
        let botId = this.telegram.botInfo?.id || this.botInfo?.id;
        if (!botId) {
          const botInfo = await this.telegram.getMe();
          botId = botInfo.id;
        }
        
        const botMember = await this.telegram.getChatMember(m.chat, botId);
        console.log('🔐 Bot permissions:', JSON.stringify(botMember, null, 2));
        
        if (botMember.can_delete_messages !== undefined) {
          console.log('  - can_delete_messages:', botMember.can_delete_messages);
        }
      } catch (e) {
        console.log('⚠️ Tidak bisa cek bot permissions:', e.message);
      }
    }

    console.log('\n🗑️ Attempting to delete message...');
    console.log('Parameters:');
    console.log('  - chatId:', m.chat);
    console.log('  - messageId:', messageId);
    
    try {
      // Untuk Telegram
      if (this.telegram) {
        console.log('🔧 Using Telegram API...');
        console.log('Method: this.telegram.deleteMessage()');
        
        const result = await this.telegram.deleteMessage(m.chat, messageId);
        console.log('✅ Delete result:', result);
        console.log('✅ Pesan berhasil dihapus (Telegram)!');
      } 
      // Untuk WhatsApp atau lainnya
      else if (this.deleteMessage) {
        console.log('🔧 Using deleteMessage fallback...');
        console.log('Method: this.deleteMessage()');
        
        // Coba format utama
        const result = await this.deleteMessage(m.chat, { id: messageId });
        console.log('✅ Delete result:', result);
        console.log('✅ Pesan berhasil dihapus!');
      } else {
        console.log('❌ No delete method available!');
        throw new Error('No delete method found');
      }

      console.log('🔍 ========== DEBUG DELETE MESSAGE END ==========\n');

      // Kirim notifikasi
      console.log('📤 Mengirim notifikasi penghapusan...');
      const userId = m.sender;
      
      const mention = this.telegram ? `[User](tg://user?id=${userId})` : `@${userId}`;
      const notifMsg = await this.sendMessage(m.chat, { 
        text: `❌ Pesan promosi terdeteksi dan dihapus otomatis!\n\n` +
              `👤 User: ${mention}\n` +
              `📋 Kata kunci: ${matchedKeywords.join(', ')}\n` +
              `⏱️ Pesan ini akan terhapus dalam 5 detik.`,
        parse_mode: this.telegram ? 'Markdown' : undefined
      });
      console.log('✅ Notifikasi terkirim');

      // Auto-delete notifikasi
      setTimeout(async () => {
        try {
          const notifId = notifMsg.message_id || notifMsg.id;
          if (this.telegram) {
            await this.telegram.deleteMessage(m.chat, notifId);
          } else {
            await this.deleteMessage(m.chat, notifId);
          }
          console.log('✅ Notifikasi berhasil dihapus!');
        } catch (e) {
          console.error('❌ Gagal hapus notifikasi:', e.message);
        }
      }, 5000);

    } catch (err) {
      console.error('\n❌ ========== ERROR DELETE MESSAGE ==========');
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      if (err.response?.body) {
        console.error('API Response:', JSON.stringify(err.response.body, null, 2));
      }
      console.error('Error stack:', err.stack);
      console.error('========== ERROR END ==========\n');

      await this.sendMessage(m.chat, { 
        text: `🚨 Gagal menghapus pesan!\n\n` +
              `Error: ${err.message}\n\n` +
              `Pastikan bot punya permission "Delete Messages".`
      });
    }
  } else {
    console.log('✅ Tidak ada promosi terdeteksi');
  }

  console.log('=== ANTIPROMOSI AUTO DETECTOR END ===\n');
}

module.exports = handler