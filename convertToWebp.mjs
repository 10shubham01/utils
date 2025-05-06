import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { fdir } from 'fdir';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

function getDirSize(dirPath) {
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(fullPath);
    }
    else {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

function formatSize(bytes) {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
}

async function convertToWebp(inputPath) {
  const outputPath = inputPath.replace(/\.png$/i, '.webp');
  try {
    await sharp(inputPath).webp({ lossless: false }).toFile(outputPath);
    fs.unlinkSync(inputPath);
    console.log(`✅ Converted and removed: ${inputPath}`);
    return outputPath;
  }
  catch (error) {
    console.error(`❌ Conversion failed for ${inputPath}:`, error.message);
    return null;
  }
}

function findCodeFiles(rootDir) {
  return new fdir()
    .withFullPaths()
    .filter(f =>
      /\.(js|ts|jsx|tsx|vue|html|css|scss)$/i.test(f)
      && !/node_modules|\.git|dist|\.nuxt|\.output/.test(f),
    )
    .crawl(rootDir)
    .sync();
}

function updateFileReferences(codeFile, replacements) {
  let content = fs.readFileSync(codeFile, 'utf-8');
  let changed = false;
  const updatedRefs = [];

  for (const { original, updated } of replacements) {
    const escapedOriginal = original.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedOriginal, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, updated);
      changed = true;
      updatedRefs.push({ from: original, to: updated });
    }
  }

  if (changed) {
    fs.writeFileSync(codeFile, content, 'utf-8');
    console.log(`🔁 Updated: ${codeFile}`);
    updatedRefs.forEach(({ from, to }) => {
      console.log(`   → ${from} → ${to}`);
    });
  }
}

async function main() {
  const imageRoot = await prompt('Enter the image directory (e.g., ./public/images): ');
  const resolvedImageRoot = path.resolve(imageRoot);
  const projectRoot = process.cwd();

  if (!fs.existsSync(resolvedImageRoot) || !fs.statSync(resolvedImageRoot).isDirectory()) {
    console.error('❌ Invalid image directory.');
    rl.close();
    return;
  }

  const allImages = new fdir()
    .withFullPaths()
    .filter(f => /\.png$/i.test(f) && !/node_modules|\.git|dist|\.nuxt|\.output/.test(f))
    .crawl(resolvedImageRoot)
    .sync();

  if (allImages.length === 0) {
    console.log('No .png images found.');
    rl.close();
    return;
  }

  const sizeBefore = getDirSize(resolvedImageRoot);
  const replacements = [];

  for (const imgPath of allImages) {
    const newPath = await convertToWebp(imgPath);
    if (newPath) {
      const relFromPublic = path.relative(path.join(projectRoot, imageRoot), imgPath).replace(/\\/g, '/');

      const altPaths = [
        `${imageRoot}/${relFromPublic}`,
        `/${imageRoot}/${relFromPublic}`,
        `/images/${relFromPublic}`,
        `images/${relFromPublic}`,
        relFromPublic,
        relFromPublic.replace(/^images\//, ''),
      ];

      for (const alt of altPaths) {
        replacements.push({
          original: alt.replace(/\.png$/i, '.png'),
          updated: alt.replace(/\.png$/i, '.webp'),
        });
      }
    }
  }

  const sizeAfter = getDirSize(resolvedImageRoot);
  const sizeSaved = sizeBefore - sizeAfter;

  console.log(`\n📦 Directory size before: ${formatSize(sizeBefore)}`);
  console.log(`📦 Directory size after:  ${formatSize(sizeAfter)}`);
  console.log(`💡 Space saved:           ${formatSize(sizeSaved)}\n`);

  if (replacements.length === 0) {
    console.log('No images were converted. Nothing to update.');
    rl.close();
    return;
  }

  const codeFiles = findCodeFiles(projectRoot);
  for (const codeFile of codeFiles) {
    updateFileReferences(codeFile, replacements);
  }

  rl.close();
}

main();
