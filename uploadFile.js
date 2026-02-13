const fetch = require('node-fetch');
const axios = require('axios')
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

module.exports = async (buffer) => {
  try {
    // Validasi buffer terlebih dahulu
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error("Buffer tidak valid atau kosong");
    }
    
    console.log('Buffer info:', {
      isBuffer: Buffer.isBuffer(buffer),
      length: buffer.length,
      firstBytes: buffer.length > 0 ? buffer.subarray(0, Math.min(16, buffer.length)).toString('hex') : 'empty'
    });
    
    // Deteksi MIME type dari buffer
    const fileTypeResult = await fromBuffer(buffer);
    
    let ext, mime;
    
    if (!fileTypeResult) {
      console.warn("Tidak dapat mendeteksi tipe file, menggunakan default");
      
      // Fallback: coba deteksi berdasarkan magic bytes
      ext = detectFileTypeByMagicBytes(buffer);
      mime = getMimeTypeFromExtension(ext);
      
      // Jika masih tidak bisa, gunakan default
      if (!ext) {
        ext = 'bin';
        mime = 'application/octet-stream';
      }
      
      console.log(`Menggunakan fallback: ext=${ext}, mime=${mime}`);
    } else {
      ext = fileTypeResult.ext;
      mime = fileTypeResult.mime;
      console.log(`Terdeteksi: ext=${ext}, mime=${mime}`);
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
      headers: {
        ...bodyForm.getHeaders()
      }
    });

    // Cek status response
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    // Parse response
    let result;
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Response bukan JSON valid: ${responseText}`);
    }
    
    console.log('Upload response:', result);
    
    // Cek apakah upload berhasil
    if (!result.success) {
      throw new Error(`Upload gagal: ${result.message || 'Unknown error'}`);
    }
    
    // Validasi URL response
    if (!result.url) {
      throw new Error("Upload gagal, URL tidak ditemukan: " + JSON.stringify(result));
    }
    
    // Return URL
    return result.url;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Fungsi helper untuk deteksi file type berdasarkan magic bytes
function detectFileTypeByMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return null;
  
  const hex = buffer.subarray(0, 16).toString('hex');
  const bytes = Array.from(buffer.subarray(0, 16));
  
  // Magic bytes untuk berbagai file type
  const signatures = {
    // Images
    'ffd8ff': 'jpg',
    '89504e47': 'png',
    '47494638': 'gif',
    '424d': 'bmp',
    '52494646': 'webp', // RIFF (WebP container)
    
    // Documents
    '25504446': 'pdf',
    'd0cf11e0': 'doc', // MS Office
    '504b0304': 'zip', // ZIP/DOCX/XLSX
    '504b0506': 'zip',
    '504b0708': 'zip',
    
    // Archives
    '1f8b08': 'gz',
    '377abcaf': '7z',
    '526172': 'rar',
    
    // Media
    '000001ba': 'mpg',
    '000001b3': 'mpg',
    '49443303': 'mp3',
    '49443302': 'mp3',
    'fff1': 'aac',
    'fff9': 'aac',
    
    // Text
    'efbbbf': 'txt', // UTF-8 BOM
  };
  
  // Cek signature
  for (const [signature, extension] of Object.entries(signatures)) {
    if (hex.toLowerCase().startsWith(signature.toLowerCase())) {
      return extension;
    }
  }
  
  // Cek apakah text file dan deteksi programming language
  if (isTextFile(buffer)) {
    return detectProgrammingLanguage(buffer) || 'txt';
  }
  
  return null;
}

function isTextFile(buffer) {
  // Cek beberapa byte pertama apakah printable ASCII
  const sample = buffer.subarray(0, Math.min(1024, buffer.length));
  let textBytes = 0;
  
  for (const byte of sample) {
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      textBytes++;
    }
  }
  
  return textBytes / sample.length > 0.85; // 85% byte harus printable
}

// Fungsi untuk mendeteksi bahasa pemrograman berdasarkan konten
function detectProgrammingLanguage(buffer) {
  const originalContent = buffer.toString('utf8', 0, Math.min(2048, buffer.length));
  const content = originalContent.toLowerCase();
  
  console.log('Detecting programming language for content:', originalContent.substring(0, 200) + '...');
  
  // JSON detection - prioritas tinggi dan diperbaiki
  if (isJsonFile(originalContent)) {
    console.log('Detected as JSON');
    return 'json';
  }
  
  // Deteksi berdasarkan shebang
  if (content.startsWith('#!/usr/bin/env python') || content.startsWith('#!/usr/bin/python')) {
    return 'py';
  }
  if (content.startsWith('#!/usr/bin/env php') || content.startsWith('#!/usr/bin/php')) {
    return 'php';
  }
  if (content.startsWith('#!/bin/bash') || content.startsWith('#!/bin/sh')) {
    return 'sh';
  }
  
  // Deteksi berdasarkan tag/syntax
  if (content.includes('<!doctype html') || content.includes('<html') || 
      content.includes('<head>') || content.includes('<body>')) {
    return 'html';
  }
  
  if (content.includes('<?xml') || (content.includes('<') && content.includes('/>'))) {
    return 'xml';
  }
  
  if (content.includes('<?php') || content.includes('<?=')) {
    return 'php';
  }
  
  // Deteksi berdasarkan keywords dan syntax patterns
  const patterns = {
    'py': [
      /def\s+\w+\s*\(/,
      /import\s+\w+/,
      /from\s+\w+\s+import/,
      /if\s+__name__\s*==\s*['"]\s*__main__\s*['"]/,
      /print\s*\(/
    ],
    'js': [
      /function\s+\w+\s*\(/,
      /var\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /const\s+\w+\s*=/,
      /console\.log\s*\(/,
      // CommonJS patterns
      /require\s*\(/,
      /module\.exports/,
      /exports\./,
      // ES6+ Module patterns
      /import\s+.*\s+from\s+['"]/,
      /import\s*\{.*\}\s*from/,
      /import\s*\*\s*as\s+\w+/,
      /export\s+(default|const|let|var|function|class)/,
      /export\s*\{.*\}/,
      // Modern JS patterns
      /=>\s*\{?/,  // Arrow functions
      /async\s+function/,
      /await\s+/,
      /\.then\s*\(/,
      /\.catch\s*\(/
    ],
    'java': [
      /public\s+class\s+\w+/,
      /public\s+static\s+void\s+main/,
      /import\s+java\./,
      /System\.out\.print/,
      /new\s+\w+\s*\(/
    ],
    'css': [
      /[\w-]+\s*:\s*[\w\s#.-]+;/,
      /@media\s+/,
      /\.\w+\s*\{/,
      /#\w+\s*\{/
    ],
    'cpp': [
      /#include\s*<\w+>/,
      /using\s+namespace\s+std/,
      /int\s+main\s*\(/,
      /cout\s*<</,
      /cin\s*>>/,
      /std::/
    ],
    'c': [
      /#include\s*<\w+\.h>/,
      /int\s+main\s*\(/,
      /printf\s*\(/,
      /scanf\s*\(/,
      /malloc\s*\(/
    ]
  };
  
  // Cek pattern untuk setiap bahasa
  for (const [lang, langPatterns] of Object.entries(patterns)) {
    let matches = 0;
    for (const pattern of langPatterns) {
      if (pattern.test(content)) {
        matches++;
      }
    }
    
    // Jika ditemukan minimal 2 pattern yang cocok
    if (matches >= 2) {
      console.log(`Detected as ${lang} (${matches} matches)`);
      return lang;
    }
  }
  
  // Deteksi sederhana berdasarkan keyword single
  if (content.includes('<?php')) return 'php';
  if (content.includes('def ') && content.includes('import ')) return 'py';
  if (content.includes('function ') && (content.includes('var ') || content.includes('let ') || content.includes('const '))) return 'js';
  if (content.includes('import ') && content.includes('from ') && content.includes("'")) return 'js'; // ES6 import
  if (content.includes('export ') && (content.includes('default') || content.includes('const') || content.includes('function'))) return 'js'; // ES6 export
  if (content.includes('=>') && (content.includes('const ') || content.includes('let '))) return 'js'; // Arrow functions
  if (content.includes('public class ') && content.includes('static void main')) return 'java';
  if (content.includes('#include') && content.includes('int main')) return content.includes('std::') ? 'cpp' : 'c';
  
  console.log('No programming language detected, defaulting to txt');
  return null; // Tidak terdeteksi, akan fallback ke 'txt'
}

// Fungsi khusus untuk deteksi JSON yang lebih akurat
function isJsonFile(content) {
  // Trim whitespace
  const trimmed = content.trim();
  
  console.log('JSON Detection - First 100 chars:', trimmed.substring(0, 100));
  
  // Cek apakah dimulai dan diakhiri dengan { } atau [ ]
  const startsWithBrace = trimmed.startsWith('{');
  const endsWithBrace = trimmed.endsWith('}');
  const startsWithBracket = trimmed.startsWith('[');
  const endsWithBracket = trimmed.endsWith(']');
  
  console.log('JSON Detection - Structure check:', {
    startsWithBrace,
    endsWithBrace,
    startsWithBracket,
    endsWithBracket
  });
  
  const validStructure = (startsWithBrace && endsWithBrace) || (startsWithBracket && endsWithBracket);
  
  if (!validStructure) {
    console.log('JSON Detection - Invalid structure, not JSON');
    return false;
  }
  
  // Cek karakteristik JSON (key-value pairs dengan quotes)
  const hasQuotedKeys = /"[\w\s\-_.\/]+"\s*:/g.test(content);
  const hasJsonValues = /:\s*[\[\{"]/.test(content) || /:\s*(true|false|null|\d+)/.test(content);
  
  console.log('JSON Detection - Content patterns:', {
    hasQuotedKeys,
    hasJsonValues,
    quotedKeysMatches: content.match(/"[\w\s\-_.\/]+"\s*:/g)?.slice(0, 3) || 'none'
  });
  
  if (hasQuotedKeys || hasJsonValues) {
    // Try to parse untuk validasi - dengan handling yang lebih baik
    try {
      JSON.parse(trimmed);
      console.log('JSON Detection - Valid JSON via parse');
      return true;
    } catch (e) {
      console.log('JSON Detection - Parse failed, but has JSON patterns:', e.message.substring(0, 50));
      
      // Jika parse gagal tapi punya karakteristik JSON yang kuat, tetap anggap JSON
      if (hasQuotedKeys && hasJsonValues && validStructure) {
        console.log('JSON Detection - Accepting as JSON based on strong patterns');
        return true;
      }
    }
  }
  
  console.log('JSON Detection - Not detected as JSON');
  return false;
}

function getMimeTypeFromExtension(ext) {
  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'heic': 'image/heic',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Archives
    'zip': 'application/zip',
    'gz': 'application/gzip',
    '7z': 'application/x-7z-compressed',
    'rar': 'application/vnd.rar',
    
    // Media
    'mp3': 'audio/mpeg',
    'aac': 'audio/aac',
    'mpg': 'video/mpeg',
    
    // Programming & Markup Languages
    'php': 'text/x-php',
    'py': 'text/x-python',
    'python': 'text/x-python',
    'js': 'application/javascript',
    'javascript': 'application/javascript',
    'java': 'text/x-java-source',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'xml': 'application/xml',
    'txt': 'text/plain',
    'c': 'text/x-csrc',
    'cpp': 'text/x-c++src',
    'cxx': 'text/x-c++src',
    'cc': 'text/x-c++src',
    'h': 'text/x-chdr',
    'hpp': 'text/x-c++hdr',
    
    // Additional programming languages
    'json': 'application/json',
    'sql': 'application/sql',
    'sh': 'application/x-sh',
    'bat': 'application/x-bat',
    'md': 'text/markdown',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    
    // Default
    'bin': 'application/octet-stream'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}