// Client-side resize: phone photos are huge, so the web/thumbnail versions are derived in the browser.
// The untouched original is uploaded separately and is the durable copy.
async function resizeToJpeg(file, maxSide, quality = 0.85) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  if (bmp.close) bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Afbeelding verkleinen mislukt'))), 'image/jpeg', quality));
}
