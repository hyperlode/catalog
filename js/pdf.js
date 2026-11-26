// "Download the full catalog as PDF". Uses jsPDF (vendored in js/vendor/jspdf.js), all in the browser.
// Structure: cover, table of contents, then one chapter per category (chapter page + one page per work,
// oldest first). Works without a category go into a final chapter. Each work page has the main picture,
// up to 4 extra pictures as small thumbnails, title, date/type and description.
const PDF = (() => {
  const M = 20;          // page margin (mm)
  const W = 170;         // content width (A4 is 210 wide)
  const TOC_ROWS = 30;   // chapters per table-of-contents page

  // Load a picture and re-encode it as a JPEG data URL no larger than maxSide (keeps the PDF small).
  function loadJpeg(url, maxSide) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve({ data: c.toDataURL('image/jpeg', 0.8), w: c.width, h: c.height });
      };
      img.onerror = () => reject(new Error('Afbeelding laden mislukt'));
      img.src = url;
    });
  }

  // Scale an image to fit inside a box, keeping its proportions.
  function fit(im, boxW, boxH) {
    const s = Math.min(boxW / im.w, boxH / im.h);
    return { w: im.w * s, h: im.h * s };
  }

  async function drawPicture(doc, path, maxSide, x, y, boxW, boxH) {
    try {
      const im = await loadJpeg(publicUrl(path), maxSide);
      const s = fit(im, boxW, boxH);
      doc.addImage(im.data, 'JPEG', x + (boxW - s.w) / 2, y + (boxH - s.h) / 2, s.w, s.h);
    } catch (e) {
      // A missing picture must not abort the whole catalog.
      console.warn('PDF: picture skipped', path, e);
      doc.setDrawColor(200);
      doc.rect(x, y, boxW, boxH);
    }
  }

  // Chapters: one per category, ordered by their earliest work; no-category works last.
  function buildChapters(artworks, categories) {
    const groups = new Map();
    for (const a of artworks) {
      const key = a.category_id || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    const chapters = [...groups].map(([key, works]) => {
      works.sort((x, y) => x.date.localeCompare(y.date) || x.title.localeCompare(y.title));
      const cat = categories.find((c) => c.id === key);
      return { name: cat ? cat.name : t.otherWorks, description: cat ? cat.description : null, works, isOther: !cat };
    });
    chapters.sort((a, b) => (a.isOther - b.isOther) || a.works[0].date.localeCompare(b.works[0].date));
    return chapters;
  }

  const text = (doc, str, x, y, { size = 11, bold = false, gray = 0, align = 'left' } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(gray);
    doc.text(str, x, y, { align });
  };

  async function workPage(doc, chapterName, a) {
    doc.addPage();
    text(doc, chapterName, M, 13, { size: 9, gray: 130 });
    const imgs = a.artwork_image;
    const extra = imgs.slice(1, 5);
    const boxH = extra.length ? 160 : 190;
    if (imgs[0]) await drawPicture(doc, imgs[0].path_web, 1200, M, 22, W, boxH);
    let y = 22 + boxH + 8;
    if (extra.length) {
      const cell = 40, gap = (W - 4 * cell) / 3, top = 22 + boxH + 4;
      for (let i = 0; i < extra.length; i++) {
        await drawPicture(doc, extra[i].path_thumb, 400, M + i * (cell + gap), top, cell, 28);
      }
      y = top + 28 + 8;
    }
    const title = doc.splitTextToSize(a.title, W).slice(0, 2);
    text(doc, title, M, y + 4, { size: 16, bold: true });
    y += 4 + title.length * 7;
    text(doc, [formatDate(a.date, a.date_precision), t.types[a.type] || a.type, a.status && (t.statuses[a.status] || a.status)].filter(Boolean).join('  ·  '), M, y, { size: 10, gray: 110 });
    if (a.description) {
      y += 8;
      const lines = doc.splitTextToSize(a.description, W);
      const maxLines = Math.max(1, Math.floor((280 - y) / 5));
      const shown = lines.slice(0, maxLines);
      if (lines.length > maxLines) shown[maxLines - 1] = shown[maxLines - 1].replace(/\s*\S*$/, '') + '…';
      text(doc, shown, M, y, { size: 11 });
    }
  }

  function chapterPage(doc, ch) {
    doc.addPage();
    text(doc, ch.name, M, 110, { size: 28, bold: true });
    let y = 122;
    const years = [ch.works[0].date.slice(0, 4), ch.works[ch.works.length - 1].date.slice(0, 4)];
    const span = years[0] === years[1] ? years[0] : `${years[0]} – ${years[1]}`;
    text(doc, `${t.worksCount(ch.works.length)}  ·  ${span}`, M, y, { size: 11, gray: 110 });
    if (ch.description) {
      y += 12;
      text(doc, doc.splitTextToSize(ch.description, W), M, y, { size: 12 });
    }
  }

  // artworks must be sorted by date (any order is fine, chapters sort themselves).
  async function build(artworks, categories, onProgress = () => {}) {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const chapters = buildChapters(artworks, categories);
    const tocPages = Math.max(1, Math.ceil(chapters.length / TOC_ROWS));

    // Page numbers are known up front: cover = 1, contents next, then each chapter page followed by its works.
    let next = 2 + tocPages;
    const startPage = chapters.map((ch) => { const p = next; next += 1 + ch.works.length; return p; });

    // Cover
    text(doc, CONFIG.SITE_TITLE, 105, 120, { size: 36, bold: true, align: 'center' });
    text(doc, t.worksCount(artworks.length), 105, 134, { size: 14, gray: 110, align: 'center' });
    text(doc, new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }),
      105, 144, { size: 11, gray: 110, align: 'center' });

    // Contents
    for (let p = 0; p < tocPages; p++) {
      doc.addPage();
      if (p === 0) text(doc, t.toc, M, 30, { size: 22, bold: true });
      chapters.slice(p * TOC_ROWS, (p + 1) * TOC_ROWS).forEach((ch, i) => {
        const y = 46 + i * 8;
        text(doc, `${ch.name}  (${ch.works.length})`, M, y, { size: 12 });
        text(doc, String(startPage[p * TOC_ROWS + i]), M + W, y, { size: 12, align: 'right' });
      });
    }

    // Chapters and works, with PDF bookmarks
    let done = 0;
    for (let c = 0; c < chapters.length; c++) {
      const ch = chapters[c];
      chapterPage(doc, ch);
      const node = doc.outline ? doc.outline.add(null, ch.name, { pageNumber: startPage[c] }) : null;
      for (let w = 0; w < ch.works.length; w++) {
        await workPage(doc, ch.name, ch.works[w]);
        if (node) doc.outline.add(node, ch.works[w].title, { pageNumber: startPage[c] + 1 + w });
        onProgress(++done, artworks.length);
      }
    }

    // Page numbers (not on the cover)
    const pages = doc.getNumberOfPages();
    for (let i = 2; i <= pages; i++) {
      doc.setPage(i);
      text(doc, String(i), 105, 288, { size: 9, gray: 130, align: 'center' });
    }
    return doc;
  }

  async function download(button) {
    const label = button.textContent;
    button.disabled = true;
    try {
      const [artworks, categories] = await Promise.all([listArtworks({ ascending: true }), listCategories()]);
      if (!artworks.length) throw new Error(t.empty);
      const doc = await build(artworks, categories, (i, n) => { button.textContent = `${t.pdfBusy} ${i}/${n}…`; });
      doc.save(`catalog-${new Date().toISOString().slice(0, 10)}.pdf`);
      button.textContent = label;
    } catch (e) {
      console.error(e);
      button.textContent = `${t.error}: ${e.message || e}`;
      setTimeout(() => { button.textContent = label; }, 5000);
    } finally {
      button.disabled = false;
    }
  }

  return { build, download };
})();
