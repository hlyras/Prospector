const fs = require("fs");
const path = require("path");

function getDownloadPath(type, filename) {
    // absolute path no disco
    const baseDir = path.join(process.cwd(), "public", "download", type);

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    return path.join(baseDir, filename);
}

function getPublicPath(type, filename) {
    // caminho que o front usa
    return `/download/${type}/${filename}`;
}

module.exports = { getDownloadPath, getPublicPath };