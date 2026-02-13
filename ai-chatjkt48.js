const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const uploader = require("../lib/uploadImage");
// const VertexAI = require("../lib/gemmy");
const searchWeb = require("../lib/websearch");
const { translate } = require('bing-translate-api');

/* ===================== GEMINI WRAPPER (kompatibel dgn gemmy.chat) ===================== */
const { GoogleGenAI } = require("@google/genai");
const _ai = new GoogleGenAI({ apiKey: geminiKey });
const MODEL_ID = "gemini-2.0-flash";

// Wrapper supaya pemanggilan lama `gemmy.chat(...)` tetap berjalan
const gemmy = new (class {
  // kompatibel: gemmy.chat(userMessage, { model, system_instruction })
  async chat(userMessage, { model, system_instruction } = {}) {
    const prompt =
      (system_instruction ? system_instruction + "\n\n" : "") +
      (userMessage || "");

    const resp = await _ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt, // @google/genai bisa string langsung
    });

    const text = resp?.text ?? "";
    // kembalikan shape seperti sebelumnya:
    // res?.[0]?.content?.parts?.[0]?.text
    return [{ content: { parts: [{ text }] } }];
  }
})();
/* ===================================================================================== */

// Configuration
const CONFIG = {
  DATA_URL: "https://raw.githubusercontent.com/xfiln/DB-Main/main/members.json",
  SESSION_PATH: "./data/jktchat-history.json",
  ANALYTICS_PATH: "./data/jktchat-analytics.json",
  FAVORITES_PATH: "./data/jktchat-favorites.json",
  LANGUAGE_PATH: "./data/jktchat-language.json",
  INTERACT_PATH: "./data/jktchat-interact.json",
  CACHE_DURATION: 5 * 60 * 1000,
  MAX_HISTORY: 50,
  BACKUP_INTERVAL: 24 * 60 * 60 * 1000,
  MOOD_KEYWORDS: {
    happy: ["senang", "gembira", "bahagia", "suka", "excited", "wow", "amazing"],
    sad: ["sedih", "kecewa", "galau", "down", "bad", "upset"],
    angry: ["marah", "kesal", "bete", "annoying", "hate"],
    love: ["cinta", "sayang", "love", "like", "suka banget", "kangen"],
    curious: ["kenapa", "mengapa", "gimana", "bagaimana", "apa", "siapa"]
  },
  SUPPORTED_LANGUAGES: ['id', 'en', 'ja', 'ko', 'zh', 'es', 'fr', 'de', 'ru']
};

// Cache and state management
let memberCache = null;
let lastFetch = 0;
let analytics = {};
let favorites = {};
let languagePrefs = {};
let lastBackup = 0;
let interactData = {};

// Initialize data directories
function initializeDirectories() {
  const dirs = ["./data", "./data/backups"];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Load language preferences
function loadLanguagePrefs() {
  if (!fs.existsSync(CONFIG.LANGUAGE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG.LANGUAGE_PATH, 'utf8'));
  } catch (e) {
    console.error("Error loading language prefs:", e);
    return {};
  }
}

// Save language preferences
function saveLanguagePrefs(data) {
  try {
    fs.writeFileSync(CONFIG.LANGUAGE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving language prefs:", e);
  }
}

// Load analytics data
function loadAnalytics() {
  if (!fs.existsSync(CONFIG.ANALYTICS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG.ANALYTICS_PATH, 'utf8'));
  } catch (e) {
    console.error("Error loading analytics:", e);
    return {};
  }
}

// Save analytics data
function saveAnalytics(data) {
  try {
    fs.writeFileSync(CONFIG.ANALYTICS_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving analytics:", e);
  }
}

// Load favorites data
function loadFavorites() {
  if (!fs.existsSync(CONFIG.FAVORITES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG.FAVORITES_PATH, 'utf8'));
  } catch (e) {
    console.error("Error loading favorites:", e);
    return {};
  }
}

// Save favorites data
function saveFavorites(data) {
  try {
    fs.writeFileSync(CONFIG.FAVORITES_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving favorites:", e);
  }
}

// Load interact data
function loadInteractData() {
  if (!fs.existsSync(CONFIG.INTERACT_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG.INTERACT_PATH, 'utf8'));
  } catch (e) {
    console.error("Error loading interact data:", e);
    return {};
  }
}

