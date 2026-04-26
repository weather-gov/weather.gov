const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const branchName = process.argv[2];
if (!branchName) {
  console.error("Please provide a branch name argument (e.g., node record_screencasts.js main)");
  process.exit(1);
}

const locations = [
  { name: "Denver_CO", lat: 39.739, lon: -104.984 },
  { name: "Seattle_WA", lat: 47.6062, lon: -122.3321 },
  { name: "Austin_TX", lat: 30.2672, lon: -97.7431 },
  { name: "Boston_MA", lat: 42.3601, lon: -71.0589 }
];

function getRandomizedUrl(baseLat, baseLon) {
  let latOffset = (Math.random() * 0.2 + 0.1);
  let lonOffset = (Math.random() * 0.2 + 0.1);
  if (baseLon > -85) lonOffset = -Math.abs(lonOffset);
  if (baseLat < 30) latOffset = Math.abs(latOffset);
  if (baseLon < -120) lonOffset = Math.abs(lonOffset);
  const lat = (baseLat + latOffset).toFixed(3);
  const lon = (baseLon + lonOffset).toFixed(3);
  return `http://localhost:8080/point/${lat}/${lon}/`;
}

(async () => {
  const browser = await chromium.launch();
  
  const videoDir = path.join(__dirname, '..', '..', 'docs', 'videos');
  if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
  }

  for (const loc of locations) {
    const randomizedUrl = getRandomizedUrl(loc.lat, loc.lon);
    
    // 1. UNCACHED RUN
    console.log(`Processing ${loc.name} (Uncached) at ${randomizedUrl} for branch ${branchName}...`);
    try {
      execSync('docker compose exec -T redis redis-cli -a ixu3N02Xp3uRPDcuZCmKIWZyNb FLUSHALL', { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.warn("Warning: Could not clear Redis cache.");
    }

    await runRecording(browser, videoDir, randomizedUrl, branchName, `${loc.name}_uncached_${branchName}.webm`);

    // 2. CACHED RUN
    console.log(`Processing ${loc.name} (Cached) at ${randomizedUrl} for branch ${branchName}...`);
    await runRecording(browser, videoDir, randomizedUrl, branchName, `${loc.name}_cached_${branchName}.webm`);
  }

  await browser.close();
})();

async function runRecording(browser, videoDir, url, branch, outputFilename) {
  const context = await browser.newContext({
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  
  // Wait 1 second before navigation to ensure browser window initializes fully and avoids blank start
  await page.waitForTimeout(1000);
  
  if (branch === 'experimental-perf') {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      try {
          await page.waitForSelector('#today wx-loader', { state: 'hidden', timeout: 30000 });
      } catch(e) {}
      
      await page.waitForTimeout(2000);
      
      const alertsBtn = await page.$('#alerts-tab-button');
      if (alertsBtn) {
          await alertsBtn.click();
          try {
              await page.waitForSelector('#alerts wx-loader', { state: 'hidden', timeout: 30000 });
          } catch(e) {}
          await page.waitForTimeout(2000);
      }
      
      const dailyBtn = await page.$('#daily-tab-button');
      if (dailyBtn) {
          await dailyBtn.click();
          try {
              await page.waitForSelector('#daily wx-loader', { state: 'hidden', timeout: 30000 });
          } catch(e) {}
          await page.waitForTimeout(2000);
      }
  } else {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(3000);
  }

  await page.close();
  await context.close(); // wait for video to be saved

  const files = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm') && !f.includes('_cached_') && !f.includes('_uncached_'));
  files.sort((a, b) => fs.statSync(path.join(videoDir, b)).mtime.getTime() - fs.statSync(path.join(videoDir, a)).mtime.getTime());
  
  if (files.length > 0) {
      const latestVideo = path.join(videoDir, files[0]);
      const newName = path.join(videoDir, outputFilename);
      fs.renameSync(latestVideo, newName);
      console.log(`Saved video to ${newName}`);
  }
}
