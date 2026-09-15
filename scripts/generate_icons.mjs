import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC_IMAGE_1 = '/Users/frankzhang/.gemini/antigravity/brain/3f51e8f0-b675-40e4-b496-fdcc144c51da/pushup_bird_logo_1789485564810.jpg';
const SRC_IMAGE_2 = '/Users/frankzhang/.gemini/antigravity/brain/3f51e8f0-b675-40e4-b496-fdcc144c51da/pushup_bird_icon_1789485378319.jpg';

const base64Img1 = fs.readFileSync(SRC_IMAGE_1).toString('base64');
const dataUri1 = `data:image/jpeg;base64,${base64Img1}`;

const base64Img2 = fs.readFileSync(SRC_IMAGE_2).toString('base64');
const dataUri2 = `data:image/jpeg;base64,${base64Img2}`;

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);

  console.log('Rendering high-res icons with Chrome canvas...');

  async function renderIcon({ srcUri, size, isRound = false, isSquircle = false, isAdaptiveForeground = false }) {
    return await page.evaluate(({ srcUri, size, isRound, isSquircle, isAdaptiveForeground }) => {
      return new Promise((resolve) => {
        const canvas = document.getElementById('c');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        const img = new Image();
        img.onload = () => {
          if (isAdaptiveForeground) {
            const safeScale = 0.82;
            const drawSize = size * safeScale;
            const offset = (size - drawSize) / 2;
            
            ctx.fillStyle = '#180a2c';
            ctx.fillRect(0, 0, size, size);

            ctx.drawImage(img, offset, offset, drawSize, drawSize);
          } else if (isRound) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, size, size);
            
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
            ctx.lineWidth = Math.max(2, size * 0.03);
            ctx.stroke();
            ctx.restore();
          } else if (isSquircle) {
            const r = size * 0.22;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, size, size, r);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, size, size);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = Math.max(1, size * 0.02);
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.drawImage(img, 0, 0, size, size);
          }

          resolve(canvas.toDataURL('image/png'));
        };
        img.src = srcUri;
      });
    }, { srcUri, size, isRound, isSquircle, isAdaptiveForeground });
  }

  function saveBase64Png(dataUrl, destPath) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
    console.log(`Saved: ${destPath}`);
  }

  // 1. Android Mipmap Icons
  const densities = [
    { name: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { name: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { name: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { name: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { name: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  for (const d of densities) {
    const squirclePng = await renderIcon({ srcUri: dataUri1, size: d.size, isSquircle: true });
    saveBase64Png(squirclePng, `android/app/src/main/res/${d.name}/ic_launcher.png`);

    const roundPng = await renderIcon({ srcUri: dataUri1, size: d.size, isRound: true });
    saveBase64Png(roundPng, `android/app/src/main/res/${d.name}/ic_launcher_round.png`);

    const fgPng = await renderIcon({ srcUri: dataUri1, size: d.fgSize, isAdaptiveForeground: true });
    saveBase64Png(fgPng, `android/app/src/main/res/${d.name}/ic_launcher_foreground.png`);
  }

  // 2. Web & Public Assets
  const webAssets = [
    { path: 'public/pushup_bird_logo.png', size: 512, isSquircle: false },
    { path: 'public/pushup_bird_icon.png', size: 512, isSquircle: true },
    { path: 'public/favicon.png', size: 64, isRound: true },
    { path: 'public/favicon-32x32.png', size: 32, isRound: true },
    { path: 'public/apple-touch-icon.png', size: 180, isSquircle: true },
  ];

  for (const a of webAssets) {
    const png = await renderIcon({ srcUri: dataUri1, size: a.size, isRound: a.isRound, isSquircle: a.isSquircle });
    saveBase64Png(png, a.path);
  }

  // Pushup pose asset for UI display in workout summary/modals
  const posePng = await renderIcon({ srcUri: dataUri2, size: 512, isSquircle: true });
  saveBase64Png(posePng, 'public/pushup_bird_pose.png');

  await browser.close();
  console.log('All icon generation finished successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
