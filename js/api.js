// All database and storage access lives here.

// crypto.randomUUID only exists in secure contexts (https/localhost); over plain http (or older phones) it is
// missing, so fall back to building a v4 UUID from getRandomValues.
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = [...b].map((v) => v.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const SELECT = '*, category(id, name, description), artwork_image(*)';
const byPosition = (a, b) => a.position - b.position;

function tidy(a) {
  a.artwork_image = (a.artwork_image || []).sort(byPosition);
  return a;
}

function check({ data, error }) {
  if (error) throw error;
  return data;
}

async function listArtworks({ categoryId, ascending = false } = {}) {
  if (!isConfigured) return Demo.listArtworks({ categoryId, ascending });
  let q = db.from('artwork').select(SELECT).order('date', { ascending });
  if (categoryId) q = q.eq('category_id', categoryId);
  return check(await q).map(tidy);
}

async function getArtwork(id) {
  if (!isConfigured) return Demo.getArtwork(id);
  return tidy(check(await db.from('artwork').select(SELECT).eq('id', id).single()));
}

async function listCategories() {
  if (!isConfigured) return Demo.listCategories();
  return check(await db.from('category').select('*').order('name'));
}

// All type values in use (the 4 built-in keys and any custom ones the user typed), without duplicates.
async function listTypes() {
  if (!isConfigured) return Demo.listTypes();
  return [...new Set(check(await db.from('artwork').select('type')).map((r) => r.type))];
}

async function getCategory(id) {
  if (!isConfigured) return Demo.getCategory(id);
  return check(await db.from('category').select('*').eq('id', id).single());
}

// Empty name -> null (no category). Existing name (case-insensitive) is reused, otherwise created.
async function findOrCreateCategory(name) {
  name = name.trim();
  if (!name) return null;
  const existing = (await listCategories()).find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  return check(await db.from('category').insert({ name }).select('id').single()).id;
}

async function upload(path, blob, contentType) {
  const { error } = await db.storage.from(CONFIG.BUCKET).upload(path, blob, {
    contentType: contentType || 'application/octet-stream',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
}

// fields: { title, date, date_precision, type, description, categoryName }
async function createArtwork(fields, files, onProgress = () => {}) {
  if (!isConfigured) return Demo.createArtwork(fields, files, onProgress);
  const id = uuid();
  const { categoryName, ...rest } = fields;
  const category_id = await findOrCreateCategory(categoryName);
  check(await db.from('artwork').insert({ id, category_id, ...rest }));

  const uploaded = [];
  try {
    for (let i = 0; i < files.length; i++) {
      onProgress(i + 1, files.length);
      const file = files[i];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const paths = {
        path_original: `${id}/${i}-original.${ext}`,
        path_web: `${id}/${i}-web.jpg`,
        path_thumb: `${id}/${i}-thumb.jpg`,
      };
      const [web, thumb] = await Promise.all([resizeToJpeg(file, 1600), resizeToJpeg(file, 480)]);
      await upload(paths.path_original, file, file.type);
      uploaded.push(paths.path_original);
      await upload(paths.path_web, web, 'image/jpeg');
      uploaded.push(paths.path_web);
      await upload(paths.path_thumb, thumb, 'image/jpeg');
      uploaded.push(paths.path_thumb);
      check(await db.from('artwork_image').insert({
        artwork_id: id, position: i, original_filename: file.name, ...paths,
      }));
    }
  } catch (e) {
    // Roll back so a failed upload does not leave a half-saved record.
    if (uploaded.length) await db.storage.from(CONFIG.BUCKET).remove(uploaded);
    await db.from('artwork').delete().eq('id', id);
    throw e;
  }
  return id;
}

async function updateArtwork(id, fields) {
  if (!isConfigured) return Demo.updateArtwork(id, fields);
  const { categoryName, ...rest } = fields;
  const category_id = await findOrCreateCategory(categoryName);
  check(await db.from('artwork').update({ category_id, ...rest }).eq('id', id));
}

async function deleteArtwork(artwork) {
  if (!isConfigured) return Demo.deleteArtwork(artwork);
  const paths = artwork.artwork_image.flatMap((i) => [i.path_original, i.path_web, i.path_thumb]);
  if (paths.length) check(await db.storage.from(CONFIG.BUCKET).remove(paths));
  check(await db.from('artwork').delete().eq('id', artwork.id));
}
