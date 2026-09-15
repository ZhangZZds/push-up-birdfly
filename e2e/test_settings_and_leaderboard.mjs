import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4175;

async function clickButtonByText(page, text) {
  const handles = await page.$$('button');
  for (const h of handles) {
    const val = await page.evaluate((el) => el.textContent, h);
    if (val && val.includes(text)) {
      await h.click();
      return;
    }
  }
  throw new Error(`Button with text "${text}" not found!`);
}

async function run() {
  console.log('🚀 Starting Settings & Leaderboard E2E Test...');
  
  // Start preview server
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: '/Users/frankzhang/workspace/push-up-birdfly',
    stdio: 'pipe',
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 480, height: 850 });
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });

    console.log('1. Testing Settings Modal button...');
    await clickButtonByText(page, '设置');
    await new Promise((r) => setTimeout(r, 400));

    // Verify Settings Modal title
    const modalTitle = await page.$eval('h3', (el) => el.textContent);
    console.log(`Settings Modal Title: "${modalTitle}"`);
    if (!modalTitle.includes('设置')) throw new Error('Settings modal did not open!');

    // Close settings modal
    await clickButtonByText(page, '完成并返回游戏');
    await new Promise((r) => setTimeout(r, 400));
    console.log('✅ Settings Modal opened and closed successfully!');

    // Test Leaderboard button
    console.log('2. Testing Leaderboard Modal button...');
    await clickButtonByText(page, '排行榜');
    await new Promise((r) => setTimeout(r, 400));

    const lbTitle = await page.$eval('h3', (el) => el.textContent);
    console.log(`Leaderboard Modal Title: "${lbTitle}"`);
    if (!lbTitle.includes('排行榜')) throw new Error('Leaderboard modal did not open!');

    await clickButtonByText(page, '关闭');
    await new Promise((r) => setTimeout(r, 400));
    console.log('✅ Leaderboard Modal opened and closed successfully!');

    console.log('🎉 ALL SETTINGS & LEADERBOARD E2E TESTS PASSED!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
