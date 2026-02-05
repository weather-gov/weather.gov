const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const MAIN_BRANCH = 'main'; // Or 'origin/main'
const OUTPUT_PREFIX = 'docs/CHANGELOG-';

try {
	// 1. Get the current commit hash (short)
	const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
	const outputFile = `${OUTPUT_PREFIX}${commitHash}.md`;

	console.log(`Generating changelog for ref: ${commitHash} relative to ${MAIN_BRANCH}...`);

	// 2. Find the common ancestor
	const mergeBase = execSync(`git merge-base ${MAIN_BRANCH} HEAD`).toString().trim();
	console.log(`Merge base with ${MAIN_BRANCH}: ${mergeBase}`);

	// 3. Get raw commits
	const separator = '|||';
	// Use simple format: Hash, Subject, Author
	const format = `%h${separator}%s${separator}%an`;
	// We filter to exclude merges to keep it clean
	const gitLogCmd = `git log --pretty=format:"${format}" --no-merges ${mergeBase}..HEAD`;

	const rawLog = execSync(gitLogCmd).toString().trim();

	if (!rawLog) {
		console.warn('Warning: No commits found in range.');
		process.exit(0);
	}

	const entries = rawLog.split('\n').map(line => {
		if (!line.trim()) return null;
		const parts = line.split(separator);
		// Expecting 3 parts: hash, subject, author
		if (parts.length < 3) return null;
		const [hash, subject, author] = parts;
		return { hash, subject, author, body: '' };
	}).filter(Boolean);

	// 4. Group by type
	// Simple regex for Conventional Commits
	const typeRegex = /^([a-z]+)(?:\(([^)]+)\))?: (.+)$/;

	const groups = {
		feat: [],
		fix: [],
		perf: [],
		refactor: [],
		other: []
	};

	const typeMapping = {
		feat: 'Features',
		fix: 'Bug Fixes',
		perf: 'Performance Improvements',
		refactor: 'Refactoring'
	};

	entries.forEach(entry => {
		const match = entry.subject.match(typeRegex);
		if (match) {
			const type = match[1];
			const scope = match[2] ? `**${match[2]}:** ` : '';
			const description = match[3];

			const item = { ...entry, scope, description };

			if (groups[type]) {
				groups[type].push(item);
			} else {
				// Known type but not in our explicit list? Add to other or specific group?
				// Let's add it to 'other' if we don't have a specific bucket, or create bucket?
				// for now, just 'other' if not in [feat, fix, perf, refactor]
				groups.other.push(item);
			}
		} else {
			groups.other.push({ ...entry, scope: '', description: entry.subject });
		}
	});

	// 5. Generate Markdown
	let content = '';

	// Function to render a section
	const renderSection = (title, items) => {
		if (items.length === 0) return;
		content += `### ${title}\n\n`;
		items.forEach(item => {
			content += `- ${item.scope}${item.description} ([${item.hash}](commit/${item.hash}))\n`;
		});
		content += `\n`;
	};

	renderSection('Features', groups.feat);
	renderSection('Bug Fixes', groups.fix);
	renderSection('Performance Improvements', groups.perf);
	renderSection('Refactoring', groups.refactor);
	renderSection('Other Changes', groups.other);

	if (!content) {
		content = 'No features, fixes, or performance improvements found in this range.\n';
	}

	// 6. Write to file
	const header = `# Cumulative Branch Changes (${commitHash})\n\n> Changes from ${mergeBase} to ${commitHash}\n\n`;
	fs.writeFileSync(outputFile, header + content);

	console.log(`\nSuccessfully generated branch changelog: ${outputFile}`);
	console.log(`You can review it with: cat ${outputFile}`);

} catch (error) {
	console.error('Error generating branch changelog:', error.message);
	process.exit(1);
}
