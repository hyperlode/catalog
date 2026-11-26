// Demo mode: used automatically while js/config.js still has the placeholder Supabase URL.
// Same shape as the real data layer, but everything lives in memory (lost on refresh).
// Pictures are generated placeholders; photos added in demo mode are shown from the browser only.
const Demo = (() => {
  function picture(c1, c2, label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="600" height="600" fill="url(#g)"/>
      <circle cx="300" cy="260" r="110" fill="rgba(255,255,255,.25)"/>
      <text x="300" y="480" font-family="sans-serif" font-size="38" fill="#fff" text-anchor="middle">${label}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  const categories = [
    { id: 'c-barrel', name: 'Oliebarrel', description: 'Een reeks rond de roestige oliebarrel in de tuin.' },
    { id: 'c-torso', name: 'Torso', description: null },
  ];

  const seed = [
    ['a1', 'Oliebarrel I', '1992-01-01', 'year', 'drawing', 'Eerste schets in potlood.', 'c-barrel', ['#8a6d3b', '#3d2c12']],
    ['a2', 'Oliebarrel II', '1998-05-01', 'month', 'painting', 'Olieverf op doek, warmere kleuren.', 'c-barrel', ['#b5651d', '#4a1d0b']],
    ['a3', 'Oliebarrel III', '2009-09-14', 'day', 'sculpture', 'Gelast staal, ongeveer 60 cm hoog.', 'c-barrel', ['#555d66', '#1b1f23']],
    ['a4', 'Torso in klei', '2003-03-01', 'month', 'sculpture', null, 'c-torso', ['#a0522d', '#5b2a12']],
    ['a5', 'Torso in brons', '2004-11-20', 'day', 'sculpture', 'Gegoten naar het kleimodel.', 'c-torso', ['#8c6a2f', '#3b2a0c']],
    ['a6', 'Zeegezicht', '1987-01-01', 'year', 'watercolour', 'Aquarel, vakantie aan de kust.', null, ['#4a90b8', '#1c3f5c']],
    ['a7', 'Portret van een vrouw', '1995-02-01', 'month', 'drawing', 'Houtskool.', null, ['#777', '#222']],
    ['a8', 'Herfstbos', '2015-10-05', 'day', 'painting', null, null, ['#c9742b', '#5a2b0c']],
  ];

  let artworks = seed.map(([id, title, date, date_precision, type, description, category_id, [c1, c2]]) => ({
    id, title, date, date_precision, type, description, category_id,
    artwork_image: [{
      position: 0, original_filename: `${id}.jpg`,
      path_original: picture(c1, c2, title), path_web: picture(c1, c2, title), path_thumb: picture(c1, c2, title),
    }],
  }));

  const join = (a) => ({ ...a, category: categories.find((c) => c.id === a.category_id) || null });

  return {
    async listArtworks({ categoryId, ascending = false } = {}) {
      return artworks
        .filter((a) => !categoryId || a.category_id === categoryId)
        .sort((a, b) => (ascending ? 1 : -1) * a.date.localeCompare(b.date))
        .map(join);
    },
    async getArtwork(id) {
      const a = artworks.find((x) => x.id === id);
      if (!a) throw new Error('Niet gevonden');
      return join(a);
    },
    async listCategories() {
      return [...categories].sort((a, b) => a.name.localeCompare(b.name));
    },
    async listTypes() {
      return [...new Set(artworks.map((a) => a.type))];
    },
    async getCategory(id) {
      return categories.find((c) => c.id === id);
    },
    findOrCreateCategory(name) {
      name = name.trim();
      if (!name) return null;
      let c = categories.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!c) {
        c = { id: uuid(), name, description: null };
        categories.push(c);
      }
      return c.id;
    },
    async createArtwork(fields, files, onProgress = () => {}) {
      const { categoryName, ...rest } = fields;
      const images = [];
      for (let i = 0; i < files.length; i++) {
        onProgress(i + 1, files.length);
        const web = URL.createObjectURL(await resizeToJpeg(files[i], 1600));
        const thumb = URL.createObjectURL(await resizeToJpeg(files[i], 480));
        images.push({ position: i, original_filename: files[i].name, path_original: web, path_web: web, path_thumb: thumb });
      }
      const id = uuid();
      artworks.push({ id, category_id: Demo.findOrCreateCategory(categoryName), artwork_image: images, ...rest });
      return id;
    },
    async updateArtwork(id, fields) {
      const { categoryName, ...rest } = fields;
      Object.assign(artworks.find((a) => a.id === id), rest, { category_id: Demo.findOrCreateCategory(categoryName) });
    },
    async deleteArtwork(artwork) {
      artworks = artworks.filter((a) => a.id !== artwork.id);
    },
  };
})();
