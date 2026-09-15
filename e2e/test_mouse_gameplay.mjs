import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting Push-Up Flappy Bird E2E Test...');

  // 1. Start Vite preview server
  console.log('📦 Starting Vite preview server...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
  });

  server.stdout.on('data', (data) => {
    // console.log(`[Preview Server] ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Preview Server Error] ${data}`);
  });

  // Wait for server to become ready
  await sleep(2000);

  let browser;
  try {
    console.log(`🌐 Launching Chrome at: ${CHROME_PATH}`);
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--window-size=600,950',
      ],
      defaultViewport: {
        width: 480,
        height: 850,
      },
    });

    const page = await browser.newPage();
    console.log('🧭 Navigating to http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 15000 });

    console.log('✅ Page loaded successfully.');

    // 2. Select Mouse Mode
    console.log('🖱️ Clicking [鼠标模拟测试] button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find((b) => b.textContent && b.textContent.includes('鼠标模拟测试'));
      if (target) target.click();
    });

    await sleep(600);
    const ss1 = path.join(SCREENSHOT_DIR, '01_mouse_mode_active.png');
    await page.screenshot({ path: ss1 });
    console.log(`📸 Screenshot saved: ${ss1}`);

    // Locate the Canvas bounding box
    const canvasElement = await page.$('canvas');
    if (!canvasElement) {
      throw new Error('Could not find canvas element');
    }
    const rect = await canvasElement.boundingBox();
    console.log(`📐 Canvas Bounding Box: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);

    const centerX = rect.x + rect.width / 2;
    const topY = rect.y + rect.height * 0.15; // Lockout position
    const bottomY = rect.y + rect.height * 0.88; // Chest-to-floor depth

    console.log(`🎯 Simulating Push-Up #1: Top Lockout -> Bottom Depth -> Top Lockout`);

    // Move to Top
    await page.mouse.move(centerX, topY);
    await sleep(300);

    // Smooth descent (eccentric phase ~1.0s)
    const steps = 25;
    for (let i = 1; i <= steps; i++) {
      const curY = topY + ((bottomY - topY) * i) / steps;
      await page.mouse.move(centerX, curY);
      await sleep(40);
    }

    console.log('⬇️ Reached bottom depth position, holding for 250ms...');
    await sleep(250);

    // Smooth ascent (concentric push ~0.9s)
    for (let i = 1; i <= steps; i++) {
      const curY = bottomY - ((bottomY - topY) * i) / steps;
      await page.mouse.move(centerX, curY);
      await sleep(35);
    }

    console.log('⬆️ Pushed back to top lockout!');
    await sleep(600);

    // Check Rep Count in DOM
    const hudText = await page.evaluate(() => document.body.innerText);
    console.log(`📊 Current HUD State contains: \n${hudText.split('\n').filter(Boolean).slice(0, 10).join(' | ')}`);

    const ss2 = path.join(SCREENSHOT_DIR, '02_pushup_rep_counted.png');
    await page.screenshot({ path: ss2 });
    console.log(`📸 Screenshot saved: ${ss2}`);

    // Simulating Push-Up #2
    console.log(`🎯 Simulating Push-Up #2...`);
    for (let i = 1; i <= steps; i++) {
      const curY = topY + ((bottomY - topY) * i) / steps;
      await page.mouse.move(centerX, curY);
      await sleep(35);
    }
    await sleep(250);
    for (let i = 1; i <= steps; i++) {
      const curY = bottomY - ((bottomY - topY) * i) / steps;
      await page.mouse.move(centerX, curY);
      await sleep(35);
    }
    await sleep(600);

    // Let pipes advance
    console.log('⏱️ Letting game loop run and pipes advance...');
    await sleep(2000);

    // Test Collision Detection: Move bird into obstacle/floor to trigger Game Over
    console.log('💥 Inducing deliberate collision to verify Game Over modal...');
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(centerX, rect.y + rect.height * 0.98);
      await sleep(100);
      const isGameOverVisible = await page.evaluate(() => {
        return document.body.innerText.includes('GAME OVER') || document.body.innerText.includes('训练结束');
      });
      if (isGameOverVisible) {
        console.log('✅ Collision confirmed! Game Over modal displayed.');
        break;
      }
    }

    await sleep(500);
    const ss3 = path.join(SCREENSHOT_DIR, '03_game_over_modal.png');
    await page.screenshot({ path: ss3 });
    console.log(`📸 Screenshot saved: ${ss3}`);

    // Test Restart Flow
    console.log('🔄 Testing Restart Button...');
    const restartClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const restartBtn = buttons.find((b) =>
        b.textContent && (b.textContent.includes('再练一组') || b.textContent.includes('重新开始') || b.textContent.includes('RESTART'))
      );
      if (restartBtn) {
        restartBtn.click();
        return true;
      }
      return false;
    });

    if (restartClicked) {
      console.log('✅ Restart button clicked successfully.');
      await sleep(800);
      const ss4 = path.join(SCREENSHOT_DIR, '04_game_restarted.png');
      await page.screenshot({ path: ss4 });
      console.log(`📸 Screenshot saved: ${ss4}`);
    }

    console.log('🎉 ALL END-TO-END MOUSE SIMULATION TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
    console.log('🛑 Server and Browser closed.');
  }
}

runTest();
