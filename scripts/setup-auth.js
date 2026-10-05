import { randomBytes } from 'node:crypto';
import { readFile, appendFile, writeFile } from 'node:fs/promises';
const file = new URL('../.env', import.meta.url);
let current = '';
try {
  current = await readFile(file, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (/^JWT_SECRET=.+/m.test(current)) {
  console.log('JWT_SECRET đã có. Giữ nguyên khóa và phiên đăng nhập.');
} else {
  const line = `JWT_SECRET=${randomBytes(32).toString('hex')}`;
  if (/^JWT_SECRET=\s*$/m.test(current))
    await writeFile(file, current.replace(/^JWT_SECRET=\s*$/m, line), { mode: 0o600 });
  else await appendFile(file, `\n${line}\n`, { mode: 0o600 });
  console.log('Đã lưu khóa JWT trong .env (không hiển thị khóa).');
}
