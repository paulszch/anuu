const axios = require("axios");
const FormData = require("form-data");
const { fromBuffer } = require("file-type");
const cheerio = require("cheerio");

/**
 * Upload file ke top4top.io (tanpa API key)
 * Mengembalikan { direct, page, allLinks }:
 *  - direct: tautan langsung ke file (jika terdeteksi)
 *  - page: halaman share/download di top4top
 *  - allLinks: semua link top4top yang ditemukan (debugging/cadangan)
 *
 * @param {Buffer} buffer
 * @returns {Promise<{direct?: string, page?: string, allLinks: string[]}>}
 */
module.exports = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Parameter buffer wajib berupa Buffer.");
  }

  const { ext, mime } = (await fromBuffer(buffer)) || {};
  if (!ext || !mime) {
    throw new Error("Tidak bisa mendeteksi tipe file dari buffer.");
  }

  // Siapkan form upload
  const form = new FormData();
  // Field name "file" biasanya cukup; tambahkan filename & contentType
  form.append("file", buffer, { filename: `upload.${ext}`, contentType: mime });

  try {
    const { data: html } = await axios.post("https://top4top.io/index.php", form, {
      headers: {
        ...form.getHeaders(),
        // Beberapa layanan lebih ramah jika ada UA yang wajar
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // Sedikit lebih longgar kalau responnya lambat
      timeout: 60_000,
      // Ikuti redirect kalau ada
      validateStatus: (s) => s >= 200 && s < 400,
    });

    // Parse HTML dengan cheerio
    const $ = cheerio.load(html);
    const allLinks = [];

    // Kumpulkan semua href yang mengandung domain top4top.io
    $('a[href*="top4top.io"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && /^https?:\/\/[^"' ]+top4top\.io\/[^"' ]+/i.test(href)) {
        allLinks.push(href);
      }
    });

    // Kadang link juga ada di input value
    $('input[value*="top4top.io"]').each((_, el) => {
      const val = $(el).attr("value");
      if (val && /^https?:\/\/[^"' ]+top4top\.io\/[^"' ]+/i.test(val)) {
        allLinks.push(val);
      }
    });

    // Dedup
    const uniqueLinks = [...new Set(allLinks)];

    if (uniqueLinks.length === 0) {
      throw new Error("Upload berhasil, tapi tidak menemukan URL hasil di halaman respons top4top.");
    }

    // Heuristik:
    // 1) Cari link direct ke file dengan ekstensi umum
    const extPattern = /\.(jpe?g|png|webp|gif|mp4|avi|mkv|mp3|mpeg|wav|ogg|webm|m4a|mov)(\?|$)/i;
    const direct =
      uniqueLinks.find((l) => extPattern.test(l)) ||
      // fallback: beberapa direct link tidak punya ekstensi jelas tapi ada pola 'p_' di path
      uniqueLinks.find((l) => /\/p_[^/]+/i.test(l));

    // 2) Cari link halaman (share/download) jika ada
    const page =
      uniqueLinks.find((l) => /(view|v|dl|d)\.top4top\.io|top4top\.io\/(download|view|v|d)\//i.test(l)) ||
      // fallback: ambil link pertama top4top yang bukan direct
      uniqueLinks.find((l) => !extPattern.test(l));

    return { direct, page, allLinks: uniqueLinks };
  } catch (err) {
    // Normalisasi error untuk debugging yang lebih jelas
    const msg =
      err?.response
        ? `HTTP ${err.response.status} saat upload ke top4top`
        : err?.message || String(err);
    const extra =
      err?.response?.data && typeof err.response.data === "string"
        ? ` | Potongan respons: ${err.response.data.slice(0, 200)}...`
        : "";
    throw new Error(`${msg}${extra}`);
  }
};