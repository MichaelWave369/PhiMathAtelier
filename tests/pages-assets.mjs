import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const published=process.argv[2] ? path.resolve(process.argv[2]) : root;
const assets=readdirSync(root).filter(file=>/\.(?:html|js)$/.test(file));
assert.ok(assets.includes('index.html'));
assert.ok(assets.includes('foldmesh.html'));
assert.ok(assets.includes('foldmesh-core.js'));
assert.ok(assets.includes('foldmesh-ui.js'));
assert.ok(assets.includes('alchemy.html'));

for(const file of assets){
 const staged=path.join(published,file);
 assert.ok(existsSync(staged),`Published site missing source asset: ${file}`);
 assert.ok(statSync(staged).size>0,`Published asset is empty: ${file}`);
}

for(const html of assets.filter(file=>file.endsWith('.html'))){
 const source=readFileSync(path.join(root,html),'utf8');
 const references=[...source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]);
 for(const ref of references){
  if(/^(?:[a-z]+:|\/\/|\/|#)/i.test(ref))continue;
  const clean=ref.split(/[?#]/,1)[0];
  if(!clean)continue;
  const resolved=path.resolve(published,path.dirname(html),clean);
  assert.ok(resolved.startsWith(published+path.sep),`Unsafe local reference in ${html}: ${ref}`);
  assert.ok(existsSync(resolved),`Broken published link in ${html}: ${ref}`);
 }
}
console.log(`PASS: ${assets.length} HTML/JS source assets published and local links resolve.`);
