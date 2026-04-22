const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const branchName = process.argv[2];
if (!branchName) {
  console.error("Please provide a branch name argument (e.g., node fcp_benchmark.js main)");
  process.exit(1);
}

const locations = [
  { name: "Marquette, MI", url: "http://localhost:8080/point/46.009/-87.870/" },
  { name: "Denver, CO", url: "http://localhost:8080/point/39.739/-104.984/" },
  { name: "Honolulu, HI", url: "http://localhost:8080/point/21.3069/-157.8583/" },
  { name: "Utqiagvik, AK", url: "http://localhost:8080/point/71.2906/-156.7886/" },
  { name: "Miami, FL", url: "http://localhost:8080/point/25.7617/-80.1918/" },
  { name: "Seattle, WA", url: "http://localhost:8080/point/47.6062/-122.3321/" },
  { name: "New York, NY", url: "http://localhost:8080/point/40.7128/-74.0060/" },
  { name: "Austin, TX", url: "http://localhost:8080/point/30.2672/-97.7431/" },
  { name: "Phoenix, AZ", url: "http://localhost:8080/point/33.4484/-112.0740/" },
  { name: "Boston, MA", url: "http://localhost:8080/point/42.3601/-71.0589/" }
];

async function getFCP(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const fcp = await page.evaluate(() => {
    return new Promise(resolve => {
      const entries = performance.getEntriesByName('first-contentful-paint');
      if (entries.length > 0) {
        return resolve(entries[0].startTime);
      }
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            observer.disconnect();
            resolve(entry.startTime);
          }
        }
      });
      observer.observe({ type: 'paint', buffered: true });
    });
  });
  return fcp;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const results = [];

  console.log(`Starting FCP Benchmark for branch: ${branchName}...\n`);

  for (const loc of locations) {
    console.log(`Processing ${loc.name}...`);
    
    // Clear Redis for Uncached FCP
    try {
      execSync('docker compose exec redis redis-cli -a ixu3N02Xp3uRPDcuZCmKIWZyNb FLUSHALL', { stdio: 'ignore' });
      // wait a bit for cache to clear completely
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.warn("Warning: Could not clear Redis cache. Ensure the docker container is named correctly if you want accurate uncached results.");
    }

    const page = await context.newPage();
    const uncachedFCP = await getFCP(page, loc.url);
    await page.close();

    // Now request again for Cached FCP
    const page2 = await context.newPage();
    const cachedFCP = await getFCP(page2, loc.url);
    await page2.close();

    results.push({
      location: loc.name,
      uncachedFCP: Math.round(uncachedFCP),
      cachedFCP: Math.round(cachedFCP)
    });
    console.log(`  Uncached FCP: ${Math.round(uncachedFCP)}ms, Cached FCP: ${Math.round(cachedFCP)}ms`);
  }

  await browser.close();

  const outputPath = path.join(__dirname, `fcp_results_${branchName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
})();
