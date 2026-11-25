Views.login = (() => {
// The single account is created by hand in the Supabase dashboard (sign-ups are disabled there).

async function render(el) {
  const email = h('input', { type: 'email', required: true, autocomplete: 'username' });
  const password = h('input', { type: 'password', required: true, autocomplete: 'current-password' });
  const status = h('p', { class: 'error' });
  const form = h('form', {},
    h('label', { class: 'field' }, h('span', {}, t.email), email),
    h('label', { class: 'field' }, h('span', {}, t.password), password),
    status,
    h('button', { type: 'submit', class: 'primary' }, t.login));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({ email: email.value, password: password.value });
    if (error) status.textContent = error.message;
    else location.hash = '#/';
  });
  el.append(h('h1', {}, t.login), form);
}

return { render };
})();
