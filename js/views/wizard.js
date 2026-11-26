// Add (#/add/<step>) and edit (#/edit/<id>/<step>) as a wizard: ONE question per screen, big buttons
// (Volgende / Overslaan / Vorige). Built for a non-technical, elderly user, so: few choices per screen,
// large touch targets, no hidden steps. Each step is its own URL, so the phone's back button moves one
// step back instead of leaving the form. Editing opens straight on the overview ("Alles in orde?").
Views.add = Views.edit = null;
(() => {
  const ORDER = ['fotos', 'titel', 'jaar', 'maand', 'dag', 'soort', 'status', 'reeks', 'beschrijving', 'overzicht'];
  const REQUIRED = new Set(['fotos', 'titel', 'jaar', 'soort']); // these have no "Overslaan"
  let draft = null; // everything typed so far, kept in memory while moving between steps

  const newDraft = () => ({
    editId: null, files: [], title: '', year: '', month: '', day: '',
    type: '', status: '', categoryName: '', description: '', fromSummary: false,
  });

  const base = () => (draft.editId ? `#/edit/${draft.editId}` : '#/add');
  const exitUrl = () => (draft.editId ? `#/work/${draft.editId}` : '#/');
  const go = (step, replace = false) => {
    const url = `${base()}/${step}`;
    if (replace) location.replace(url); else location.hash = url;
  };

  // Steps shown for this draft: no photos when editing, no day unless a month was chosen.
  const visible = () => ORDER.filter((s) =>
    !(s === 'fotos' && draft.editId) && !(s === 'dag' && !draft.month));

  // After a "Wijzig" from the overview, Volgende/Vorige/Overslaan return to the overview.
  function next(step) {
    if (draft.fromSummary) { draft.fromSummary = false; return go('overzicht'); }
    const v = visible();
    go(v[v.indexOf(step) + 1] || 'overzicht');
  }
  function prev(step) {
    if (draft.fromSummary) { draft.fromSummary = false; return go('overzicht'); }
    const v = visible();
    const i = v.indexOf(step);
    if (i > 0) go(v[i - 1]); else location.hash = exitUrl();
  }

  // Common layout of one question screen. spec: { body(submit), collect(), clear() }.
  function shell(el, step, spec) {
    const v = visible();
    const n = v.indexOf(step) + 1;
    const error = h('p', { class: 'error msg' });
    const submit = () => {
      const problem = spec.collect ? spec.collect() : null;
      if (problem) { error.textContent = problem; return; }
      next(step);
    };
    const skip = () => { if (spec.clear) spec.clear(); next(step); };
    const [question, hint] = t.q[step];
    el.append(h('div', { class: 'wiz' },
      h('div', { class: 'wiz-top' },
        h('span', { class: 'muted' }, t.stepOf(n, v.length)),
        h('button', {
          class: 'link', type: 'button',
          onclick: () => {
            if (draft.files.length && !draft.editId && !confirm(t.confirmStop)) return;
            location.hash = exitUrl();
          },
        }, t.stop)),
      h('div', { class: 'progress' }, h('div', { style: `width:${Math.round((n / v.length) * 100)}%` })),
      h('h1', {}, question),
      hint ? h('p', { class: 'muted hint' }, hint) : null,
      spec.body(submit),
      error,
      h('div', { class: 'wiz-nav' },
        h('button', { class: 'big primary', type: 'button', onclick: submit }, `${t.next} →`),
        h('div', { class: 'wiz-row' },
          h('button', { class: 'big', type: 'button', onclick: () => prev(step) }, `← ${t.prev}`),
          REQUIRED.has(step) ? null : h('button', { class: 'big', type: 'button', onclick: skip }, t.skip)))));
  }

  const onEnter = (submit) => (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
  const focusSoon = (input) => setTimeout(() => input.focus(), 50);

  // A group of big buttons where exactly one can be selected (month, type, series).
  function choices(items, selected, onPick) {
    const buttons = new Map();
    const mark = (value) => buttons.forEach((b, v) => b.classList.toggle('selected', v === value));
    const box = h('div', { class: 'choices' }, items.map(([value, label]) => {
      const b = h('button', { type: 'button', class: 'big choice', onclick: () => { onPick(value); mark(value); } }, label);
      buttons.set(value, b);
      return b;
    }));
    mark(selected);
    return { box, mark };
  }

  const urls = new WeakMap();
  const previewUrl = (file) => {
    if (!urls.has(file)) urls.set(file, URL.createObjectURL(file));
    return urls.get(file);
  };

  const STEPS = {
    fotos(el) {
      const input = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden' });
      const grid = h('div', { class: 'previews big' });
      const pick = h('button', { type: 'button', class: 'big alt', onclick: () => input.click() });
      const draw = () => {
        grid.replaceChildren(...draft.files.map((f, i) => h('div', { class: 'preview' },
          h('img', { src: previewUrl(f), alt: '' }),
          h('button', { type: 'button', class: 'remove', onclick: () => { draft.files.splice(i, 1); draw(); } }, t.remove))));
        pick.textContent = draft.files.length ? t.morePhotos : t.choosePhotos;
      };
      input.addEventListener('change', () => { draft.files.push(...input.files); input.value = ''; draw(); });
      draw();
      shell(el, 'fotos', {
        body: () => h('div', {}, pick, input, grid),
        collect: () => (draft.files.length ? null : t.needPhoto),
      });
    },

    titel(el) {
      const input = h('input', { type: 'text', class: 'bigfield', value: draft.title, autocomplete: 'off' });
      shell(el, 'titel', {
        body: (submit) => { input.addEventListener('keydown', onEnter(submit)); focusSoon(input); return input; },
        collect: () => {
          if (!input.value.trim()) return t.needTitle;
          draft.title = input.value.trim();
          return null;
        },
      });
    },

    jaar(el) {
      // Buttons for the recent years (this year back to 2000); older years are typed in the field.
      const now = new Date().getFullYear();
      const years = Array.from({ length: now - 2000 + 1 }, (_, i) => String(now - i)).map((y) => [y, y]);
      const input = h('input', {
        type: 'number', class: 'bigfield', inputmode: 'numeric', min: 1000, max: 2999, placeholder: '1987',
      });
      let chosen = draft.year;
      if (years.some(([y]) => y === chosen)) chosen = draft.year; else input.value = chosen;
      let group;
      shell(el, 'jaar', {
        body: (submit) => {
          input.addEventListener('keydown', onEnter(submit));
          input.addEventListener('input', () => { chosen = ''; group.mark(null); });
          group = choices(years, chosen, (v) => { chosen = v; input.value = ''; });
          group.box.classList.add('years');
          return h('div', {}, h('p', { class: 'muted hint' }, t.otherYear), input, h('div', { class: 'gap' }), group.box);
        },
        collect: () => {
          const value = input.value.trim() || chosen;
          if (!buildDate(value)) return t.needYear;
          draft.year = String(Number(value));
          return null;
        },
      });
    },

    maand(el) {
      const names = Array.from({ length: 12 }, (_, i) =>
        [String(i + 1), new Date(2000, i, 1).toLocaleDateString('nl-BE', { month: 'long' })]);
      shell(el, 'maand', {
        body: () => {
          const { box } = choices(names, draft.month, (v) => { draft.month = v; });
          box.classList.add('months');
          return box;
        },
        clear: () => { draft.month = ''; draft.day = ''; },
      });
    },

    dag(el) {
      const input = h('input', { type: 'number', class: 'bigfield', inputmode: 'numeric', min: 1, max: 31, value: draft.day });
      shell(el, 'dag', {
        body: (submit) => { input.addEventListener('keydown', onEnter(submit)); focusSoon(input); return input; },
        collect: () => {
          if (input.value && !buildDate(draft.year, draft.month, input.value)) return t.badDay;
          draft.day = input.value ? String(Number(input.value)) : '';
          return null;
        },
        clear: () => { draft.day = ''; },
      });
    },

    soort(el) {
      shell(el, 'soort', {
        body: () => choices(Object.entries(t.types), draft.type, (v) => { draft.type = v; }).box,
        collect: () => (draft.type ? null : t.needType),
      });
    },

    status(el) {
      shell(el, 'status', {
        body: () => choices(Object.entries(t.statuses), draft.status, (v) => { draft.status = v; }).box,
        clear: () => { draft.status = ''; },
      });
    },

    async reeks(el) {
      const existing = await listCategories();
      const input = h('input', { type: 'text', class: 'bigfield', autocomplete: 'off', placeholder: '…' });
      let chosen = draft.categoryName;
      const known = existing.find((c) => c.name.toLowerCase() === chosen.toLowerCase());
      if (known) chosen = known.name; else input.value = chosen;
      let group;
      shell(el, 'reeks', {
        body: (submit) => {
          input.addEventListener('keydown', onEnter(submit));
          input.addEventListener('input', () => { chosen = ''; group.mark(null); });
          group = choices(existing.map((c) => [c.name, c.name]), chosen, (v) => { chosen = v; input.value = ''; });
          return h('div', {}, existing.length ? group.box : null,
            h('p', { class: 'muted hint' }, existing.length ? t.newSeries : ''), input);
        },
        collect: () => { draft.categoryName = input.value.trim() || chosen; return null; },
        clear: () => { draft.categoryName = ''; },
      });
    },

    beschrijving(el) {
      const input = h('textarea', { class: 'bigfield', rows: 6 }, draft.description);
      shell(el, 'beschrijving', {
        body: () => input,
        collect: () => { draft.description = input.value.trim(); return null; },
        clear: () => { draft.description = ''; },
      });
    },

    overzicht(el) {
      const v = visible();
      const n = v.length;
      const status = h('p', { class: 'error msg' });
      const value = {
        fotos: () => (draft.files.length === 1 ? "1 foto" : `${draft.files.length} foto's`),
        titel: () => draft.title,
        jaar: () => draft.year,
        maand: () => (draft.month ? new Date(2000, draft.month - 1, 1).toLocaleDateString('nl-BE', { month: 'long' }) : ''),
        dag: () => draft.day,
        soort: () => t.types[draft.type] || '',
        status: () => t.statuses[draft.status] || '',
        reeks: () => draft.categoryName,
        beschrijving: () => draft.description,
      };
      const rows = v.filter((s) => s !== 'overzicht').map((s) => h('div', { class: 'sum-row' },
        h('div', { class: 'sum-text' },
          h('span', { class: 'muted' }, t.rowLabels[s]),
          h('strong', {}, value[s]() || t.nothing)),
        h('button', { type: 'button', class: 'big small', onclick: () => { draft.fromSummary = true; go(s); } }, t.change)));

      const save = h('button', { type: 'button', class: 'big primary' }, t.save);
      const back = h('button', { type: 'button', class: 'big', onclick: () => prev('overzicht') }, `← ${t.prev}`);
      save.addEventListener('click', async () => {
        const when = buildDate(draft.year, draft.month, draft.day);
        if (!draft.title || !when || !draft.type || (!draft.editId && !draft.files.length)) {
          status.textContent = t.error;
          return;
        }
        const fields = {
          title: draft.title, date: when.date, date_precision: when.precision, type: draft.type, status: draft.status || null,
          description: draft.description || null, categoryName: draft.categoryName,
        };
        save.disabled = back.disabled = true;
        status.className = 'muted msg';
        status.textContent = `${t.saving}…`;
        try {
          let id = draft.editId;
          if (id) await updateArtwork(id, fields);
          else id = await createArtwork(fields, draft.files, (i, total) => { status.textContent = `${t.saving} (${i}/${total})…`; });
          draft = null;
          location.replace(`#/work/${id}`);
        } catch (err) {
          console.error(err);
          save.disabled = back.disabled = false;
          status.className = 'error msg';
          status.textContent = `${t.error}: ${err.message || err}`;
        }
      });

      el.append(h('div', { class: 'wiz' },
        h('div', { class: 'wiz-top' },
          h('span', { class: 'muted' }, t.stepOf(n, n)),
          h('a', { class: 'link', href: exitUrl() }, t.stop)),
        h('div', { class: 'progress' }, h('div', { style: 'width:100%' })),
        h('h1', {}, t.q.overzicht[0]),
        h('p', { class: 'muted hint' }, t.q.overzicht[1]),
        h('div', { class: 'summary' }, rows),
        status,
        h('div', { class: 'wiz-nav' }, save, h('div', { class: 'wiz-row' }, back))));
    },
  };

  const fromWork = (a) => {
    const [y, m, d] = a.date.split('-');
    return {
      ...newDraft(), editId: a.id, title: a.title, year: y,
      month: a.date_precision === 'year' ? '' : String(Number(m)),
      day: a.date_precision === 'day' ? String(Number(d)) : '',
      type: a.type, status: a.status || '', categoryName: a.category ? a.category.name : '', description: a.description || '',
    };
  };

  Views.add = {
    async render(el, step) {
      if (!auth.loggedIn) { location.hash = '#/login'; return; }
      // No step, lost draft (page refreshed) or no photos yet: (re)start at the first question.
      if (!step || !draft || draft.editId || !STEPS[step] || (step !== 'fotos' && !draft.files.length)) {
        if (!step || !draft || draft.editId) draft = newDraft();
        if (step !== 'fotos') return go('fotos', true);
      }
      await STEPS[step](el);
    },
  };

  Views.edit = {
    async render(el, id, step) {
      if (!auth.loggedIn) { location.hash = '#/login'; return; }
      if (!step || !STEPS[step] || !draft || draft.editId !== id) {
        draft = fromWork(await getArtwork(id));
        return go('overzicht', true);
      }
      await STEPS[step](el);
    },
  };
})();
