Views.work = (() => {
// Detail page for one work: all pictures, metadata, and (when logged in) edit/delete.

async function render(el, id) {
  const a = await getArtwork(id);
  fill(el,
    h('a', { class: 'link', href: '#/' }, t.back),
    h('h1', {}, a.title || t.untitled),
    h('p', { class: 'muted' },
      formatDate(a.date, a.date_precision), ' · ', t.types[a.type] || a.type,
      a.status ? ` · ${t.statuses[a.status] || a.status}` : ''),
    a.category
      ? h('p', {}, h('a', { class: 'chip', href: `#/category/${a.category.id}` }, a.category.name))
      : null,
    a.description ? h('p', { class: 'description' }, a.description) : null,
    h('div', { class: 'photos' }, a.artwork_image.map((img) =>
      h('figure', {},
        h('img', { src: publicUrl(img.path_web), alt: a.title || t.untitled, loading: 'lazy' }),
        h('a', { class: 'link small', href: publicUrl(img.path_original), target: '_blank', rel: 'noopener' }, t.fullSize)))),
    auth.loggedIn
      ? h('div', { class: 'actions' },
        h('a', { class: 'button', href: `#/edit/${a.id}` }, t.edit),
        h('button', {
          class: 'danger',
          onclick: async () => {
            if (!confirm(t.confirmDelete)) return;
            await deleteArtwork(a);
            location.hash = '#/';
          },
        }, t.delete))
      : null);
}

return { render };
})();
