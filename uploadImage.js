/*
const axios = require('axios');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');
*/
/**
 * Upload image to api.betabotz.eu.org
 * Supported mimetype:
``
* - `image/jpeg`
* - `image/png`
* - `image/webp`
* - `video/mp4`
* - `video/avi`
* - `video/mkv`
* - `audio/mpeg`
* - `audio/wav`
* - `audio/ogg`
 * @param {Buffer} buffer
 * @param {String} tmp true or false
 *@param {apikey} register on api.betabotz.eu.org
 */
 /*
 module.exports = async (buffer, tmp = 'false') => {
  const { ext, mime } = (await fromBuffer(buffer)) || {};
  const form = new FormData();
  form.append("file", buffer, { filename: `tmp.${ext}`, contentType: mime });
  form.append("apikey", lann);
  form.append("tmp", tmp);
  try {
    const { data } = await axios.post("https://api.betabotz.eu.org/api/tools/upload", form, {
      headers: form.getHeaders(),
    });   
    console.log(data);  
    return data.result;
  } catch (error) {
    throw error;
  }
};
*/

const fetch = require('node-fetch');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

/**
 * Upload image/video ke tmp.filn.xyz
 * @param {Buffer} buffer
 * @returns {Promise<string>} URL public file
 */
module.exports = async (buffer) => {
  try {
    // Deteksi MIME type dari buffer
    const fileTypeResult = await fromBuffer(buffer);
    
    if (!fileTypeResult) {
      throw new Error("Tidak dapat mendeteksi tipe file");
    }
    
    const { ext, mime } = fileTypeResult;
    
    // Validasi tipe file yang didukung
    const supportedTypes = [
      'image/jpeg', 'image/webp', 'image/png', 'image/gif', 'image/heic', 
      'video/mp4', 'video/quicktime'
    ];
    
    if (!supportedTypes.includes(mime)) {
      throw new Error(`Tipe file tidak didukung: ${mime}`);
    }
    
    // Buat form data
    const bodyForm = new FormData();
    bodyForm.append("file", buffer, {
      filename: `file.${ext}`,
      contentType: mime
    });

    // Upload file
    const response = await fetch("https://tmp.filn.xyz/upload.php", {
      method: "POST",
      body: bodyForm,
    });

    // Parse response
    const result = await response.json();
    
    console.log('Upload response:', result); // Debug log
    
    // Cek apakah upload berhasil
    if (!result.success) {
      throw new Error(`Upload gagal: ${result.message}`);
    }
    
    // Validasi URL response
    if (!result.url || !result.url.startsWith("https://")) {
      throw new Error("Upload gagal, URL tidak valid: " + JSON.stringify(result));
    }
    
    // Return URL
    return result.url;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};