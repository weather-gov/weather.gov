const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PERF_RESULTS_DIR = path.join(ROOT_DIR, 'api-interop-layer/perf-results');
const GO_UTIL_DIR = path.join(ROOT_DIR, 'api-interop-layer/src/util/util-golang');

// Ensure output directory exists
if (!fs.existsSync(PERF_RESULTS_DIR)) {
	fs.mkdirSync(PERF_RESULTS_DIR, { recursive: true });
}

function runGoBenchmarks() {
	let goResults = [];

	try {
		console.log('Running Go benchmarks...');
		const goOutput = child_process.execSync('go test -bench=.', { cwd: GO_UTIL_DIR, encoding: 'utf8' });

		// Output format: BenchmarkName-CPUS   Iterations   Ns/Op ...
		// e.g. BenchmarkConvertProperties-10             847561              1452 ns/op

		const lines = goOutput.split('\n');
		lines.forEach(line => {
			if (line.startsWith('Benchmark')) {
				const parts = line.split(/\s+/);
				if (parts.length >= 3) {
					// Name is parts[0], remove 'Benchmark' prefix and '-N' suffix
					let name = parts[0].replace('Benchmark', '');
					const suffixIdx = name.lastIndexOf('-');
					if (suffixIdx !== -1) {
						name = name.substring(0, suffixIdx);
					}

					const nsPerOp = parseFloat(parts[2]);
					// Skip if invalid
					if (!isNaN(nsPerOp)) {
						const opsPerSec = 1000000000 / nsPerOp;
						goResults.push({
							name: name,
							mean_ns: nsPerOp,
							ops_per_sec: opsPerSec
						});
					}
				}
			}
		});
		console.log(`Parsed ${goResults.length} Go benchmark results.`);

		// Create JSON output similar to TS perf results
		const timestamp = new Date().toISOString();
		const filenameTime = timestamp.replace(/[-:]/g, '').split('.')[0].replace('T', '-');
		// e.g. 2026-02-05T06:35:01 -> 20260205-063501

		const output = {
			meta: {
				timestamp: timestamp,
				type: 'golang'
			},
			results: goResults
		};

		const outFile = path.join(PERF_RESULTS_DIR, `perf-go-${filenameTime}.json`);
		fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
		console.log(`Go benchmark results saved to ${outFile}`);

	} catch (err) {
		console.error('Error running/parsing Go benchmarks:', err.message);
		process.exit(1);
	}
}

runGoBenchmarks();
