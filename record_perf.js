const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: {
      dir: path.join(__dirname, 'docs'),
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  
  try {
    // Navigate to a point forecast (e.g. Denver, CO)
    await page.goto('http://localhost:8080/point/39.739/-104.990/', { waitUntil: 'networkidle' });
    
    // Wait for the components to lazy-load
    await page.waitForSelector('wx-daily-forecast', { timeout: 10000 });
    
    // Simulate user waiting and clicking tabs
    await page.waitForTimeout(3000);
    
    const dailyTab = await page.$('button[data-tab-name="daily"]');
    if (dailyTab) {
      await dailyTab.click();
      await page.waitForTimeout(2000);
    }
    
    console.log('Video recording successfully completed.');
  } catch (err) {
    console.error('Error during playwright recording:', err);
  } finally {
    const videoPath = await page.video().path();
    console.log(`Saved video to: ${videoPath}`);
    
    const fs = require('fs');
    fs.renameSync(videoPath, path.join(__dirname, 'docs', 'experimental_perf_forecast.webm'));
    console.log('Renamed video to docs/experimental_perf_forecast.webm');

    await context.close();
    await browser.close();
  }
})();
