const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'fcp_results_main.json');
const lazyPath = path.join(__dirname, 'fcp_results_experimental-perf.json');

if (!fs.existsSync(mainPath) || !fs.existsSync(lazyPath)) {
  console.error("Missing result files. Please run the benchmark for both 'main' and 'lazy-load' first.");
  process.exit(1);
}

const mainResults = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
const lazyResults = JSON.parse(fs.readFileSync(lazyPath, 'utf8'));

console.log(`| Location | Main FCP (Uncached) | Main FCP (Cached) | Lazy Load FCP (Uncached) | Lazy Load FCP (Cached) |`);
console.log(`|---|---|---|---|---|`);

for (let i = 0; i < mainResults.length; i++) {
  const m = mainResults[i];
  const l = lazyResults[i];
  
  if (l) {
    console.log(`| **${m.location}** | ${(m.uncachedFCP/1000).toFixed(2)}s | ${(m.cachedFCP/1000).toFixed(2)}s | ${(l.uncachedFCP/1000).toFixed(2)}s | ${(l.cachedFCP/1000).toFixed(2)}s |`);
  }
}
