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
		process.exit(1);
	}
}

updateReadme();