// Save interact data
function saveInteractData(data) {
  try {
    fs.writeFileSync(CONFIG.INTERACT_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving interact data:", e);
  }
}

// Update interact data
function updateInteractData(sender, type) {
  const today = new Date().toISOString().split('T')[0];
  const dayName = new Date().toLocaleString('en-US', { weekday: 'long' });
  const hour = new Date().getHours();

  if (!interactData[sender]) {
    interactData[sender] = { activities: {}, heatmap: {} };
  }

  if (!interactData[sender].activities[type]) {
    interactData[sender].activities[type] = 0;
  }
  interactData[sender].activities[type]++;
  interactData[sender].lastUpdated = today;

  if (!interactData[sender].heatmap[dayName]) {
    interactData[sender].heatmap[dayName] = [];
  }
  if (!interactData[sender].heatmap[dayName].includes(hour)) {
    interactData[sender].heatmap[dayName].push(hour);
    interactData[sender].heatmap[dayName].sort((a, b) => a - b);
  }

  saveInteractData(interactData);
}

// Enhanced member fetching with error handling
async function getMembers() {
  if (memberCache && Date.now() - lastFetch < CONFIG.CACHE_DURATION) {
    return memberCache;
  }
  
  try {
    const res = await fetch(CONFIG.DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    memberCache = json.members;
    lastFetch = Date.now();
    return memberCache;
  } catch (error) {
    console.error("Error fetching members:", error);
    if (memberCache) return memberCache;
    throw new Error("Failed to fetch member data");
  }
}

// Enhanced member search with fuzzy matching
function findMember(name, members) {
  const lower = name.toLowerCase();
  
  let member = members.find(m => 
    m.nama.toLowerCase() === lower || 
    m.alias.some(a => a.toLowerCase() === lower)
  );
  
  if (member) return member;
  
  member = members.find(m => 
    m.nama.toLowerCase().includes(lower) || 
    m.alias.some(a => a.toLowerCase().includes(lower))
  );
  
  if (member) return member;
  
  return members.find(m => 
    lower.includes(m.nama.toLowerCase()) || 
    m.alias.some(a => lower.includes(a.toLowerCase()))
  );
}

// Enhanced session management
function loadSession(sender, memberName) {
  if (!fs.existsSync(CONFIG.SESSION_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.SESSION_PATH, 'utf8'));
    return data?.[sender]?.[memberName] || null;
  } catch (e) {
    console.error("Error loading session:", e);
    return null;
  }
}

function saveSession(sender, memberName, history) {
  try {
    let data = {};
    if (fs.existsSync(CONFIG.SESSION_PATH)) {
      data = JSON.parse(fs.readFileSync(CONFIG.SESSION_PATH, 'utf8'));
    }
    if (!data[sender]) data[sender] = {};
    
    if (history.length > CONFIG.MAX_HISTORY) {
      history = history.slice(-CONFIG.MAX_HISTORY);
    }
    
    data[sender][memberName] = history;
    fs.writeFileSync(CONFIG.SESSION_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving session:", e);
  }
}

function formatBirthdate(birthdate) {
  if (!birthdate) return "Gatau Saya";
  
  try {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const date = new Date(birthdate);
    return isNaN(date) ? "Gatau Saya" : date.toLocaleDateString("id-ID", options);
  } catch {
    return "Gatau Saya";
  }
}

// Get last chat from history
function getLastChat(history) {
  if (!history || history.length === 0) return "Belum ada riwayat";
  
  const lastEntry = history[history.length - 1];
  const timestamp = lastEntry.parts?.[0]?.timestamp || Date.now();
  
  return new Date(timestamp).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

// Count media from history
function countMedia(history) {
  if (!history) return 0;
  
  return history.filter(entry => 
    entry.parts?.[0]?.text.includes("[Mengirim gambar]") || 
    entry.parts?.[0]?.text.includes("[Meminta ")
  ).length;
}

// Analytics tracking
function trackInteraction(sender, memberName, type = "chat") {
  const today = new Date().toISOString().split('T')[0];
  
  if (!analytics[sender]) {
    analytics[sender] = { daily: {}, members: {}, total: 0 };
  }
  
  if (!analytics[sender].daily[today]) {
    analytics[sender].daily[today] = 0;
  }
  
  if (!analytics[sender].members[memberName]) {
    analytics[sender].members[memberName] = 0;
  }
  
  analytics[sender].daily[today]++;
  analytics[sender].members[memberName]++;
  analytics[sender].total++;
  
  saveAnalytics(analytics);
}

// Mood detection
function detectMood(text) {
  const lower = text.toLowerCase();
  for (const [mood, keywords] of Object.entries(CONFIG.MOOD_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return mood;
    }
  }
  return "neutral";
}

// Enhanced AI generation with mood context and dynamic language
async function generateWithGemmy(history, userMessage, member, mood = "neutral", language = 'id') {
  try {
    const moodPrompt = {
      happy: "Respond with extra enthusiasm and joy!",
      sad: "Respond with empathy and comfort.",
      angry: "Respond calmly and try to cheer up the user.",
      love: "Respond with warmth and affection.",
      curious: "Respond with detailed explanations and enthusiasm for sharing knowledge.",
      neutral: ""
    };
    
    const languageInstruction = `Please respond in the same language as the user's message. 
User's language code: ${language}.`;
    
    const contextPrompt = `You are ${member.nama}, a JKT48 member. 
Current user mood: ${mood}. 
${moodPrompt[mood]}
${languageInstruction}`;
    
    const logic = history.map(h => `${h.role.toUpperCase()}: ${h.parts?.[0]?.text}`).join('\n');
    
    const res = await gemmy.chat(userMessage, {
      model: MODEL_ID,
      system_instruction: `${contextPrompt}\n\nChat History:\n${logic}`
    });
    
    const reply = res?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("Empty response");
    
    return { success: true, reply };
  } catch (e) {
    console.error("Gemmy generation error:", e);
    return { success: false, error: e };
  }
}

// Analyze image using gemmy.chat
async function analyzeImageWithGemmy(imageUrl, prompt, member, mood = "neutral", language = 'id', history = []) {
  try {
    const moodPrompt = {
      happy: "Respond with extra enthusiasm and joy!",
      sad: "Respond with empathy and comfort.",
      angry: "Respond calmly and try to cheer up the user.",
      love: "Respond with warmth and affection.",
      curious: "Respond with detailed explanations and enthusiasm for sharing knowledge.",
      neutral: ""
    };
    
    const languageInstruction = `Please respond in the same language as the user's message. 
User's language code: ${language}.`;
    
    const contextPrompt = `You are ${member.nama}, a JKT48 member. 
Current user mood: ${mood}. 
${moodPrompt[mood]}
${languageInstruction}`;
    
    const logic = history.map(h => `${h.role.toUpperCase()}: ${h.parts?.[0]?.text}`).join('\n');
    const combinedPrompt = `${prompt}\n\nAnalyze this image: ${imageUrl}`;
    
    const res = await gemmy.chat(combinedPrompt, {
      model: MODEL_ID,
      system_instruction: `${contextPrompt}\n\nChat History:\n${logic}`
    });
    
    const reply = res?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("Empty response");
    
    return { success: true, reply };
  } catch (e) {
    console.error("Gemmy image analysis error:", e);
    return { success: false, error: e };
  }
}

// Backup system
async function createBackup() {
  const now = Date.now();
  if (now - lastBackup < CONFIG.BACKUP_INTERVAL) return;
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = './data/backups';
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    if (fs.existsSync(CONFIG.SESSION_PATH)) {
      fs.copyFileSync(CONFIG.SESSION_PATH, `${backupDir}/sessions-${timestamp}.json`);
    }
    
    if (fs.existsSync(CONFIG.ANALYTICS_PATH)) {
      fs.copyFileSync(CONFIG.ANALYTICS_PATH, `${backupDir}/analytics-${timestamp}.json`);
    }
    
    if (fs.existsSync(CONFIG.LANGUAGE_PATH)) {
      fs.copyFileSync(CONFIG.LANGUAGE_PATH, `${backupDir}/language-${timestamp}.json`);
    }
    
    if (fs.existsSync(CONFIG.INTERACT_PATH)) {
      fs.copyFileSync(CONFIG.INTERACT_PATH, `${backupDir}/interact-${timestamp}.json`);
    }
    
    lastBackup = now;
  } catch (e) {
    console.error("Backup creation error:", e);
  }
}

// Extract file extension from URL
function getFileExtension(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split('.').pop().split('?')[0].toLowerCase();
  } catch {
    return '';
  }
}

// Detect language using Bing Translate
async function detectLanguage(text) {
  if (text.length < 3) return 'id';
  
  try {
    const detection = await translate(text, null, 'en');
    return detection.language.from;
  } catch (e) {
    console.error("Bing detect error:", e);
    const enKeywords = ['i', 'you', 'the', 'is', 'are', 'what', 'when'];
    const idKeywords = ['aku', 'saya', 'kamu', 'ini', 'itu', 'apa'];
    
    const words = text.toLowerCase().split(/\s+/);
    const enCount = words.filter(w => enKeywords.includes(w)).length;
    const idCount = words.filter(w => idKeywords.includes(w)).length;
    
    return enCount > idCount ? 'en' : 'id';
  }
}

// Get simplified language code
function getSimpleLanguage(langCode) {
  const mainCode = langCode.split('-')[0];
  return CONFIG.SUPPORTED_LANGUAGES.includes(mainCode) 
    ? mainCode 
    : 'id';
}

// Main handler
let handler = async (m, { conn, command, usedPrefix, args }) => {
  initializeDirectories();
  analytics = loadAnalytics();
  favorites = loadFavorites();
  languagePrefs = loadLanguagePrefs();
  interactData = loadInteractData();
  
  conn.jkt48auto = conn.jkt48auto || {};
  const sender = m.sender;
  
  try {
    const members = await getMembers();
    
    switch (command) {
      case "jktmember": {
        const page = parseInt(args[0]) || 1;
        const perPage = 10;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const totalPages = Math.ceil(members.length / perPage);
        
        const currentMembers = members.slice(start, end);
        const daftar = currentMembers.map((m, i) => {
          const num = start + i + 1;
          const fav = favorites[sender]?.includes(m.nama) ? "⭐" : "";
          return `${num}. ${fav} *${m.nama}* (${m.alias.join(", ")})`;
        }).join("\n");
        
        const navInfo = totalPages > 1 ? `\n\n📄 Halaman ${page}/${totalPages}\nGunakan: ${usedPrefix}${command} ${page + 1} (halaman selanjutnya)` : "";
        
        return m.reply(`📋 *Daftar Member JKT48:*\n\n${daftar}${navInfo}\n\nGunakan: .jktchat <nama>\n⭐ = Member favorit`);
      }

      case "jktchat": {
        if (m.isGroup) {
          return m.reply("⚠️ Fitur JKT48 chat hanya tersedia di private chat!\n\nSilakan chat bot secara private untuk menggunakan fitur ini.");
        }
        
        if (!args[0]) return m.reply(`⚠️ Masukkan nama member.\n\nContoh: ${usedPrefix}${command} Freya\nAtau: ${usedPrefix}${command} random (chat dengan member random)`);
        
        let member;
        const input = args.join(" ");
        
        if (input.toLowerCase() === "random") {
          member = members[Math.floor(Math.random() * members.length)];
        } else {
          member = findMember(input, members);
          if (!member) {
            const suggestions = members
              .filter(m => m.nama.toLowerCase().includes(input.toLowerCase()))
              .slice(0, 3)
              .map(m => m.nama);
            
            const suggest = suggestions.length > 0 ? `\n\n💡 Mungkin maksud kamu: ${suggestions.join(", ")}` : "";
            return m.reply(`❌ Member *${input}* tidak ditemukan.${suggest}`);
          }
        }

        const restored = loadSession(sender, member.nama);
        const history = restored || [{ 
          role: "user", 
          parts: [{ text: member.prompt, timestamp: Date.now() }] 
        }];
        
        const userLanguage = languagePrefs[sender] || 'id';
        
        conn.jkt48auto[sender] = { 
          member, 
          history, 
          _start: Date.now(),
          mood: "neutral",
          language: userLanguage,
          type: "single"
        };
        
        trackInteraction(sender, member.nama, "start");
        
        const stats = analytics[sender]?.members?.[member.nama] || 0;
        const statusMsg = restored 
          ? `📂 Lanjutan chat dengan *${member.nama}* (${stats} chat sebelumnya).`
          : `🩷 Mulai chat baru dengan *${member.nama}*.`;

        return conn.sendMessage(m.chat, {
          image: { url: member.image },
          caption: `${statusMsg}\n\n💬 Ketik ${usedPrefix}help untuk melihat fitur khusus!`
        });
      }

      case "jktreset": {
        if (!args[0]) return m.reply(`⚠️ Masukkan nama member.\n\nContoh: ${usedPrefix}${command} Gracia\nAtau: ${usedPrefix}${command} all (reset semua)`);
        
        const name = args.join(" ");
        
        if (name.toLowerCase() === "all") {
          if (!fs.existsSync(CONFIG.SESSION_PATH)) {
            return m.reply("📂 Tidak ada data sesi untuk direset.");
          }
          
          let data = JSON.parse(fs.readFileSync(CONFIG.SESSION_PATH, 'utf8'));
          if (data[sender]) {
            delete data[sender];
            fs.writeFileSync(CONFIG.SESSION_PATH, JSON.stringify(data, null, 2));
            delete conn.jkt48auto[sender];
            return m.reply("✅ Semua riwayat chat berhasil direset.");
          }
          return m.reply("ℹ️ Tidak ada sesi yang tersimpan.");
        }
        
        const target = findMember(name, members);
        if (!target) return m.reply(`❌ Member *${name}* tidak ditemukan.`);
        
        if (!fs.existsSync(CONFIG.SESSION_PATH)) {
          return m.reply("📂 Tidak ada data sesi untuk direset.");
        }

        let data = JSON.parse(fs.readFileSync(CONFIG.SESSION_PATH, 'utf8'));
        if (data[sender] && data[sender][target.nama]) {
          delete data[sender][target.nama];
          if (Object.keys(data[sender]).length === 0) delete data[sender];
          fs.writeFileSync(CONFIG.SESSION_PATH, JSON.stringify(data, null, 2));
          
          if (conn.jkt48auto[sender]?.member?.nama === target.nama) {
            delete conn.jkt48auto[sender];
          }
          
          return m.reply(`✅ Riwayat chat dengan *${target.nama}* berhasil direset.`);
        }

        return m.reply(`ℹ️ Tidak ada sesi aktif atau tersimpan dengan *${target.nama}*.`);
      }

      case "jktlist": {
        if (!fs.existsSync(CONFIG.SESSION_PATH)) {
          return m.reply("📂 Belum ada sesi yang tersimpan.");
        }
        
        const raw = JSON.parse(fs.readFileSync(CONFIG.SESSION_PATH, 'utf8'));
        const list = raw[sender];
        
        if (!list || Object.keys(list).length === 0) {
          return m.reply("📂 Kamu belum pernah chat dengan member manapun.");
        }

        const daftar = Object.entries(list)
          .map(([name, history], i) => {
            const last = [...history].reverse().find(x => x.parts?.[0]?.timestamp);
            const t = last?.parts?.[0]?.timestamp;
            const waktu = t
              ? new Date(t).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
              : "Tidak diketahui";
            
            const chatCount = analytics[sender]?.members?.[name] || 0;
            const fav = favorites[sender]?.includes(name) ? "⭐" : "";
            
            return `${i + 1}. ${fav} *${name}* (${chatCount} chat)\n   _Last chat:_ ${waktu}`;
          })
          .join("\n\n");

        return m.reply(`📦 *Daftar sesi chat kamu:*\n\n${daftar}`);
      }

      case "jktstop": {
        const session = conn.jkt48auto[sender];
        if (!session) return m.reply("⚠️ Tidak ada sesi aktif.");
        
        if (session.type === "group") {
          saveSession(sender, "group", session.history);
        } else {
          saveSession(sender, session.member.nama, session.history);
        }
        delete conn.jkt48auto[sender];
        
        return m.reply(`✅ Sesi ${session.type === "group" ? "group chat" : `dengan *${session.member.nama}*`} disimpan dan dihentikan.`);
      }

      case "jktfav": {
        if (!args[0]) return m.reply("⚠️ Masukkan nama member.\n\nContoh: .jktfav Freya (tambah/hapus favorit)");
        
        const name = args.join(" ");
        const member = findMember(name, members);
        if (!member) return m.reply(`❌ Member *${name}* tidak ditemukan.`);
        
        if (!favorites[sender]) favorites[sender] = [];
        
        const index = favorites[sender].indexOf(member.nama);
        if (index > -1) {
          favorites[sender].splice(index, 1);
          saveFavorites(favorites);
          return m.reply(`💔 *${member.nama}* dihapus dari favorit.`);
        } else {
          favorites[sender].push(member.nama);
          saveFavorites(favorites);
          return m.reply(`⭐ *${member.nama}* ditambahkan ke favorit!`);
        }
      }

      case "jktstats": {
        const userStats = analytics[sender];
        if (!userStats) return m.reply("📊 Belum ada data statistik.");
        
        const today = new Date().toISOString().split('T')[0];
        const todayChats = userStats.daily[today] || 0;
        const totalChats = userStats.total || 0;
        
        const topMembers = Object.entries(userStats.members || {})
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count], i) => `${i + 1}. ${name}: ${count} chat`)
          .join('\n');
        
        const favList = favorites[sender] || [];
        const favText = favList.length > 0 ? `\n\n⭐ *Favorit:* ${favList.join(', ')}` : "";
        
        return m.reply(`📊 *Statistik Chat Kamu:*\n\n` +
          `🗓️ Chat hari ini: ${todayChats}\n` +
          `📈 Total chat: ${totalChats}\n\n` +
          `🏆 *Top 5 Member:*\n${topMembers}${favText}`);
      }

      case "jkthelp": {
        const helpText = `🤖 *JKT48 Chat Bot - Panduan Lengkap*\n\n` +
          `📝 *Perintah Dasar:*\n` +
          `• .jktmember - Daftar member\n` +
          `• .jktchat <nama> - Mulai chat\n` +
          `• .jktchat random - Chat random\n` +
          `• .jktstop - Hentikan sesi\n` +
          `• .jktlist - Daftar sesi\n` +
          `• .jktreset <nama> - Reset chat\n\n` +
          `⭐ *Fitur Tambahan:*\n` +
          `• .jktfav <nama> - Favorit member\n` +
          `• .jktstats - Statistik chat\n` +
          `• .jktinteract - Statistik interaksi detail\n` +
          `• .jktgroupchat <member1,member2> - Chat dengan multiple member\n` +
          `• .jkthelp - Panduan ini\n\n` +
          `🎯 *Fitur Khusus:*\n` +
          `• Kirim gambar untuk dijelaskan\n` +
          `• Ketik "pap" untuk foto member\n` +
          `• Ketik "pap video" untuk video\n` +
          `• Tanyakan tentang jadwal/event\n` +
          `• Auto translate ke bahasa yang sama dengan pesan pengguna\n\n` +
          `💡 *Tips:*\n` +
          `• Bot mendeteksi mood kamu\n` +
          `• Riwayat chat otomatis tersimpan\n` +
          `• Preferensi bahasa disimpan secara permanen\n` +
          `• Hanya berfungsi di private chat\n` +
          `• Unlimited chat tanpa batas`;
        
        return m.reply(helpText);
      }
      
      case "jktdetail": {
        if (!args[0]) return m.reply(`⚠️ Masukkan nama member.\n\nContoh: ${usedPrefix}${command} Freya`);
        
        const name = args.join(" ");
        const member = findMember(name, members);
        if (!member) return m.reply(`❌ Member *${name}* tidak ditemukan.`);
        
        const history = loadSession(m.sender, member.nama) || [];
        
        const hasVideo = member.pap?.some(url => 
          ['mp4', 'mov', 'avi'].includes(getFileExtension(url))
        );
        
        const hasPhoto = member.pap?.some(url => 
          ['jpg', 'jpeg', 'png', 'webp'].includes(getFileExtension(url))
        );
        
        const chatCount = analytics[m.sender]?.members?.[member.nama] || 0;
        const mediaCount = countMedia(history);
        const isFavorite = favorites[m.sender]?.includes(member.nama) || false;
        
        const defaultLang = member.language || "id";
        const lastLang = languagePrefs[m.sender] || defaultLang;
        
        const detailText = 
          `✨ *Detail Member JKT48: ${member.nama}*\n\n` +
          `🖼️ *Foto Profil*: ${member.image}\n` +
          `📦 *Total Pap*: ${member.pap?.length || 0} konten\n` +
          `🎥 *Memiliki Pap Video?*: ${hasVideo ? "Ya" : "Tidak"}\n` +
          `📸 *Memiliki Pap Foto?*: ${hasPhoto ? "Ya" : "Tidak"}\n` +
          `⏱️ *Last Chat*: ${getLastChat(history)}\n` +
          `💬 *Jumlah Pesan Chat*: ${chatCount}\n` +
          `🖼️ *Jumlah Media*: ${mediaCount}\n` +
          `⭐ *Favorit*: ${isFavorite ? "Ya" : "Tidak"}\n` +
          `🌐 *Bahasa Default*: ${defaultLang}\n` +
          `🌍 *Bahasa Terakhir*: ${lastLang}\n` +
          `🎂 *Ulang Tahun*: ${formatBirthdate(member.birthdate)}\n\n` +
          `ℹ️ *Alias*: ${member.alias.join(", ") || "-"}\n` +
          `📝 *Prompt Awal*: ${member.prompt.substring(0, 100)}...`;
        
        return conn.sendMessage(m.chat, {
          image: { url: member.image },
          caption: detailText
        });
      }

      case "jktinteract": {
        const userData = interactData[sender] || { activities: {}, heatmap: {} };
        
        const activityText = Object.entries(userData.activities || {})
          .map(([type, count]) => {
            const icons = {
              image: "🖼️",
              video: "🎥",
              pap: "📸",
              search: "🔍",
              mood_happy: "😊",
              mood_sad: "😢",
              mood_angry: "😠",
              mood_love: "💖",
              mood_curious: "🤔",
              mood_neutral: "😐",
              chat: "💬"
            };
            return `${icons[type] || "•"} ${type.replace('_', ' ')}: ${count}x`;
          })
          .join('\n') || "Belum ada aktivitas tercatat";
        
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const heatmapText = days.map(day => {
          const hours = userData.heatmap[day] || [];
          return hours.length > 0 
            ? `📅 ${day}: ${hours.map(h => `${h}:00`).join(', ')}`
            : null;
        }).filter(Boolean).join('\n') || "Belum ada data heatmap";
        
        return m.reply(
          `📊 *Statistik Interaksi Detail*\n\n` +
          `⏱️ *Terakhir Diperbarui:* ${userData.lastUpdated || "-"}\n\n` +
          `🎯 *Aktivitas:*\n${activityText}\n\n` +
          `🔥 *Waktu Aktif Kamu:*\n${heatmapText}`
        );
      }

      case "jktgroupchat": {
        if (m.isGroup) {
          return m.reply("⚠️ Group chat hanya di private chat!");
        }
        
        if (!args[0]) {
          return m.reply(`⚠️ Masukkan nama member dipisahkan koma.\nContoh: ${usedPrefix}${command} Freya,Gracia`);
        }
        
        const names = args.join(" ").split(",").map(name => name.trim());
        const membersList = [];
        
        for (const name of names) {
          const member = findMember(name, await getMembers());
          if (!member) {
            return m.reply(`❌ Member "${name}" tidak ditemukan.`);
          }
          membersList.push(member);
        }
        
        if (membersList.length < 2) {
          return m.reply("❌ Minimal 2 member untuk group chat!");
        }
        
        const initialHistory = membersList.map(member => ({
          role: "user",
          parts: [{ text: `[${member.nama} masuk group] ${member.prompt}`, timestamp: Date.now() }]
        }));
        
        conn.jkt48auto[m.sender] = {
          type: "group",
          members: membersList,
          history: initialHistory,
          currentTurn: 0,
          _start: Date.now(),
          mood: "neutral",
          language: languagePrefs[m.sender] || 'id'
        };
        
        const memberList = membersList.map(m => m.nama).join(", ");
        return conn.sendMessage(m.chat, {
          text: `💬 *Group Chat Dimulai!*\nAnggota: ${memberList}\n\n` +
                `Bot akan bergantian merespons sebagai member. Ketik sesuatu untuk memulai!\n\n` +
                `⏭️ Giliran pertama: *${membersList[0].nama}*`
        });
      }
    }
  } catch (error) {
    console.error("Handler error:", error);
    return m.reply(`❌ Error: ${error.message}`);
  }
};

