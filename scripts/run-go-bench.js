const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PERF_RESULTS_DIR = path.join(ROOT_DIR, 'api-interop-layer/perf-results');
// New location is at root of api-interop-layer, so adjust paths
// script is at /scripts/run-go-bench.js
// pkg is at /api-interop-layer/pkg
const BASE_PKG_DIR = path.join(ROOT_DIR, 'api-interop-layer/pkg/weather');
const DATA_PKG_DIR = path.join(ROOT_DIR, 'api-interop-layer/pkg/weather/data');

// Ensure output directory exists
if (!fs.existsSync(PERF_RESULTS_DIR)) {
	fs.mkdirSync(PERF_RESULTS_DIR, { recursive: true });
}

function runBenchmarksForDir(dirPath) {
	try {
		console.log(`Running Go benchmarks in ${dirPath}...`);
		// Use -benchmem to see allocs if needed, but for now just basic bench
		const output = child_process.execSync('go test -bench=. -benchmem', { cwd: dirPath, encoding: 'utf8' });
		return parseGoOutput(output);
	} catch (e) {
		console.error(`Failed to run benchmarks in ${dirPath}: ${e.message}`);
		return [];
	}
}

function parseGoOutput(goOutput) {
	const results = [];
	const lines = goOutput.split('\n');

	lines.forEach(line => {
		if (line.startsWith('Benchmark')) {
			const parts = line.split(/\s+/);
			// Format: BenchmarkName-8 10000 1234 ns/op ...
			// parts[0] = Name
			// parts[1] = Iterations
			// parts[2] = ns/op
			if (parts.length >= 4) {
				let name = parts[0].replace('Benchmark', '');
				// Remove -N suffix
				const suffixIdx = name.lastIndexOf('-');
				if (suffixIdx !== -1) {
					name = name.substring(0, suffixIdx);
				}

				const nsPerOp = parseFloat(parts[2]);
				if (!isNaN(nsPerOp)) {
					const opsPerSec = 1000000000 / nsPerOp;
					results.push({
						name: name,
						mean_ns: nsPerOp,
						ops_per_sec: opsPerSec
					});
				}
			}
		}
	});
	return results;
}

function runGoBenchmarks() {
	let allResults = [];

	// Run in main pkg
	allResults = allResults.concat(runBenchmarksForDir(BASE_PKG_DIR));
	// Run in data subpkg
	allResults = allResults.concat(runBenchmarksForDir(DATA_PKG_DIR));
	console.log(`Parsed ${allResults.length} Go benchmark results.`);

	// Create JSON output similar to TS perf results
	const timestamp = new Date().toISOString();
	const filenameTime = timestamp.replace(/[-:]/g, '').split('.')[0].replace('T', '-');
	// e.g. 2026-02-05T06:35:01 -> 20260205-063501

	const output = {
		meta: {
			timestamp: timestamp,
			type: 'golang'
		},
		results: allResults
	};

	const outFile = path.join(PERF_RESULTS_DIR, `perf-go-${filenameTime}.json`);
	fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
	console.log(`Go benchmark results saved to ${outFile}`);
}

try {
	runGoBenchmarks();
} catch (err) {
	console.error('Error running/parsing Go benchmarks:', err.message);
	process.exit(1);
}
