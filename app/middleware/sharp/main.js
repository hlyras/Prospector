const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function compressImage(file) {
  const timestamp = Date.now();
  const dir = path.dirname(file.path);
  const newFileName = `logo_${timestamp}.webp`;
  const webpPath = path.join(dir, newFileName);

  try {
    const metadata = await sharp(file.path, { failOnError: false }).metadata();

    if (metadata.format === 'webp' || metadata.format === 'gif') {
      return file.path;
    }

    await sharp(file.path, { failOnError: false })
      .rotate()
      .webp({ lossless: true }) // 👈 compressão sem perda
      .toFile(webpPath);

    fs.unlinkSync(file.path);

    return webpPath;
  } catch (err) {
    console.error('Erro ao converter para WEBP:', err.message);
    return file.path;
  }
}

module.exports = { compressImage };