// Enhanced before handler dengan mood detection, dynamic language, dan image processing
handler.before = async (m, { conn }) => {
  conn.jkt48auto = conn.jkt48auto || {};
  const session = conn.jkt48auto[m.sender];

  if (
    !session || m.fromMe || m.isBaileys ||
    /^\.jkt/i.test(m.text || "") ||
    m.isGroup
  ) return;

  const webKeywords = ["jadwal", "konser", "event", "showroom", "graduate", "teater", "pengumuman", "schedule"];

  try {
    await createBackup();
    
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || "";

    // Handle direct image messages
    if (/image/.test(mime)) {
      updateInteractData(m.sender, "image");
      const buffer = await q.download();
      const media = await uploader(buffer);
      const member = session.member;
      
      let prompt;
      if (m.text) {
        prompt = m.text;
      } else {
        const imagePrompts = [
          `Jelaskan gambar ini dengan gaya ${member.nama} yang ceria!`,
          `Komentari foto ini seperti ${member.nama} yang ekspresif!`,
          `Apa pendapat ${member.nama} tentang gambar ini?`
        ];
        prompt = imagePrompts[Math.floor(Math.random() * imagePrompts.length)];
      }
      
      const result = await analyzeImageWithGemmy(media, prompt, member, session.mood, session.language, session.history);
      
      let replyText;
      if (result.success) {
        replyText = result.reply;
      } else {
        replyText = `Wah, gambarnya bagus banget! Tapi aku agak kesulitan menjelaskannya nih~`;
      }
      
      session.history.push({ 
        role: "user", 
        parts: [{ 
          text: m.text ? m.text : "[Mengirim gambar]", 
          timestamp: Date.now() 
        }] 
      });
      session.history.push({ 
        role: "model", 
        parts: [{ text: replyText, timestamp: Date.now() }] 
      });
      
      trackInteraction(m.sender, member.nama, "image");
      return conn.sendMessage(m.chat, { text: `📸 *${member.nama}*\n${replyText}` });
    }

    // Handle replies to quoted images
    if (m.quoted && m.quoted.mimetype && /image/.test(m.quoted.mimetype)) {
      try {
        updateInteractData(m.sender, "image");
        const buffer = await m.quoted.download();
        const media = await uploader(buffer);
        const member = session.member;
        
        const prompt = m.text;
        
        const result = await analyzeImageWithGemmy(media, prompt, member, session.mood, session.language, session.history);
        
        let replyText;
        if (result.success) {
          replyText = result.reply;
        } else {
          replyText = `Wah, gambarnya bagus banget! Tapi aku agak kesulitan menjelaskannya nih~`;
        }

        session.history.push({ 
          role: "user", 
          parts: [{ text: prompt, timestamp: Date.now() }] 
        });
        session.history.push({ 
          role: "model", 
          parts: [{ text: replyText, timestamp: Date.now() }] 
        });

        trackInteraction(m.sender, member.nama, "image-reply");
        return conn.sendMessage(m.chat, { text: `📸 *${member.nama}*\n${replyText}` });
      } catch (error) {
        console.error("Error processing image reply:", error);
        return conn.sendMessage(m.chat, { text: "Maaf, ada kesalahan saat memproses gambarnya 😢" });
      }
    }

    if (!m.text) return;

    // Handle pap (photo/video) requests
    const papVideoPattern1 = /\bpap\s*vid(?:eo)?\b/i.test(m.text);
    const papVideoPattern2 = /\bvid(?:eo)?\s*pap\b/i.test(m.text);
    const isPapVideo = papVideoPattern1 || papVideoPattern2;

    const papImagePattern1 = /\bpap\s*(?:foto|gambar|pic|photo)\b/i.test(m.text);
    const papImagePattern2 = /\b(?:foto|gambar|pic|photo)\s*pap\b/i.test(m.text);
    const isPapImage = (papImagePattern1 || papImagePattern2) && !isPapVideo;

    const isPapRandom = !isPapVideo && !isPapImage && /\bpap\s*(?:random)?\b/i.test(m.text);

    if ((isPapVideo || isPapImage || isPapRandom) && session.member?.pap?.length > 0) {
      updateInteractData(m.sender, "pap");
      const mediaType = isPapVideo ? 'video' : (isPapImage ? 'foto' : 'random');
      
      const jpgPap = session.member.pap.filter(url => 
        ['jpg', 'jpeg', 'png', 'webp'].includes(getFileExtension(url))
      );
      
      const mp4Pap = session.member.pap.filter(url => 
        ['mp4', 'mov', 'avi'].includes(getFileExtension(url))
      );
      
      let papList;
      if (mediaType === 'video') {
        papList = mp4Pap;
      } else if (mediaType === 'foto') {
        papList = jpgPap;
      } else {
        papList = [...jpgPap, ...mp4Pap];
      }

      if (papList.length === 0) {
        return m.reply(`❌ Maaf, ${session.member.nama} belum punya konten ${mediaType} nih~`);
      }

      const papUrl = papList[Math.floor(Math.random() * papList.length)];
      const isVideo = ['mp4','mov','avi'].includes(getFileExtension(papUrl));

      session.history.push({ 
        role: "user", 
        parts: [{ text: m.text, timestamp: Date.now() }] 
      });

      const prompt = `Kamu ${session.member.nama}. Pengguna meminta ${mediaType}. Berikan respon singkat (1 kalimat) yang sesuai dengan riwayat percakapan ini: ${session.history.slice(-3).map(h => h.parts[0].text).join(" | ")}`;
      const captionResult = isVideo 
        ? await generateWithGemmy(session.history, prompt, session.member, session.mood, session.language)
        : await analyzeImageWithGemmy(papUrl, prompt, session.member, session.mood, session.language, session.history);
      
      let captionText;
      if (captionResult.success) {
        captionText = captionResult.reply;
      } else {
        const responses = [
          "Nih buat kamu~",
          "Khusus buat kamu aja ya!",
          "Jangan disebarkan ya~",
          "Semoga suka!"
        ];
        captionText = responses[Math.floor(Math.random() * responses.length)];
      }

      session.history.push({ 
        role: "model", 
        parts: [{ text: captionText, timestamp: Date.now() }] 
      });

      trackInteraction(m.sender, session.member.nama, "pap");
      
      return conn.sendMessage(m.chat, {
        [isVideo ? 'video' : 'image']: { url: papUrl },
        caption: `${isVideo ? '🎥' : '📸'} *${session.member.nama}*\n${captionText}`
      });
    }

    // Handle web search keywords
    if (webKeywords.some(k => m.text.toLowerCase().includes(k))) {
      updateInteractData(m.sender, "search");

      // 🔁 sebelumnya pakai { react: {...} } ➜ ganti jadi text saja
      await conn.sendMessage(m.chat, { text: "🔍" }, { quoted: m });

      const result = await searchWeb(m.text);
      if (result.length === 0) {
        return m.reply(`❌ *${session.member.nama}*\nMaaf, aku ga nemu info tentang "${m.text}" nih~`);
      }

      let teks = `🌐 *${session.member.nama} cariin info buat kamu:*\n\n`;
      result.slice(0, 5).forEach((r, i) => {
        teks += `${i + 1}. *${r.title}*\n📝 ${r.snippet}\n🔗 ${r.url}\n\n`;
      });

      session.history.push({ 
        role: "user", 
        parts: [{ text: m.text, timestamp: Date.now() }] 
      });
      session.history.push({ 
        role: "model", 
        parts: [{ text: teks, timestamp: Date.now() }] 
      });

      trackInteraction(m.sender, session.member.nama, "search");
      return conn.sendMessage(m.chat, { text: teks }, { quoted: m });
    }

    // Handle group chat
    if (session.type === "group") {
      updateInteractData(m.sender, "chat");
      const currentMember = session.members[session.currentTurn];
      
      const mood = detectMood(m.text);
      session.mood = mood;
      
      const detectedLang = await detectLanguage(m.text);
      const simpleLang = getSimpleLanguage(detectedLang);
      session.language = simpleLang;
      languagePrefs[m.sender] = simpleLang;
      saveLanguagePrefs(languagePrefs);
      
      const result = await generateWithGemmy(
        session.history,
        m.text,
        currentMember,
        mood,
        simpleLang
      );
      
      if (result.success) {
        session.history.push({
          role: "user",
          parts: [{ text: `[User]: ${m.text}`, timestamp: Date.now() }]
        });
        
        session.history.push({
          role: "model",
          parts: [{ text: `[${currentMember.nama}]: ${result.reply}`, timestamp: Date.now() }]
        });
        
        session.currentTurn = (session.currentTurn + 1) % session.members.length;
        const nextMember = session.members[session.currentTurn];
        
        const moodEmoji = {
          happy: "😊",
          sad: "🤗",
          angry: "😌",
          love: "💕",
          curious: "🤔",
          neutral: "💌"
        };
        
        return conn.sendMessage(m.chat, { 
          text: `${moodEmoji[mood]} *${currentMember.nama}*\n${result.reply}\n\n` +
                `⏭️ Giliran selanjutnya: *${nextMember.nama}*`
        }, { quoted: m });
      }
      
      return m.reply(`😔 *${currentMember.nama}*\nMaaf, aku lagi sibuk banget nih...`);
    }

    // Handle single chat
    const detectedLang = await detectLanguage(m.text);
    const simpleLang = getSimpleLanguage(detectedLang);
    
    session.language = simpleLang;
    languagePrefs[m.sender] = simpleLang;
    saveLanguagePrefs(languagePrefs);
    
    updateInteractData(m.sender, "chat");
    updateInteractData(m.sender, `mood_${session.mood}`);
    
    // 🔁 sebelumnya pakai { react: {...} } ➜ ganti jadi text
    await conn.sendMessage(m.chat, { text: "💭" }, { quoted: m });
    
    const mood = detectMood(m.text);
    session.mood = mood;
    
    const result = await generateWithGemmy(
      session.history, 
      m.text, 
      session.member, 
      mood,
      simpleLang
    );

    if (result.success) {
      session.history.push({ 
        role: "user", 
        parts: [{ text: m.text, timestamp: Date.now() }] 
      });
      session.history.push({ 
        role: "model", 
        parts: [{ text: result.reply, timestamp: Date.now() }] 
      });
      
      trackInteraction(m.sender, session.member.nama, "chat");
      
      const moodEmoji = {
        happy: "😊",
        sad: "🤗",
        angry: "😌",
        love: "💕",
        curious: "🤔",
        neutral: "💌"
      };
      
      return conn.sendMessage(m.chat, { 
        text: `${moodEmoji[mood]} *${session.member.nama}*\n${result.reply}` 
      }, { quoted: m });
    } else {
      const errorResponses = {
        id: [
          "Maaf, aku lagi sibuk banget nih...",
          "Waduh, otakku lagi loading nih~",
          "Bentar ya, aku lagi bingung...",
          "Ups, ada gangguan teknis nih!"
        ],
        en: [
          "Sorry, I'm super busy right now...",
          "Whoops, my brain is loading~",
          "Hold on, I'm a bit confused...",
          "Oops, there's a technical issue!"
        ],
        ja: [
          "すみません、今すごく忙しいです...",
          "おっと、脳が読み込み中です~",
          "ちょっと待って、混乱しています...",
          "おっと、技術的な問題があります！"
        ],
        ko: [
          "죄송해요, 지금 너무 바빠요...",
          "우웃, 내 뇌가 로딩 중이에요~",
          "잠시만요, 조금 혼란스러워요...",
          "어머, 기술적인 문제가 생겼어요!"
        ],
        zh: [
          "抱歉，我现在很忙...",
          "哎呀，我的大脑正在加载~",
          "稍等，我有点困惑...",
          "哎呀，出现技术问题了！"
        ]
      };
      
      const responses = errorResponses[simpleLang] || errorResponses.en;
      const errorMsg = responses[Math.floor(Math.random() * responses.length)];
      
      return m.reply(`😔 *${session.member.nama}*\n${errorMsg}`);
    }
  } catch (err) {
    console.error("Handler error:", err);
    await m.reply(`❌ Error sistem: ${err.message}`);
  }
};

handler.help = [
  "jktchat <nama>", "jktmember", "jktstop", "jktreset <nama>", 
  "jktlist", "jktfav <nama>", "jktstats", "jkthelp", "jktdetail",
  "jktinteract", "jktgroupchat <member1,member2>"
];
handler.tags = ["ai"];
handler.command = /^jkt(chat|member|stop|reset|list|fav|stats|help|detail|interact|groupchat)$/i;
handler.group = false;
handler.private = true;
handler.limit = false;

module.exports = handler;