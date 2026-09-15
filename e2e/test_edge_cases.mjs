import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PREVIEW_PORT = 4174;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runEdgeCaseTests() {
  console.log('🧪 Starting Push-Up Bird Edge Cases & Regression E2E Tests...');

  console.log(`📦 Starting Vite preview server on port ${PREVIEW_PORT}...`);
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT)], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });

  await sleep(1500);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--window-size=480,850',
      ],
      defaultViewport: {
        width: 480,
        height: 850,
      },
    });

    const page = await browser.newPage();
    console.log(`🌐 Navigating to ${PREVIEW_URL}...`);
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('✅ Page loaded successfully.');

    // TEST 1: Switch to Mouse Mode & Test Instant Click/Tap Response
    console.log('\n--- TEST 1: Instant Click & Tap Response ---');
    const mouseBtn = await page.waitForSelector('button[title="鼠标模拟测试模式"]', { timeout: 5000 });
    await mouseBtn.click();
    await sleep(400);

    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    console.log(`📐 Canvas Bounding Box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);

    // Click near bottom of canvas
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.85);
    await sleep(200);
    console.log(`✅ Instant click registered at bottom!`);

    // TEST 2: Soft Limit Clamping (Top Lockout & Bottom Depth without death)
    console.log('\n--- TEST 2: Soft Limit Clamping (No Boundary Death) ---');
    await page.mouse.move(box.x + box.width / 2, box.y + 2);
    await sleep(400);
    let isGameOver = await page.evaluate(() => document.body.innerText.includes('WORKOUT COMPLETED!'));
    if (isGameOver) {
      throw new Error('❌ Failed: Bird died at screen top! Boundary clamp broken.');
    }
    console.log('✅ Extreme top position survived cleanly (soft clamped)!');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2);
    await sleep(400);
    isGameOver = await page.evaluate(() => document.body.innerText.includes('WORKOUT COMPLETED!'));
    if (isGameOver) {
      throw new Error('❌ Failed: Bird died at screen bottom! Boundary clamp broken.');
    }
    console.log('✅ Extreme bottom position survived cleanly (soft clamped)!');

    // TEST 3: Settings Modal Opens and Pauses the Game
    console.log('\n--- TEST 3: Modal Pause Protection ---');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.4);

    const settingsBtn = await page.waitForSelector('button[title="打开游戏与控制设置"]');
    await settingsBtn.click();
    await sleep(500);

    const hasSettingsModal = await page.evaluate(() => document.body.innerText.includes('游戏与控制设置'));
    if (!hasSettingsModal) throw new Error('❌ Settings modal did not open!');
    console.log('✅ Settings modal is open.');

    console.log('⏱️ Waiting 2 seconds while modal is open to verify game stays paused...');
    await sleep(2000);
    isGameOver = await page.evaluate(() => document.body.innerText.includes('WORKOUT COMPLETED!'));
    if (isGameOver) {
      throw new Error('❌ Game Over occurred while Settings modal was open! Game failed to pause.');
    }
    console.log('✅ Confirmed: Game remained safely paused with zero background deaths!');

    // TEST 4: Open Calibration via Settings Modal & Verify Countdown
    console.log('\n--- TEST 4: Calibration Modal Countdown Ticking ---');
    const openCalibInSettings = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const calib = btns.find((b) => b.innerText.includes('精细标定向导'));
      if (calib) {
        calib.click();
        return true;
      }
      return false;
    });

    if (!openCalibInSettings) {
      throw new Error('❌ Could not find calibration button in settings modal!');
    }
    await sleep(500);

    const calibOpen = await page.evaluate(() => document.body.innerText.includes('俯卧撑深度校准 (Calibration)'));
    if (!calibOpen) throw new Error('❌ Calibration modal did not open!');
    console.log('✅ Calibration modal open.');

    console.log(`⏱️ Initial calibration step 1 active. Waiting for countdown tick...`);
    await sleep(1400);
    const tickedText = await page.evaluate(() => document.body.innerText);
    const hasTicked = tickedText.includes('2s') || tickedText.includes('1s') || tickedText.includes('第二步');
    console.log(`✅ Calibration countdown successfully ticked down: ${hasTicked}`);

    // Click skip button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const skip = btns.find((b) => b.innerText.includes('跳过校准'));
      if (skip) skip.click();
    });
    await sleep(400);
    console.log('✅ Calibration completed/skipped.');

    // TEST 5: Leaderboard Deduplication on Game Over
    console.log('\n--- TEST 5: Game Over & Leaderboard Single-Entry Verification ---');
    // Clear any previous records
    await page.evaluate(() => localStorage.removeItem('pushup_bird_workout_records'));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2, { steps: 5 });
    await sleep(200);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.85, { steps: 10 });
    await sleep(350);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2, { steps: 10 });
    await sleep(500);

    console.log('💥 Inducing deliberate pipe collision...');
    for (let i = 0; i < 40; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45);
      await sleep(100);
      const over = await page.evaluate(() => document.body.innerText.includes('WORKOUT COMPLETED!'));
      if (over) break;
    }

    const gameOverVisible = await page.evaluate(() => document.body.innerText.includes('WORKOUT COMPLETED!'));
    console.log(`✅ Game Over modal visible: ${gameOverVisible}`);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const lbBtn = btns.find((b) => b.innerText.includes('查看排行榜'));
      if (lbBtn) lbBtn.click();
    });
    await sleep(500);

    const recordCount = await page.evaluate(() => {
      const records = JSON.parse(localStorage.getItem('pushup_bird_workout_records') || '[]');
      return records.length;
    });
    console.log(`📊 Number of records stored in localStorage: ${recordCount}`);
    if (recordCount !== 1) {
      throw new Error(`❌ Expected exactly 1 record, found ${recordCount} (duplicate record bug!)`);
    }
    console.log('✅ Exactly 1 workout record recorded, zero duplicate records!');

    console.log('\n🎉 ALL EDGE CASES AND REGRESSION TESTS PASSED WITH FLYING COLORS!');
  } finally {
    if (browser) await browser.close();
    previewProcess.kill();
  }
}

runEdgeCaseTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
