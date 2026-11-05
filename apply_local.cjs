'use strict';
/* Library Tycoon V2.5 safe, offline, fail-closed update from byte-verified V2.3 or V2.4.
   No edits to original institutional logos, mascot images, GLB/HDRI, save data,
   GitHub or production servers. Creates rollback snapshot before replacement. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const here=__dirname,target=path.resolve(process.argv[2]||'D:\\Projects\\Library-Tycoon-V21\\outputs\\V22');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function stop(m){console.error('STOP:',m);process.exit(1);}
const prev={
 'index.html':'9bf080b2bad6f5bbc6aea2cc7885b65a6340fdbec4fa1f98c2bf683c57b1b579',
 'r22.js':'ddc6e86cbc6539a2f03be739e94915cb48e7b1e63804e52bd7e7c113fb1e89a5',
 'tycoon_navigation.js':'ebe7ff6f234836d66457f1d90fd97b2590633ca5fc38ae4ce60de97a869c3548',
 'tycoon_central_identity.css':'a3b436c39d477672742032cb5dc1e1a74398b6b40e2c22212229e55478577235',
 'tycoon_visual_theme.js':'c0373e4aa3267bb9e468534f56785a997bf771fd46d366bc58a92c4d9a3a055a',
 'tycoon_operations.js':'5f8de52489eec82052566fc589f96f4b72d2780b2641bacef401cab1924575e0',
 'tycoon_operations.css':'08975e68204fa73d6c2b5d13b60c9ad7b158f71bf4247acf50e6769e86dfb002',
 'tycoon_challenges.js':'c1e8f2def450a857a95b20640416255e043dd7c9ad44995ea15b809104998d31',
 'tycoon_challenges.css':'fd473dc2198782a0b520ed7d3cbca1768bc994d7f5fe8d5aac86efc8dc4dc2d6'
};
const v23={...prev,
 'index.html':'a5b021d01b9671b402651ffe6a00e5694f63050d93c8eae2ebff8919a6bb828c',
 'r22.js':'f42aa3fa74d2c53bff2f667692322e44d8b9a3dd06ab9a78a0625fa861f158d7'
};
const versions=[{name:'V2.4',hashes:prev,challenge:true},{name:'V2.3',hashes:v23,challenge:false}];
const added=['tycoon_director.js','tycoon_director.css'];
const managed=[...Object.keys(prev),...added];
const fp=(root,name)=>path.join(root,...name.split('/'));
if(!fs.existsSync(target)||!fs.statSync(target).isDirectory())stop('Original game folder not found: '+target);
for(const name of managed)if(!fs.existsSync(fp(here,name)))stop('Incomplete V2.5 package: '+name);
// Leave owner-approved brand config unmodified, regardless of custom paths inside it.
if(managed.every(name=>fs.existsSync(fp(target,name))&&sha(fp(target,name))===sha(fp(here,name)))){
 console.log('ALREADY INSTALLED: V2.5. Original logos, guardian, models, and save data untouched.');process.exit(0);
}
const stage=versions.find(v=>fs.existsSync(fp(target,'index.html'))&&sha(fp(target,'index.html'))===v.hashes['index.html']
 &&fs.existsSync(fp(target,'r22.js'))&&sha(fp(target,'r22.js'))===v.hashes['r22.js']);
if(!stage)stop('Unsupported original revision, expected exact V2.3 or V2.4. NO CHANGES.');
for(const [name,before] of Object.entries(stage.hashes)){
 if(!stage.challenge&&name.startsWith('tycoon_challenges.'))continue;
 const file=fp(target,name);
 if(!fs.existsSync(file)||sha(file)!==before)stop(stage.name+' file modified or missing: '+name+'. NO CHANGES.');
}
for(const name of ['tycoon_challenges.js','tycoon_challenges.css']){
 if(!stage.challenge&&fs.existsSync(fp(target,name)))stop('Unexpected '+name+' in V2.3. NO CHANGES.');
}
for(const name of added)if(fs.existsSync(fp(target,name)))stop('Unexpected existing '+name+'. NO CHANGES.');
try{
 const tests=['test_identity','test_navigation','test_runtime','test_operations','test_continuity','test_challenges','test_director'];
 for(const test of tests)cp.execFileSync(process.execPath,[fp(here,'tests/'+test+'.cjs')],{cwd:here,stdio:'pipe',timeout:45000});
 for(const name of ['r22.js','tycoon_navigation.js','tycoon_operations.js','tycoon_challenges.js','tycoon_director.js','tycoon_brand_assets.js'])cp.execFileSync(process.execPath,['--check',fp(here,name)],{cwd:here,stdio:'pipe',timeout:10000});
}catch(e){stop('QA failed: '+String(e.stderr||e.message).slice(0,600));}
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),backup=path.join(path.dirname(target),'V22_pre_V25_'+stamp);
if(fs.existsSync(backup))stop('Backup folder already exists.');
fs.mkdirSync(backup);
// Write only files that are new or changed. Never copy existing identity sources needlessly.
const changes=managed.filter(name=>!fs.existsSync(fp(target,name))||sha(fp(target,name))!==sha(fp(here,name)));
const entries=changes.map(name=>({name,existed:fs.existsSync(fp(target,name)),newHash:sha(fp(here,name))}));
try{
 for(const e of entries)if(e.existed){fs.mkdirSync(path.dirname(fp(backup,e.name)),{recursive:true});fs.copyFileSync(fp(target,e.name),fp(backup,e.name));}
 fs.writeFileSync(path.join(backup,'restore_manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),target,entries},null,2));
 for(const f of ['restore_local.cjs','RESTORE_WINDOWS.cmd'])fs.copyFileSync(fp(here,f),fp(backup,f));
}catch(e){stop('Unable to create verified rollback snapshot: '+e.message);}
function revert(){for(const e of entries){const file=fp(target,e.name);if(e.existed)fs.copyFileSync(fp(backup,e.name),file);else if(fs.existsSync(file))fs.unlinkSync(file);}}
try{
 for(const e of entries){const file=fp(target,e.name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(fp(here,e.name),file);if(sha(file)!==e.newHash)throw new Error('File hash mismatch: '+e.name);}
 console.log('PASS: Library Tycoon V2.5 installed from '+stage.name+'.');console.log('ROLLBACK:',backup);
 console.log('PRESERVED: assets/branding, assets/guardian, brand config, save data, vendor and models.');
 console.log('Open the original START_WINDOWS.bat then click: مكتب مدير المكتبة.');
}catch(e){try{revert();}catch(e2){stop('Install error and rollback error: '+e.message+' / '+e2.message);}stop('Install failed, original game restored: '+e.message);}
