
function card(a) {
  const first = a.artwork_image[0];
  return h('a', { class: 'card', href: `#/work/${a.id}` },
    first
      ? h('img', { src: publicUrl(first.path_thumb), alt: a.title || t.untitled, loading: 'lazy' })
      : h('div', { class: 'noimg' }),
    h('div', { class: 'card-body' },
      h('strong', {}, a.title || t.untitled),
      h('span', { class: 'muted' }, formatDate(a.date, a.date_precision)),
      a.category ? h('span', { class: 'chip' }, a.category.name) : null,
    ));
}

const grid = (artworks) => h('div', { class: 'grid' }, artworks.map(card));

// Registry of page views; each views/*.js file fills in one entry.
const Views = {};
