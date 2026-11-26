Views.timeline = (() => {
// Home page: every work as a card, newest first, grouped by year, with type/category filters.

const filter = { type: '', category: '' };

function select(label, value, options, onchange) {
  return h('label', { class: 'filter' }, label,
    h('select', { onchange: (e) => onchange(e.target.value) },
      options.map(([v, text]) => h('option', { value: v, selected: v === value }, text))));
}

async function render(el) {
  const [artworks, categories] = await Promise.all([listArtworks(), listCategories()]);
  const list = h('div');
  const customTypes = [...new Set(artworks.map((a) => a.type).filter((v) => !(v in t.types)))].sort();
  const typeOptions = [...Object.entries(t.types), ...customTypes.map((v) => [v, v])];

  function draw() {
    const shown = artworks.filter((a) =>
      (!filter.type || a.type === filter.type) &&
      (!filter.category || a.category_id === filter.category));
    if (!shown.length) return list.replaceChildren(h('p', { class: 'muted' }, t.empty));
    const byYear = new Map();
    for (const a of shown) {
      const y = a.date.slice(0, 4);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(a);
    }
    list.replaceChildren(...[...byYear].map(([year, items]) =>
      h('section', { class: 'year' }, h('h2', {}, year), grid(items))));
  }

  el.append(
    h('div', { class: 'filters' },
      select(t.type, filter.type,
        [['', t.all], ...typeOptions],
        (v) => { filter.type = v; draw(); }),
      categories.length
        ? select(t.category, filter.category,
          [['', t.all], ...categories.map((c) => [c.id, c.name])],
          (v) => { filter.category = v; draw(); })
        : null,
      artworks.length
        ? h('button', { class: 'button pdf', onclick: (e) => PDF.download(e.currentTarget) }, t.pdfButton)
        : null),
    list);
  draw();
}

return { render };
})();
