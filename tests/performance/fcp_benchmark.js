const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const branchName = process.argv[2];
if (!branchName) {
  console.error("Please provide a branch name argument (e.g., node fcp_benchmark.js main)");
  process.exit(1);
}

const baseLocations = [
  { name: "Near Marquette, MI", lat: 46.009, lon: -87.870 },
  { name: "Near Denver, CO", lat: 39.739, lon: -104.984 },
  { name: "Near Honolulu, HI", lat: 21.3069, lon: -157.8583 },
  { name: "Near Utqiagvik, AK", lat: 71.2906, lon: -156.7886 },
  { name: "Near Miami, FL", lat: 25.7617, lon: -80.1918 },
  { name: "Near Seattle, WA", lat: 47.6062, lon: -122.3321 },
  { name: "Near New York, NY", lat: 40.7128, lon: -74.0060 },
  { name: "Near Austin, TX", lat: 30.2672, lon: -97.7431 },
  { name: "Near Phoenix, AZ", lat: 33.4484, lon: -112.0740 },
  { name: "Near Boston, MA", lat: 42.3601, lon: -71.0589 },
  { name: "Near Chicago, IL", lat: 41.8781, lon: -87.6298 },
  { name: "Near Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { name: "Near Houston, TX", lat: 29.7604, lon: -95.3698 },
  { name: "Near Philadelphia, PA", lat: 39.9526, lon: -75.1652 },
  { name: "Near San Antonio, TX", lat: 29.4241, lon: -98.4936 },
  { name: "Near San Diego, CA", lat: 32.7157, lon: -117.1611 },
  { name: "Near Dallas, TX", lat: 32.7767, lon: -96.7970 },
  { name: "Near San Jose, CA", lat: 37.3382, lon: -121.8863 },
  { name: "Near Jacksonville, FL", lat: 30.3322, lon: -81.6557 },
  { name: "Near Indianapolis, IN", lat: 39.7684, lon: -86.1581 },
  { name: "Near San Francisco, CA", lat: 37.7749, lon: -122.4194 },
  { name: "Near Columbus, OH", lat: 39.9612, lon: -82.9988 },
  { name: "Near Charlotte, NC", lat: 35.2271, lon: -80.8431 },
  { name: "Near Detroit, MI", lat: 42.3314, lon: -83.0458 },
  { name: "Near El Paso, TX", lat: 31.7619, lon: -106.4850 },
  { name: "Near Memphis, TN", lat: 35.1495, lon: -90.0490 },
  { name: "Near Nashville, TN", lat: 36.1627, lon: -86.7816 },
  { name: "Near Baltimore, MD", lat: 39.2904, lon: -76.6122 },
  { name: "Near Milwaukee, WI", lat: 43.0389, lon: -87.9065 },
  { name: "Near Portland, OR", lat: 45.5152, lon: -122.6784 }
];

function getRandomizedUrl(baseLat, baseLon) {
  // Add a random offset between 0.1 and 0.3 degrees to hit uncached rural areas.
  let latOffset = (Math.random() * 0.2 + 0.1);
  let lonOffset = (Math.random() * 0.2 + 0.1);
  
  // Basic heuristics to stay on land for coastal cities
  if (baseLon > -85) lonOffset = -Math.abs(lonOffset); // Go West for East Coast (Miami, NY, Boston)
  if (baseLat < 30) latOffset = Math.abs(latOffset);   // Go North for South (Miami, Honolulu)
  if (baseLon < -120) lonOffset = Math.abs(lonOffset); // Go East for West Coast (Seattle)
  
  // The user requested 3 degrees of accuracy (3 decimal places) for latitude and longitude
  const lat = (baseLat + latOffset).toFixed(3);
  const lon = (baseLon + lonOffset).toFixed(3);
  return `http://localhost:8080/point/${lat}/${lon}/`;
}

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

  for (const loc of baseLocations.slice(0, 10)) {
    const randomizedUrl = getRandomizedUrl(loc.lat, loc.lon);
    console.log(`Processing ${loc.name} at ${randomizedUrl}...`);
    
    // Clear Redis for Uncached FCP
    try {
      execSync('docker compose exec redis redis-cli -a ixu3N02Xp3uRPDcuZCmKIWZyNb FLUSHALL', { stdio: 'ignore' });
      // wait a bit for cache to clear completely
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.warn("Warning: Could not clear Redis cache. Ensure the docker container is named correctly if you want accurate uncached results.");
    }

    const page = await context.newPage();
    const uncachedFCP = await getFCP(page, randomizedUrl);
    await page.close();

    // Now request again for Cached FCP
    const page2 = await context.newPage();
    const cachedFCP = await getFCP(page2, randomizedUrl);
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
