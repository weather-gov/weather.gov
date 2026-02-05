const fs = require('fs');
const path = require('path');

// Configuration: Define the structure we want to document
// hierarchy is an array of objects: { name, description, children? }
const structure = [
	{
		name: 'api-interop-layer',
		description: 'A node app which sits between the site and the API'
	},
	{
		name: 'api-proxy',
		description: 'A dev/debug tool for proxying API calls and inserting static data'
	},
	{
		name: 'docs',
		description: 'Documentation',
		children: [
			{
				name: 'architecture',
				children: [
					{ name: 'decisions', description: 'Records of why we made the decisions we did' },
					{ name: 'diagrams', description: 'Some pretty pictures' }
				]
			},
			{
				name: 'code-review-templates',
				description: "Templates to make sure things aren't forgotten during code review"
			},
			{
				name: 'dev',
				description: 'The ins-and-outs of engineering the site',
				children: [
					{ name: 'interop', description: 'Schemas and definitions' }
				]
			},
			{ name: 'environments.md' },
			{ name: 'how-we-work.md' },
			{
				name: 'product',
				children: [
					{ name: 'roadmap.md' },
					{ name: 'tagged-releases.md', description: '<-- READ THIS IF YOU NEED TO DEPLOY IN A HURRY' }
				]
			},
			{ name: 'user-types.md' },
			{ name: 'interop', description: 'API Interop Layer documentation' }
		]
	},
	{
		name: 'forecast',
		description: 'The main Django application',
		children: [
			{ name: 'backend', description: 'This is the Wagtail CMS which serves the forecast pages!' },
			{ name: 'frontend', description: 'This is the JavaScript and other client-side assets' },
			{ name: 'locale', description: 'These are message files which can be used for creating translations' },
			{ name: 'spatial', description: 'This is a Django sub-application that manages our spatial databases.' }
		]
	},
	{ name: 'justfile', description: '<-- This file runs developer commands (like a newer makefile)' },
	{ name: 'scripts', description: 'Various shell scripts to do helpful things' },
	{ name: 'spatial-data', description: 'A Node.js utility app for generating WFO maps' },
	{ name: 'terraform', description: 'This is the code for managing our infrastructure and deploying the site' }
];

const ROOT_DIR = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT_DIR, 'README.md');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');

function generateTree(nodes, prefix = '') {
	let output = '';
	nodes.forEach((node, index) => {
		const isLast = index === nodes.length - 1;
		const marker = isLast ? '└──' : '├──';
		const description = node.description ? `   └── ${node.description}` : '';
		const fullPath = path.join(ROOT_DIR, prefix, node.name); // NOTE: This logic is loose, mainly for visual structure

		output += `${prefix}${marker} ${node.name}\n`;
		if (node.description) {
			const descPrefix = isLast ? '    ' : '│   ';
			output += `${prefix}${descPrefix}└── ${node.description}\n`;
			// Add an empty line for readability if it's a major section
			if (node.children) output += `${prefix}${descPrefix}\n`;
		}

		if (node.children) {
			const childPrefix = prefix + (isLast ? '    ' : '│   ');
			output += generateTree(node.children, childPrefix);
		}
	});
	return output;
}

function updateReadme() {
	try {
		const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
		const version = packageJson.version;
		const date = new Date().toISOString().split('T')[0];

		let readmeContent = fs.readFileSync(README_PATH, 'utf8');

		const startMarker = '## Code organization';
		const endMarker = '## Historical Note'; // Or next major section

		const tree = generateTree(structure);

		const newContent = `${startMarker}

> Last updated: ${date}
> Version: ${version}

This overview will likely become outdated, but it may help to orient you to the project.

\`\`\`
.
${tree}\`\`\`

`;

		// Regex to match the section. 
		// We look for ## Code organization, followed by anything until the next ## Section or End of file
		// But to be safe, we'll try to match strictly if possible.
		// Given the file structure, we can look for the specific start header.

		const lines = readmeContent.split('\n');
		let startIndex = -1;
		let endIndex = -1;

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === '## Code organization') {
				startIndex = i;
			}
			if (startIndex !== -1 && i > startIndex && lines[i].startsWith('## ')) {
				endIndex = i;
				break;
			}
		}

		if (startIndex === -1) {
			console.error('Could not find "## Code organization" section in README.md');
			return;
		}

		const pre = lines.slice(0, startIndex).join('\n');
		const post = endIndex !== -1 ? lines.slice(endIndex).join('\n') : '';

		const finalOutput = `${pre}\n${newContent}${post}`;

		fs.writeFileSync(README_PATH, finalOutput);
		console.log('README.md updated successfully.');

	} catch (err) {
		console.error('Error updating README:', err);
		// Don't exit process so we can continue to other updates
	}
}

