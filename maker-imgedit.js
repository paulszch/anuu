const uploadImage = require('../lib/uploadImage');
const fetch = require('node-fetch');
const axios = require('axios');
const { GoogleGenAI, Modality } = require('@google/genai');

let handler = async (m, { conn, usedPrefix, command, text }) => {
    if (['imageedit', 'imgedit', 'img2img', 'editimg'].includes(command) && !text) {
        return m.reply('Tolong masukkan text prompt untuk mengedit gambar.');
    }

    var q = m.quoted ? m.quoted : m;
    var mime = (q.msg || q).mimetype || q.mediaType || '';
    
    let endpoint = '';
    let imageUrl = '';

    switch(command) {
        case 'jadidisney':
        case 'todisney':
            endpoint = 'disney';
            break;
        case 'jadipixar':
        case 'topixar':
            endpoint = 'pixar';
            break;
        case 'jadicartoon':
        case 'tocartoon':
            endpoint = 'cartoon';
            break;
        case 'jadicyberpunk':
        case 'tocyberpunk':
            endpoint = 'cyberpunk';
            break;
        case 'jadivangogh':
        case 'tovangogh':
            endpoint = 'vangogh';
            break;
        case 'jadipixelart':
        case 'topixelart':
            endpoint = 'pixelart';
            break;
        case 'jadicomicbook':
        case 'tocomicbook':
            endpoint = 'comicbook';
            break;
        case 'jadihijab':
        case 'tohijab':
            endpoint = 'hijab';
            break;
        case 'jadihitam':
        case 'hitamkan':
        case 'tohitam':
            endpoint = 'hitam';
            break;
        case 'jadiputih':
        case 'toputih':
            endpoint = 'putih';
            break;
        case 'jadighibili':
        case 'toghibili':
            endpoint = 'ghibili';
            break;
        case 'jadifigure':
        case 'tofigure':
            endpoint = 'figure';
            break;
        case 'imageedit':
        case 'imgedit':
        case 'img2img':
        case 'editimg':
            if (!text) return m.reply('Tolong masukkan text prompt untuk mengedit gambar.');
            endpoint = 'editimg';
            break;
        default:
            return m.reply("[ ! ] Command tidak dikenali.");
    }

    // Check if text contains URL (for URL support)
    const urlRegex = /https?:\/\/[^\s]+/;
    const isUrlProvided = text && urlRegex.test(text);

    // If URL is provided in text
    if (isUrlProvided) {
        await conn.reply(m.chat, wait, m);
        try {
            const urlMatch = text.match(urlRegex);
            imageUrl = urlMatch[0];
            
            let startTime = new Date();
            
            if (['imageedit', 'imgedit', 'img2img', 'editimg'].includes(command)) {
                // For image edit commands with prompt, extract prompt (text without URL)
                const prompt = text.replace(urlRegex, '').trim();
                if (!prompt) {
                    return m.reply('Tolong masukkan text prompt untuk mengedit gambar selain URL.');
                }
                
                let result = await imageedit(prompt, imageUrl);
                let enhanceResult = await reminiEnhance(result);
                await conn.sendMessage(m.chat, { 
                    image: { url: enhanceResult }, 
                    caption: `🎨 *Style:* Edit Gambar (Enhanced)\n📋 *Prompt*: ${prompt}\n🔗 *Source:* URL\n⏳ *Waktu:* ${((new Date() - startTime) * 1)} ms`
                }, { quoted: m });
            } else if (['jadifigure', 'tofigure'].includes(command)) {
                // Special handling for figure generation using Gemini AI
                let result = await generateFigure(imageUrl);
                // Upload the generated buffer to get URL for remini
                let figureUrl = await uploadImage(result);
                let figureEnhance = await reminiEnhance(figureUrl);
                await conn.sendMessage(m.chat, { 
                    image: { url: figureEnhance }, 
                    caption: `🎨 *Style:* Jadi Figure (Enhanced)\n🔗 *Source:* URL\n⏳ *Waktu:* ${((new Date() - startTime) * 1)} ms`
                }, { quoted: m });
            } else {
                // For other style transformations, apply to URL first then enhance
                let res = await fetch(`https://api.betabotz.eu.org/api/maker/jadi${endpoint}?url=${encodeURIComponent(imageUrl)}&apikey=${lann}`);
                let convertBuffer = await res.buffer();
                // Upload the converted image to get URL for remini
                let convertedUrl = await uploadImage(convertBuffer);
                // Apply remini enhancement
                let enhancedResult = await reminiEnhance(convertedUrl);
                await conn.sendMessage(m.chat, { 
                    image: { url: enhancedResult }, 
                    caption: `🎨 *Style:* Jadi ${endpoint} (Enhanced)\n🔗 *Source:* URL\n⏳ *Waktu:* ${((new Date() - startTime) * 1)} ms`
                }, { quoted: m });
            }
        } catch (e) {
            console.error(e);
            m.reply("[ ! ] Terjadi kesalahan saat memproses gambar dari URL. Pastikan URL gambar valid dan dapat diakses.");
        }
    }
    // If image is attached/quoted (original functionality)
    else if (/image/g.test(mime) && !/webp/g.test(mime)) {
        await conn.reply(m.chat, wait, m);
        try {
            const img = await q.download?.();
            let out = await uploadImage(img);
            let startTime = new Date();
            
            if (['imageedit', 'imgedit', 'img2img', 'editimg'].includes(command)) {
                let result = await imageedit(text, out);
                let enhancedRemini = await reminiEnhance(result);
                await conn.sendMessage(m.chat, { 
                    image: { url: enhancedRemini }, 
                    caption: `🎨 *Style:* Edit Gambar (Enhanced)\n📋 *Prompt*: ${text}\n🔗 *Source:* Upload\n⏳ *Waktu:* ${((new Date() - startTime) * 1)} ms`
                }, { quoted: m });
            } else if (['jadifigure', 'tofigure'].includes(command)) {
                // Special handling for figure generation using Gemini AI
                const img = await q.download?.();
                let result = await generateFigureFromBuffer(img, mime);
                // Upload the generated buffer to get URL for remini
                let figureUrl = await uploadImage(result);
                let enhancedFigure = await reminiEnhance(figureUrl);
                await conn.sendMessage(m.chat, { 
                    image: { url: enhancedFigure }, 
                    caption: `🎨 *Style:* Jadi Figure (Enhanced)\n🔗 *Source:* Upload\n⏳ *Waktu:* ${((new Date() - startTime) * 1)} ms`
                }, { quoted: m });
            } else {
                let res = await fetch(`https://api.betabotz.eu.org/api/maker/jadi${endpoint}?url=${encodeURIComponent(out)}&apikey=${lann}`);
                let convert = await res.buffer();
                let convertedUrl = await uploadImage(convert);
                let enhanceResult = await reminiEnhance(convertedUrl);
                
                await conn.sendMessage(m.chat, { 
                    image: { url: enhanceResult }, 
                    caption: `🎨 *Style:* Jadi ${endpoint} (Enhanced)\n🔗 *Source:* Upload\n⏳ *Waktu:* ${((new Date() - startTime) * 1)} ms`
                }, { quoted: m });
            }

        } catch (e) {
            console.error(e);
            m.reply("[ ! ] Terjadi kesalahan saat memproses gambar.");
        }
    } else {
        // Help message updated to include URL support
        const helpMessage = `*Cara penggunaan:*\n\n` +
            `1️⃣ *Upload gambar:*\n` +
            `Kirim gambar dengan caption *${usedPrefix + command}*\n\n` +
            `2️⃣ *Reply gambar:*\n` +
            `Reply gambar dengan *${usedPrefix + command}*\n\n` +
            `3️⃣ *Gunakan URL:*\n` +
            `*${usedPrefix + command}* <url_gambar>\n\n` +
            `*Contoh:*\n` +
            `${usedPrefix + command} https://example.com/image.jpg`;
            
        m.reply(helpMessage);
    }
};

