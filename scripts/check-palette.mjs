import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_HEX = new Set([
  '#FAFAF8',
  '#FFFFFF',
  '#0A0A0A',
  '#D4141C',
  '#A30F15',
]);

const EXEMPT_FILES = new Set([
  path.resolve('src/config/theme.ts'),
  path.resolve('src/index.css'),
]);

const HEX_REGEX = /#[0-9A-Fa-f]{3,8}\b/g;

function stripComments(str) {
  return str
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');
}

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (/\.(ts|tsx|css|glsl)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk(path.resolve('src'));
let violations = 0;

for (const file of files) {
  const rawContent = fs.readFileSync(file, 'utf8');
  const content = stripComments(rawContent);
  const matches = content.match(HEX_REGEX) || [];
  for (const match of matches) {
    const upper = match.toUpperCase();
    if (EXEMPT_FILES.has(file)) {
      if (!ALLOWED_HEX.has(upper)) {
        console.error(`[PALETTE VIOLATION] Disallowed hex ${match} in ${path.relative(process.cwd(), file)}`);
        violations++;
      }
    } else {
      console.error(
        `[PALETTE VIOLATION] Hardcoded hex ${match} found outside theme.ts in ${path.relative(process.cwd(), file)}. Import THEME_COLORS instead.`,
      );
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\nFailed palette check with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log('Palette check passed: strictly #FAFAF8, #FFFFFF, #0A0A0A, #D4141C, #A30F15 via theme tokens.');
}
