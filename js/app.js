// Entry point: header, floating Add button and a tiny hash router (#/...).
// Hash routing means GitHub Pages never needs to rewrite URLs, so refresh always works.
// Everything is classic <script> files (no ES modules), so index.html also works opened straight from disk.

const routes = [
  [/^\/?$/, () => Views.timeline],
  [/^\/category\/([^/]+)$/, () => Views.category],
  [/^\/work\/([^/]+)$/, () => Views.work],
  [/^\/add(?:\/([a-z]+))?$/, () => Views.add],
  [/^\/edit\/([^/]+)(?:\/([a-z]+))?$/, () => Views.edit],
  [/^\/login$/, () => Views.login],
];

function renderChrome() {
  document.getElementById('header').replaceChildren(
    h('a', { class: 'site-title', href: '#/' }, CONFIG.SITE_TITLE),
    !isConfigured
      ? h('span', { class: 'demo' }, t.demo)
      : auth.loggedIn
      ? h('button', { class: 'link', onclick: () => db.auth.signOut() }, t.logout)
      : h('a', { class: 'link', href: '#/login' }, t.login),
  );
  fill(document.getElementById('fab'),
    auth.loggedIn ? h('a', { class: 'fab', href: '#/add' }, '+ ', t.add) : null);
}

let token = 0;
async function render() {
  const my = ++token;
  const app = document.getElementById('app');
  const path = location.hash.slice(1) || '/';
  // No floating Add button inside the add/edit wizard (tapping it would restart the form).
  document.getElementById('fab').hidden = /^\/(add|edit)/.test(path);
  for (const [re, view] of routes) {
    const m = path.match(re);
    if (!m) continue;
    app.replaceChildren(h('p', { class: 'muted' }, t.loading));
    const content = h('div');
    try {
      await view().render(content, ...m.slice(1).map((x) => (x === undefined ? undefined : decodeURIComponent(x))));
    } catch (e) {
      console.error(e);
      content.replaceChildren(h('p', { class: 'error' }, `${t.error}: ${e.message || e}`));
    }
    if (my === token) {
      app.replaceChildren(content);
      window.scrollTo(0, 0);
    }
    return;
  }
  app.replaceChildren(h('p', {}, t.notFound));
}

async function init() {
  if (!isConfigured) {
    // Demo mode: pretend to be logged in so Add/Edit/Delete can be tried. Nothing is saved.
    auth.loggedIn = true;
    renderChrome();
    window.addEventListener('hashchange', render);
    render();
    return;
  }
  renderChrome();
  const { data } = await db.auth.getSession();
  auth.loggedIn = !!data.session;
  renderChrome();
  db.auth.onAuthStateChange((_event, session) => {
    const was = auth.loggedIn;
    auth.loggedIn = !!session;
    if (was !== auth.loggedIn) {
      renderChrome();
      render();
    }
  });
  window.addEventListener('hashchange', render);
  render();
}

init();