handler.help = handler.command = ['jadidisney', 'todisney', 'jadipixar', 'topixar', 'jadicartoon', 'tocartoon', 'jadicyberpunk', 'tocyberpunk', 'jadivangogh', 'tovangogh', 'jadipixelart', 'topixelart', 'jadicomicbook', 'tocomicbook', 'jadihijab', 'tohijab', 'jadihitam', 'hitamkan', 'tohitam', 'jadiputih', 'toputih', 'jadighibili', 'toghibili', 'jadifigure', 'tofigure', 'imageedit', 'imgedit', 'img2img', 'editimg'];
handler.tags = ['maker'];
handler.premium = false;
handler.limit = true;

module.exports = handler;

/*
 * @ CJS Image Edit Ai Use BetaBotz Api
 * @ Param {string} text - The text prompt for the image generation.
 * @ Param {string} url - The URL of the image to be edited.
 * @ Param {string} [apikey] - API key for authentication.
 * @ Returns {string} - The edited image URL.
 * @ Throws {Error} - If the image generation fails.
 * @ Example Usage:
 */
async function imageedit(text, url) {
  try {
    const { data } = await axios.post("https://api.betabotz.eu.org/api/maker/imgedit", {
      text: text,
      url: url,
      apikey: lann
    });
    
    return data.result;
  } catch (error) {
    throw new Error("Failed to fetch image: " + error.message);
  };
};

