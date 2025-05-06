/* eslint-disable no-console */
import { readFile, writeFile } from 'node:fs/promises';

const filePath = 'nuxt.config.ts';

const META_UPDATES = {
  title: 'Get UPI-enabled SBM Credilio Credit Card. Card Assured. ',
  ogTitle: 'SBM Credilio FD Backed Credit Card – UPI & 10X Rewards ',
  description:
    'Build your credit score - no income proof or credit score required. Connect it to UPI apps, earn up to 10X rewards, and enjoy 90% of FD as your credit limit. ',
  ogDescription:
    'Build your credit score - no income proof or credit score required. Connect it to UPI apps, earn up to 10X rewards, and enjoy 90% of FD as your credit limit. ',
};

async function updateNuxtMeta() {
  try {
    let content = await readFile(filePath, 'utf8');
    let updated = false;
    const beforeRemove = content;
    content = content
      .replace(/const\s+PROJECT_TITLE\s*=.*?;\n?/g, '')
      .replace(/const\s+PROJECT_DESCRIPTION\s*=.*?;\n?/g, '');

    if (beforeRemove !== content) {
      updated = true;
    }

    // Replace title
    const titleRegex = /title:\s*PROJECT_TITLE/g;
    if (titleRegex.test(content)) {
      content = content.replace(titleRegex, `title: '${META_UPDATES.title}'`);
      console.log('Updated <title>');
      updated = true;
    }
    else {
      console.warn('Could not find <title> pattern');
    }

    // Replace meta tags
    const metaReplacements = [
      {
        label: 'description',
        regex: /(\{[^}]*hid:\s*['"]description['"][^}]*content:\s*)PROJECT_DESCRIPTION([^}]*\})/g,
        replacement: `$1'${META_UPDATES.description}'$2`,
      },
      {
        label: 'og:title',
        regex: /(\{[^}]*hid:\s*['"]og:title['"][^}]*content:\s*)PROJECT_TITLE([^}]*\})/g,
        replacement: `$1'${META_UPDATES.ogTitle}'$2`,
      },
      {
        label: 'og:description',
        regex: /(\{[^}]*hid:\s*['"]og:description['"][^}]*content:\s*)PROJECT_DESCRIPTION([^}]*\})/g,
        replacement: `$1'${META_UPDATES.ogDescription}'$2`,
      },
    ];

    for (const { label, regex, replacement } of metaReplacements) {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        console.log(`Updated <meta name="${label}">`);
        updated = true;
      }
      else {
        console.warn(`Could not find pattern for ${label}`);
      }
    }

    if (updated) {
      await writeFile(filePath, content, 'utf8');
      console.log('nuxt.config.ts updated successfully.');
    }
    else {
      console.log('No changes made. Already updated');
    }
  }
  catch (err) {
    console.error('Error updating nuxt.config.ts:', err);
  }
}

updateNuxtMeta();
