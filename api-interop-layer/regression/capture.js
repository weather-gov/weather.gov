import fs from 'fs';
import path from 'path';

const INTEROP_URL = 'http://localhost:8082';
const SNAPSHOT_DIR = new URL('./snapshots', import.meta.url).pathname;

if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// Ensure predictable ordering across tests
const stringifyConfig = { space: 2 };

const endpoints = [
  { name: 'health', url: '/' },
  { name: 'point_forecast', url: '/point/39.7456/-97.0892' },
  { name: 'county_data', url: '/county/01001' },
  { name: 'county_multiple', url: '/county/12023' },
  { name: 'risk_overview', url: '/risk-overview/01001' },
  { name: 'briefing_office', url: '/offices/KRNK/briefing' },
  { name: 'products_afd_versions', url: '/products/afd/versions' },
  { name: 'alerts_meta', url: '/meta/alerts' }
];

async function capture() {
  for (const ep of endpoints) {
    try {
      const resp = await fetch(`${INTEROP_URL}${ep.url}`);
      if (!resp.ok) {
        console.warn(`Warning: ${ep.url} returned status ${resp.status}`);
      }
      let data = await resp.json();
      
      // Remove heavily volatile fields from snapshoting (optional, if they vary per run)
      // e.g., timestamps if they change. Let's start with full capture.

      const outPath = path.join(SNAPSHOT_DIR, `${ep.name}.json`);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
      console.log(`Saved snapshot for ${ep.name}`);
    } catch (err) {
      console.error(`Error fetching ${ep.name}:`, err);
    }
  }
}

capture();
