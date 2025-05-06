import { existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// Configuration
const PUBLIC_DIR = join(process.cwd(), 'public');
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build'];
const FILE_EXTENSIONS = ['.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.php', '.md'];

// Get all files recursively in a directory
function getFilesRecursively(dir, ignoreDirs = []) {
  if (!existsSync(dir))
    return [];

  const files = readdirSync(dir, { withFileTypes: true });
  let results = [];

  for (const file of files) {
    const fullPath = join(dir, file.name);

    if (file.isDirectory()) {
      if (!ignoreDirs.includes(file.name)) {
        results = results.concat(getFilesRecursively(fullPath, ignoreDirs));
      }
    }
    else {
      results.push(fullPath);
    }
  }
  return results;
}

// Main function
async function findUnusedAssets() {
  console.log('Scanning public directory...');
  const publicFiles = getFilesRecursively(PUBLIC_DIR);
  if (publicFiles.length === 0) {
    console.log('No files found in public directory.');
    return;
  }

  console.log('Scanning project files...');
  const projectFiles = getFilesRecursively(process.cwd(), IGNORE_DIRS)
    .filter(file => FILE_EXTENSIONS.includes(extname(file).toLowerCase()));

  const unusedFiles = [];
  const checkedPatterns = new Set();

  console.log('Checking for unused assets...');
  for (const publicFile of publicFiles) {
    const relativePath = relative(PUBLIC_DIR, publicFile);
    const searchPattern = `/${relativePath.split(sep).join('/')}`;

    if (checkedPatterns.has(searchPattern))
      continue;
    checkedPatterns.add(searchPattern);

    let isUsed = false;

    for (const projectFile of projectFiles) {
      try {
        const content = readFileSync(projectFile, 'utf8');
        if (content.includes(searchPattern)) {
          isUsed = true;
          break;
        }
      }
      catch (err) {
        console.error(`Skipping ${projectFile}: ${err.message}`);
      }
    }

    if (!isUsed) {
      unusedFiles.push(publicFile);
    }
  }

  if (unusedFiles.length === 0) {
    console.log('No unused assets found.');
    return;
  }

  console.log('\nFound unused files:');
  unusedFiles.forEach(file => console.log(`- ${file}`));

  const rl = createInterface({ input, output });
  const confirm = await rl.question('\nDo you want to delete these files? (y/n) ');
  rl.close();

  if (confirm.toLowerCase() === 'y') {
    console.log('\nDeleting files...');
    unusedFiles.forEach((file) => {
      try {
        unlinkSync(file);
        console.log(`Deleted: ${file}`);
      }
      catch (err) {
        console.error(`Error deleting ${file}: ${err.message}`);
      }
    });
    console.log('Deletion complete.');
  }
  else {
    console.log('Deletion cancelled.');
  }
}

// Run the script
findUnusedAssets().catch(console.error);
