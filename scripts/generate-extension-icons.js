const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, '..', 'chrome-extension', 'learnspacelogo.svg');
const outDir = path.join(__dirname, '..', 'chrome-extension');

const svgBuffer = fs.readFileSync(svgPath);

Promise.all(
  sizes.map((size) =>
    sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon${size}.png`))
  )
)
  .then(() => console.log('Extension icons generated: icon16.png, icon32.png, icon48.png, icon128.png'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
