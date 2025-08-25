const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const isWindows = () => process.platform === 'win32';
const sepRe = () => isWindows() ? /[\\/]/ : /\//;

function validateName(name) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error('bad name');
}
async function exists(p){ try { await fsp.lstat(p); return true; } catch { return false; } }
async function isDir(p){ try { return (await fsp.lstat(p)).isDirectory(); } catch { return false; } }
async function isFile(p){ try { return (await fsp.lstat(p)).isFile(); } catch { return false; } }
async function rmrf(p){ await fsp.rm(p, { recursive: true, force: true }); }
async function mkdirp(p){ await fsp.mkdir(p, { recursive: true }); }
async function copyFile(src,dst){ await mkdirp(path.dirname(dst)); await fsp.copyFile(src,dst); }
async function copyDirContents(src,dst){
  await mkdirp(dst);
  const entries = await fsp.readdir(src,{withFileTypes:true});
  for(const e of entries){
    const s = path.join(src,e.name), d = path.join(dst,e.name);
    if(e.isDirectory()) await copyDirContents(s,d);
    else if(e.isFile()) await copyFile(s,d);
    else if(e.isSymbolicLink()){
      const real = await fsp.realpath(s).catch(()=>null);
      if(real && await isFile(real)) await copyFile(real,d);
    }
  }
}
function globToRegExp(glob){
  const segs = glob.split(sepRe());
  const parts = segs.map(seg=>{
    if(seg==='**') return '(?:.+/)?';
    let out=''; for(const c of seg){
      if(c==='*') out+='[^/]*';
      else if(c==='?') out+='[^/]';
      else if('\\.[]{}()+-^$|'.includes(c)) out+='\\'+c; else out+=c;
    }
    return out;
  });
  return new RegExp('^'+parts.join('/')+'$');
}
function globBase(glob){
  const segs = glob.split(sepRe());
  let i=0; while(i<segs.length && !/[*?\[\]]/.test(segs[i]) && segs[i]!=='**') i++;
  return i===0?'.':segs.slice(0,i).join(path.sep);
}
async function walkFiles(root){
  const acc=[]; async function walk(dir){
    const es=await fsp.readdir(dir,{withFileTypes:true});
    for(const e of es){
      const full=path.join(dir,e.name);
      if(e.isDirectory()) await walk(full);
      else if(e.isFile()) acc.push(full);
      else if(e.isSymbolicLink()){
        const real = await fsp.realpath(full).catch(()=>null);
        if(real && (await fsp.lstat(real)).isFile()) acc.push(real);
      }
    }
  } await walk(root); return acc;
}
async function expand(pattern){
  const base = globBase(pattern), baseAbs = path.resolve(base);
  const relPattern = path.relative(baseAbs, path.resolve(pattern)).split(path.sep).join('/');
  const rx = globToRegExp(relPattern.replace(/^\.\//,''));
  const all = await walkFiles(baseAbs);
  const out=[]; for(const f of all){
    const rel = path.relative(baseAbs,f).split(path.sep).join('/');
    if(rx.test(rel)) out.push(path.join(baseAbs,rel));
  }
  return { base: baseAbs, files: out };
}

module.exports = {
  validateName, exists, isDir, isFile, rmrf, mkdirp,
  copyFile, copyDirContents, globToRegExp, globBase, walkFiles, expand
};