const child_process = require('child_process');

function updatePerfDocs() {
	const PERF_RESULTS_DIR = path.join(ROOT_DIR, 'api-interop-layer/perf-results');
	const GO_UTIL_DIR = path.join(ROOT_DIR, 'api-interop-layer/src/util/util-golang');
	const DOCS_INDEX_PATH = path.join(ROOT_DIR, 'docs/interop/index.md');

	let tsResults = [];
	let goResults = [];

	// 1. Get TS Results
	try {
		if (fs.existsSync(PERF_RESULTS_DIR)) {
			const files = fs.readdirSync(PERF_RESULTS_DIR)
				.filter(f => f.startsWith('perf-') && f.endsWith('.json'))
				.sort().reverse();

			if (files.length > 0) {
				const latestFile = path.join(PERF_RESULTS_DIR, files[0]);
				const perfData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
				tsResults = perfData.results;
				console.log(`Loaded TS perf results from ${path.basename(latestFile)}`);
			} else {
				console.warn('No TS perf results found.');
			}
		} else {
			console.warn('Perf results directory not found.');
		}
	} catch (err) {
		console.error('Error reading TS perf results:', err);
	}

	// 2. Run and Parse Go Benchmarks
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

	} catch (err) {
		console.warn('Error running/parsing Go benchmarks (Go might not be installed or code invalid):', err.message);
	}

	// 3. Merge and Generate Table
	if (tsResults.length === 0 && goResults.length === 0) {
		console.warn('No performance data available from TS or Go.');
		return;
	}

	// Map by function name for comparison
	const mergedData = {};

	tsResults.forEach(r => {
		if (!mergedData[r.name]) mergedData[r.name] = { name: r.name };
		mergedData[r.name].ts_mean = r.mean_ns;
		mergedData[r.name].ts_ops = r.ops_per_sec;
	});

	goResults.forEach(r => {
		if (!mergedData[r.name]) mergedData[r.name] = { name: r.name };
		mergedData[r.name].go_mean = r.mean_ns;
		mergedData[r.name].go_ops = r.ops_per_sec;
	});

	const fmt = (n) => n ? Math.round(n).toLocaleString() : '-';

	// Header
	let table = '| Function | TS Mean (ns) | TS Ops/Sec | Go Mean (ns) | Go Ops/Sec |\n';
	table += '| :--- | :--- | :--- | :--- | :--- |\n';

	// Rows
	Object.values(mergedData).sort((a, b) => a.name.localeCompare(b.name)).forEach(row => {
		table += `| \`${row.name}\` | ${fmt(row.ts_mean)} | ${fmt(row.ts_ops)} | ${fmt(row.go_mean)} | ${fmt(row.go_ops)} |\n`;
	});

	try {
		let content = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');

		// Match section: ### Performance Results ... (table) ... (end of section or file)
		const sectionHeader = '### Performance Results';
		const lines = content.split('\n');
		let startIndex = -1;
		let endIndex = -1;

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === sectionHeader) {
				startIndex = i;
			}
			// Stop at next H3, H2 or H1
			if (startIndex !== -1 && i > startIndex && (lines[i].startsWith('### ') || lines[i].startsWith('## ') || lines[i].startsWith('# '))) {
				endIndex = i;
				break;
			}
		}

		if (startIndex === -1) {
			console.warn('Could not find "### Performance Results" section in docs/interop/index.md');
			return;
		}

		const pre = lines.slice(0, startIndex + 1).join('\n'); // Include header
		const post = endIndex !== -1 ? lines.slice(endIndex).join('\n') : '';

		const newSectionContent = `
> Last Updated: ${new Date().toISOString().split('T')[0]}

The following benchmarks compare the performance of critical utility functions in the TypeScript implementation versus the experimental Golang implementation.

${table}

`;
		const finalOutput = `${pre}${newSectionContent}${post}`;
		fs.writeFileSync(DOCS_INDEX_PATH, finalOutput);
		console.log('docs/interop/index.md Performance Results updated successfully.');

	} catch (err) {
		console.error('Error updating Perf docs file:', err);
	}
}

updatePerfDocs();
