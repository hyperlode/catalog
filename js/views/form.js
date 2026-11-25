Views.form = (() => {
// Add (#/add) and edit (#/edit/:id) share this form.
// Edit changes text fields only; pictures are chosen on add.

const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);

async function render(el, id) {
  if (!auth.loggedIn) {
    location.hash = '#/login';
    return;
  }
  const [categories, existing] = await Promise.all([listCategories(), id ? getArtwork(id) : null]);
  const [y, m, d] = existing ? existing.date.split('-') : ['', '', ''];
  const p = existing?.date_precision;

  const files = h('input', { type: 'file', accept: 'image/*', multiple: true });
  const previews = h('div', { class: 'previews' });
  files.addEventListener('change', () => {
    previews.replaceChildren(...[...files.files].map((f) =>
      h('img', { src: URL.createObjectURL(f), alt: '' })));
  });

  const title = h('input', { type: 'text', required: true, value: existing?.title || '' });
  const year = h('input', { type: 'number', min: 1000, max: 2999, inputmode: 'numeric', required: true, value: y });
  const month = h('select', {},
    h('option', { value: '' }, '—'),
    Array.from({ length: 12 }, (_, i) =>
      h('option', { value: i + 1, selected: p && p !== 'year' && Number(m) === i + 1 },
        new Date(2000, i, 1).toLocaleDateString('nl-BE', { month: 'long' }))));
  const day = h('input', { type: 'number', min: 1, max: 31, inputmode: 'numeric', value: p === 'day' ? Number(d) : '' });
  const type = h('select', {}, Object.entries(t.types).map(([v, text]) =>
    h('option', { value: v, selected: existing?.type === v }, text)));
  const category = h('input', { type: 'text', list: 'categories', value: existing?.category?.name || '' });
  const description = h('textarea', { rows: 3 }, existing?.description || '');
  const status = h('p', { class: 'muted' });
  const submit = h('button', { type: 'submit', class: 'primary' }, t.save);

  const form = h('form', {},
    existing ? null : field(t.photos, files),
    previews,
    field(t.title, title),
    h('div', { class: 'date-row' }, field(t.year, year), field(t.month, month), field(t.day, day)),
    field(t.type, type),
    field(t.category, category),
    h('small', { class: 'muted' }, t.categoryHint),
    h('datalist', { id: 'categories' }, categories.map((c) => h('option', { value: c.name }))),
    field(t.description, description),
    status,
    h('div', { class: 'actions' },
      submit,
      h('a', { class: 'button', href: existing ? `#/work/${id}` : '#/' }, t.cancel)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'muted';
    const when = buildDate(year.value, month.value, day.value);
    if (!title.value.trim()) return fail(t.needTitle);
    if (!when) return fail(t.needYear);
    if (!existing && !files.files.length) return fail(t.needPhoto);

    const fields = {
      title: title.value.trim(),
      date: when.date,
      date_precision: when.precision,
      type: type.value,
      description: description.value.trim() || null,
      categoryName: category.value,
    };
    submit.disabled = true;
    try {
      if (existing) {
        await updateArtwork(id, fields);
        location.hash = `#/work/${id}`;
      } else {
        const newId = await createArtwork(fields, [...files.files], (i, n) => {
          status.textContent = `${t.saving} (${i}/${n})…`;
        });
        location.hash = `#/work/${newId}`;
      }
    } catch (err) {
      console.error(err);
      submit.disabled = false;
      fail(`${t.error}: ${err.message || err}`);
    }
  });

  function fail(message) {
    status.className = 'error';
    status.textContent = message;
  }

  el.append(h('h1', {}, existing ? t.edit : t.add), form);
}

return { render };
})();
