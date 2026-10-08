import fs from 'node:fs/promises';
import path from 'node:path';

const STORAGE_ROOT =
  process.env.STORAGE_ROOT ||
  path.resolve(process.cwd(), 'storage');

async function ensureStorage() {
  await fs.mkdir(STORAGE_ROOT, {
    recursive: true,
  });
}

function safePath(input: string) {
  const cleaned = input
    .replace(/^\/+/, '')
    .replace(/\.\./g, '');

  return path.join(STORAGE_ROOT, cleaned);
}

export const storage = {
  async write(
    files: Array<{
      path: string;
      content: string;
      contentType?: string;
    }>
  ) {
    await ensureStorage();

    const results: boolean[] = [];

    for (const file of files) {
      const target = safePath(file.path);

      await fs.mkdir(path.dirname(target), {
        recursive: true,
      });

      await fs.writeFile(target, file.content, 'utf8');

      results.push(true);
    }

    return results;
  },

  async read(paths: string[]) {
    await ensureStorage();

    const results: Array<{
      content: string;
      path: string;
    } | null> = [];

    for (const filePath of paths) {
      try {
        const target = safePath(filePath);
        const content = await fs.readFile(
          target,
          'utf8'
        );

        results.push({
          content,
          path: filePath,
        });
      } catch {
        results.push(null);
      }
    }

    return results;
  },

  async url(paths: string[]) {
    return paths.map(filePath => ({
      url: `/storage/${filePath
        .replace(/^\/+/, '')
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
    }));
  },
};