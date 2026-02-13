let handler = async (m, { conn, args }) => {
  let plugins = Object.values(global.plugins).filter(p => p.help && p.tags);

  if (args.length > 0) {
    let queries = [...new Set(args.map(q => q.toLowerCase()))];
    let result = [];

    for (let query of queries) {
      let count = plugins.filter(p => {
        let tags = Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? [p.tags] : []);
        let help = Array.isArray(p.help) ? p.help : (typeof p.help === 'string' ? [p.help] : []);

        tags = tags.filter(tag => typeof tag === 'string');
        help = help.filter(h => typeof h === 'string');

        return tags.some(tag => tag.toLowerCase() === query) ||
               help.some(h => h.toLowerCase().includes(query));
      }).length;

      result.push(`${query}: ${count}`);
    }

    return m.reply(result.join('\n'));

  } else {
    let total = plugins.length;
    let allTags = [];

    for (let plugin of plugins) {
      let tags = Array.isArray(plugin.tags) ? plugin.tags : (typeof plugin.tags === 'string' ? [plugin.tags] : []);
      tags = tags.filter(tag => typeof tag === 'string');
      allTags.push(...tags.map(tag => tag.toLowerCase()));
    }

    allTags = [...new Set(allTags)].sort();

    let detail = allTags.map(tag => {
      let count = plugins.filter(p => {
        let tags = Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? [p.tags] : []);
        tags = tags.filter(t => typeof t === 'string');
        return tags.some(t => t.toLowerCase() === tag);
      }).length;
      return `${tag}: ${count}`;
    });

    let text = `*Total semua fitur:* ${total}\n\n${detail.join('\n')}`;
    return m.reply(text);
  }
};

handler.help = ['totalfitur [query1] [query2]'];
handler.tags = ['info'];
handler.command = ['totalfitur'];

module.exports = handler;