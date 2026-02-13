// websearch.js
const fetch = require('node-fetch');

const API_KEY = '35ef880ca7msh245345d88c47944p1a4686jsn947f26843cf4';
const API_HOST = 'real-time-web-search.p.rapidapi.com';

async function searchWeb(query) {
  const url = `https://real-time-web-search.p.rapidapi.com/search-advanced?q=${encodeURIComponent(query)}&num=10&start=0&gl=us&hl=id&device=mobile&nfpr=0`;

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST
    }
  };

  try {
    const response = await fetch(url, options);
    const json = await response.json();

    if (json.status !== 'OK' || !Array.isArray(json.data)) {
      console.error('Invalid response:', json);
      return [];
    }

    const results = json.data.map(item => ({
      title: item.title,
      snippet: item.snippet,
      url: item.url,
      source: item.source
    }));

    return results;
  } catch (error) {
    console.error('Error fetching web search:', error);
    return [];
  }
}

// Contoh penggunaan dari CLI
if (require.main === module) {
  (async () => {
    const query = process.argv.slice(2).join(' ') || 'JKT48 event 2025';
    const results = await searchWeb(query);

    console.log(`\nHasil pencarian untuk: "${query}"\n`);
    results.forEach((res, i) => {
      console.log(`🔹 ${i + 1}. ${res.title}`);
      console.log(`   ${res.snippet}`);
      console.log(`   🌐 ${res.url}`);
      console.log(`   📎 Sumber: ${res.source}\n`);
    });
  })();
}

module.exports = searchWeb;