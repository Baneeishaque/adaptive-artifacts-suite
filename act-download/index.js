const core = require('@actions/core');
const fsp = require('fs/promises');
const path = require('path');
const { _internals } = require('../act-upload/index.js'); // reuse copyDirContents

async function exists(p) { try { await fsp.lstat(p); return true; } catch { return false; } }
async function rmrf(p) { await fsp.rm(p, { recursive: true, force: true }); }
async function mkdirp(p) { await fsp.mkdir(p, { recursive: true }); }

async function run() {
  try {
    const name = core.getInput('name', { required: true });
    const target = core.getInput('path', { required: true });
    const clean = (core.getInput('clean') || 'false').toLowerCase() === 'true';
    const actRoot = core.getInput('act-root') || '.act/artifacts';

    const src = path.resolve(path.join(actRoot, name));
    if (!await exists(src)) throw new Error(`ACT artifact '${src}' not found`);

    const dst = path.resolve(target);
    if (clean && await exists(dst)) await rmrf(dst);
    await mkdirp(dst);
    await _internals.copyDirContents(src, dst);
    core.info(`[ACT] downloaded '${src}' -> '${dst}'`);
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

if (require.main === module) run();
