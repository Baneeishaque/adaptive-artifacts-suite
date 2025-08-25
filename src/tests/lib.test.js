const os = require('os');
const path = require('path');
const fsp = require('fs/promises');
const {
  validateName, exists, isDir, isFile, rmrf, mkdirp,
  copyFile, copyDirContents, globToRegExp, globBase, expand
} = require('../lib');

function tmpdir() { return fsp.mkdtemp(path.join(os.tmpdir(), 'smart-artifacts-')); }

test('validateName accepts safe names', () => {
  expect(() => validateName('api-dist_1.2.3')).not.toThrow();
  expect(() => validateName('bad/name')).toThrow();
});

test('copyDirContents roundtrip', async () => {
  const root = await tmpdir();
  const src = path.join(root, 'src');
  const dst = path.join(root, 'dst');
  await mkdirp(path.join(src, 'sub'));
  await fsp.writeFile(path.join(src, 'a.txt'), 'alpha');
  await fsp.writeFile(path.join(src, 'sub', 'b.txt'), 'beta');
  await copyDirContents(src, dst);
  expect(await isFile(path.join(dst, 'a.txt'))).toBe(true);
  expect(await isFile(path.join(dst, 'sub', 'b.txt'))).toBe(true);
});

test('globToRegExp basic', () => {
  const rx = globToRegExp('src/*.txt');
  expect(rx.test('src/a.txt')).toBe(true);
  expect(rx.test('src/sub/b.txt')).toBe(false);
});

test('globBase detection', () => {
  expect(globBase('a/b/*.txt')).toBe(path.join('a','b'));
  expect(globBase('**/*.js')).toBe('.');
});

test('expand finds files', async () => {
  const root = await tmpdir();
  const src = path.join(root, 'sample', 'src');
  await mkdirp(path.join(src, 'sub'));
  await fsp.writeFile(path.join(src, 'a.txt'), 'alpha');
  await fsp.writeFile(path.join(src, 'sub', 'b.txt'), 'beta');
  const { files } = await expand(path.join(root, 'sample', 'src', '*.txt'));
  expect(files.some(f => f.endsWith(path.join('sample','src','a.txt')))).toBe(true);
  expect(files.some(f => f.endsWith(path.join('sub','b.txt')))).toBe(false);
});
