global.token = "7481968612:AAFjF0xyxOakyWowyV62FvuX46PKwS984pQ"
global.ownername = "paullsz" // sesuai username telegram
global.ownerid = ["5524457173"] // jika lebih dari 1 owner maka isi disni
global.premid = "5524457173"
global.botname = "Filnz Bot"
global.owner = ["6285965981742"] // untuk contact owner sesuaikan dengan ownerid
global.prefix = ["/", ".", "#", "!"]
global.wib = 7
global.wita = 8
global.wit = 9
global.wait = "Tunggu Sebentar..."
global.wm = "© Filnz-Bot"
// Message
// Jangan diubah bagian ini
global.MAX_CAPTION_LENGTH = 3900;
// Ini boleh diubah sesuai kebutuhan
global.message = {
    rowner: "Perintah ini hanya dapat digunakan oleh _*OWNER!*_",
    owner: "Perintah ini hanya dapat digunakan oleh _*Owner Bot*_!",
    premium: "Perintah ini hanya untuk member _*Premium*_!",
    group: "Perintah ini hanya dapat digunakan di grup!",
    private: "Perintah ini hanya dapat digunakan di Chat Pribadi!",
    admin: "Perintah ini hanya dapat digunakan oleh admin grup!",
    error: "Terjadi kesalahan, coba lagi nanti.",
  };

// Port configuration
global.ports = [4000, 3000, 5000, 8000];

// Database configuration
global.limit = 100;

// Apikey
//INI WAJIB DI ISI!//
global.lann = 'paullch'
global.aksesKey = 'chrisgre'
global.geminiKey = 'AIzaSyDzBs0M2szCQCZNLY_o6b4Kgya_NONwj7o'
//Daftar terlebih dahulu https://api.betabotz.eu.org

global.APIs = {
  lann: 'https://api.betabotz.eu.org',
}
global.APIKeys = {
  'https://api.betabotz.eu.org': global.lann,
}

let fs = require('fs');
let chalk = require('chalk');

const file = require.resolve(__filename);

fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update 'config.js'`));
  delete require.cache[file];
  require(file);
});
