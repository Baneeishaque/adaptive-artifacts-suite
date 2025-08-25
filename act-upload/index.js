const core = require('@actions/core');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

function isWindows() { return process.platform === 'win32'; }
function sepRe() { return isWindows() ? /[\\/]/ : /\//; }

// Basic safe name: alnum, dot, dash, underscore
function validateName(name) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error(`Invalid artifact name '${name}'. Use only letters, numbers, ., _, -`);
  }
}

async function exists(p) {
  try { await fsp.lstat(p); return true; } catch { return false; }
}
async function isDir(p) {
  try { return (await fsp.lstat(p)).isDirectory(); } catch { return false; }
}
async function isFile(p) {
  try { return (await fsp.lstat(p)).isFile(); } catch { return false; }
}

async function rmrf(p) { await fsp.rm(p, { recursive: true, force: true }); }
async function mkdirp(p) { await fsp.mkdir(p, { recursive: true }); }

async function copyFile(src, dst) {
  await mkdirp(path.dirname(dst));
  await fsp.copyFile(src, dst);
}

async function copyDirContents(srcDir, dstDir) {
  await mkdirp(dstDir);
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(srcDir, e.name);
    const d = path.join(dstDir, e.name);
    if (e.isDirectory()) {
      await copyDirContents(s, d);
    } else if (e.isFile()) {
      await copyFile(s, d);
    } else if (e.isSymbolicLink()) {
      // Copy target file content instead of recreating symlink (cross-OS safety)
      const real = await fsp.realpath(s).catch(() => null);
      if (real && await isFile(real)) await copyFile(real, d);
    }
  }
}

// Minimal globbing: supports **, *, ?
// Build a regex matching posix-like paths (we compare against relative path with /)
function globToRegExp(glob) {
  const segs = glob.split(sepRe());
  const parts = segs.map(seg => {
    if (seg === '**') return '(?:.+/)?'; // any nested (including current), but we’ll normalize later
    let out = '';
    for (let i = 0; i < seg.length; i++) {
      const c = seg[i];
      if (c === '*') out += '[^/]*';
      else if (c === '?') out += '[^/]';
      else if ('\\.[]{}()+-^$|'.includes(c)) out += '\\' + c;
      else out += c;
    }
    return out;
  });
  const rx = '^' + parts.join('/') + '$';
  return new RegExp(rx);
}

// Determine non-glob base dir to start walking
function globBase(glob) {
  const segs = glob.split(sepRe());
  let i = 0;
  while (i < segs.length && !/[*?\[]/.test(segs[i]) && segs[i] !== '**') i++;
  if (i === 0) return '.';
  return segs.slice(0, i).join(path.sep);
}

async function walkFiles(root) {
  const acc = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile()) acc.push(full);
      else if (e.isSymbolicLink()) {
        const real = await fsp.realpath(full).catch(() => null);
        if (real && await isFile(real)) acc.push(real);
      }
    }
  }
  await walk(root);
  return acc;
}

async function expand(pattern) {
  const base = globBase(pattern);
  const baseAbs = path.resolve(base);
  const relPattern = path.relative(baseAbs, path.resolve(pattern)).split(path.sep).join('/');
  const rx = globToRegExp(relPattern.replace(/^\.\//, ''));
  const all = await walkFiles(baseAbs);
  const out = [];
  for (const f of all) {
    const rel = path.relative(baseAbs, f).split(path.sep).join('/');
    if (rx.test(rel)) out.push(path.join(baseAbs, rel));
  }
  return { base: baseAbs, files: out };
}

async function run() {
  try {
    const name = core.getInput('name', { required: true });
    const pathSpec = core.getInput('path', { required: true });
    const ifnf = core.getInput('if-no-files-found') || 'warn';
    const overwrite = (core.getInput('overwrite') || 'false').toLowerCase() === 'true';
    const actRoot = core.getInput('act-root') || '.act/artifacts';

    validateName(name);

    const dest = path.resolve(path.join(actRoot, name));
    if (await exists(dest)) {
      if (!overwrite) throw new Error(`Destination '${dest}' exists; set overwrite: true to replace`);
      await rmrf(dest);
    }

    const abs = path.resolve(pathSpec);
    if (await isDir(abs)) {
      await copyDirContents(abs, dest);
      core.info(`[ACT] uploaded directory '${abs}' -> '${dest}'`);
      return;
    }
    if (await isFile(abs)) {
      await mkdirp(dest);
      await copyFile(abs, path.join(dest, path.basename(abs)));
      core.info(`[ACT] uploaded file '${abs}' -> '${dest}'`);
      return;
    }

    // Treat as glob
    const { base, files } = await expand(pathSpec);
    if (files.length === 0) {
      if (ifnf === 'error') throw new Error(`No files matched '${pathSpec}'`);
      if (ifnf === 'warn') core.warning(`No files matched '${pathSpec}'`);
      core.info(`[ACT] nothing to upload for '${pathSpec}'`);
      return;
    }

    for (const f of files) {
      const rel = path.relative(process.cwd(), f);
      const target = path.join(dest, rel);
      await copyFile(f, target);
    }
    core.info(`[ACT] uploaded ${files.length} file(s) from glob '${pathSpec}' -> '${dest}'`);
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

if (require.main === module) run();

module.exports = {
  _internals: { globToRegExp, globBase, walkFiles, expand, copyFile, copyDirContents, validateName },
};
