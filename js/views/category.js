Views.category = (() => {
// One category (series): its versions in chronological order, oldest first.

async function render(el, id) {
  const [category, artworks] = await Promise.all([
    getCategory(id),
    listArtworks({ categoryId: id, ascending: true }),
  ]);
  el.append(
    h('a', { class: 'link', href: '#/' }, t.back),
    h('h1', {}, category.name),
    category.description ? h('p', {}, category.description) : null,
    h('h2', {}, t.versions),
    grid(artworks));
}

return { render };
})();
