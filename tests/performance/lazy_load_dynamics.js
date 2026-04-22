const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const locations = [
    { name: "Marquette, MI (Cached/Fast)", url: "http://localhost:8080/point/46.009/-87.870/" },
    { name: "Denver, CO (Cached/Baseline)", url: "http://localhost:8080/point/39.739/-104.984/" },
    { name: "Honolulu, HI (Uncached)", url: "http://localhost:8080/point/21.3069/-157.8583/" },
    { name: "Utqiagvik, AK (Uncached)", url: "http://localhost:8080/point/71.2906/-156.7886/" }
  ];

  console.log("Starting Lazy Load Dynamics Analysis...\n");
  console.log("| Location | TTFB / DOM | Header Load | Alerts Load | Today Load | Daily Load |");
  console.log("|---|---|---|---|---|---|");

  for (const loc of locations) {
    const start = Date.now();
    
    // 1. TTFB / DOMContentLoaded
    await page.goto(loc.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const domLoaded = Date.now() - start;

    // 2. Header
    let headerLoadedStr = "N/A";
    try {
        await page.waitForSelector('#point-header wx-loader', { state: 'hidden', timeout: 30000 });
        headerLoadedStr = `${Date.now() - start}ms`;
    } catch (e) { }

    // 3. Alerts
    let alertsLoadedStr = "N/A";
    try {
        await page.waitForSelector('#alerts wx-loader', { state: 'hidden', timeout: 30000 });
        alertsLoadedStr = `${Date.now() - start}ms`;
    } catch (e) { }

    // 4. Today
    let todayLoadedStr = "N/A";
    try {
        await page.waitForSelector('#today wx-loader', { state: 'hidden', timeout: 30000 });
        todayLoadedStr = `${Date.now() - start}ms`;
    } catch (e) { }

    // 5. Daily
    let dailyLoadedStr = "N/A";
    try {
        await page.waitForSelector('#daily wx-loader', { state: 'hidden', timeout: 30000 });
        dailyLoadedStr = `${Date.now() - start}ms`;
    } catch (e) { }

    console.log(`| **${loc.name}** | \`${domLoaded}ms\` | \`${headerLoadedStr}\` | \`${alertsLoadedStr}\` | \`${todayLoadedStr}\` | \`${dailyLoadedStr}\` |`);
  }

  await browser.close();
})();
