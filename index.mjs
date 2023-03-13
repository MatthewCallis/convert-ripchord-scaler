import path from 'path';
import fs, { readdir, readFile, writeFile } from 'fs/promises'
import { buildRipchord, buildScaler, parseText } from './convert-ripchord-scaler.mjs';

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

;(async () => {
  for await (const file of getFiles('/Users/matthew/uttori/convert-ripchord-scaler')) {
    if (file[0] !== '.' && ['.rpc', '.xml'].includes(path.extname(file).toLowerCase())) {
      try {
        const data = await readFile(file, { encoding: 'utf8' });
        const parsed = parseText(data, { sharps: true });
        // const built = buildScaler(parsed);
        // const built = buildRipchord(parsed, { generateTrigger: true });
        // const output = buildXML(built);
        // await fs.writeFile('ripchord-to-scaler.xml', output);
      } catch (error) {
        console.error(file, error);
      }
    }
  }
})();