/*
 * @ CJS Remini Image Enhance Use BetaBotz Api
 * @ Param {string} url - The URL of the image to be enhanced.
 * @ Param {string} [apikey] - API key for authentication.
 * @ Returns {string} - The enhanced image URL.
 * @ Throws {Error} - If the image enhancement fails.
 * @ Example Usage:
 */
async function reminiEnhance(url) {
  try {
    const { data } = await axios.get(
      `https://api.betabotz.eu.org/api/tools/remini?url=${encodeURIComponent(url)}&apikey=${lann}`
    );

    if (data.status && data.url) {
      return data.url;
    } else {
      console.log("Remini enhancement failed - API returned unsuccessful status:", data);
      return url;
    }
  } catch (error) {
    console.log("Remini enhancement failed, returning original URL:", error.message);
    return url;
  }
}

/*
 * @ Generate Figure from URL using Gemini AI
 * @ Param {string} imageUrl - The URL of the image to be converted to figure
 * @ Returns {Buffer} - The generated figure image as a Buffer
 * @ Throws {Error} - If the figure generation fails
 */
async function generateFigure(imageUrl) {
  try {
    // Download image from URL
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    
    // Get mime type from response headers or default to image/jpeg
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    const ai = new GoogleGenAI({
      apiKey: global.geminiKey // Apikey Gemini
    });

    const contents = [
      { text: 'Draw a prospective model of the object in the picture, commercialized as a 1/7 scale full body figure. Please make this image into a real-life figure photo. Place the figurine version of the photo I provided on a round black plastic pedestal. I would like the PVC material to be clearly visible.The background should be a computer desk.' },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64
        }
      }
    ];

    let res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE]
      }
    });

    for (let part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
    
    throw new Error("No image generated from Gemini AI");
  } catch (error) {
    throw new Error("Failed to generate figure: " + error.message);
  }
};

/*
 * @ Generate Figure from Buffer using Gemini AI
 * @ Param {Buffer} buffer - The image buffer
 * @ Param {string} mimeType - The mime type of the image
 * @ Returns {Buffer} - The generated figure image as a Buffer
 * @ Throws {Error} - If the figure generation fails
 */
async function generateFigureFromBuffer(buffer, mimeType) {
  try {
    const base64 = buffer.toString('base64');
    
    const ai = new GoogleGenAI({
      apiKey: global.geminiKey // Apikey Gemini
    });

    const contents = [
      { text: 'Draw a prospective model of the object in the picture, commercialized as a 1/7 scale full body figure. Please make this image into a real-life figure photo. Place the figurine version of the photo I provided on a round black plastic pedestal. I would like the PVC material to be clearly visible.The background should be a computer desk.' },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64
        }
      }
    ];

    let res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE]
      }
    });

    for (let part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
    
    throw new Error("No image generated from Gemini AI");
  } catch (error) {
    throw new Error("Failed to generate figure: " + error.message);
  }
};