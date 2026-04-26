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
  { name: "Honolulu_HI", lat: 21.3069, lon: -157.8583 },
  { name: "Utqiagvik_AK", lat: 71.2906, lon: -156.7886 }
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
  
  // ensure docs/videos exists
  const videoDir = path.join(__dirname, '..', '..', 'docs', 'videos');
  if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
  }

  for (const loc of locations) {
    const randomizedUrl = getRandomizedUrl(loc.lat, loc.lon);
    console.log(`Processing ${loc.name} at ${randomizedUrl} for branch ${branchName}...`);
    
    try {
      execSync('docker compose exec -T redis redis-cli -a ixu3N02Xp3uRPDcuZCmKIWZyNb FLUSHALL', { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.warn("Warning: Could not clear Redis cache.");
    }

    const context = await browser.newContext({
      recordVideo: {
        dir: videoDir,
        size: { width: 1280, height: 720 }
      }
    });

    const page = await context.newPage();
    
    if (branchName === 'experimental-perf') {
        await page.goto(randomizedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for Today loader to hide
        try {
            await page.waitForSelector('#today wx-loader', { state: 'hidden', timeout: 30000 });
        } catch(e) {}
        
        await page.waitForTimeout(2000);
        
        // Click Alerts if available
        const alertsBtn = await page.$('#alerts-tab-button');
        if (alertsBtn) {
            await alertsBtn.click();
            try {
                await page.waitForSelector('#alerts wx-loader', { state: 'hidden', timeout: 30000 });
            } catch(e) {}
            await page.waitForTimeout(2000);
        }
        
        // Click Daily
        const dailyBtn = await page.$('#daily-tab-button');
        if (dailyBtn) {
            await dailyBtn.click();
            try {
                await page.waitForSelector('#daily wx-loader', { state: 'hidden', timeout: 30000 });
            } catch(e) {}
            await page.waitForTimeout(2000);
        }
    } else {
        await page.goto(randomizedUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);
    }

    await page.close();
    await context.close(); // wait for video to be saved

    // Rename the video
    const files = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'));
    // Find the newest one
    files.sort((a, b) => fs.statSync(path.join(videoDir, b)).mtime.getTime() - fs.statSync(path.join(videoDir, a)).mtime.getTime());
    if (files.length > 0) {
        const latestVideo = path.join(videoDir, files[0]);
        const newName = path.join(videoDir, `${loc.name}_${branchName}.webm`);
        fs.renameSync(latestVideo, newName);
        console.log(`Saved video to ${newName}`);
    }
  }

  await browser.close();
})();
