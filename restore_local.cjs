'use strict';
/* Runs ONLY from the backup directory created by apply_local.cjs. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const here=__dirname,manifest=JSON.parse(fs.readFileSync(path.join(here,'restore_manifest.json'),'utf8'));
const {target,entries}=manifest;
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function stop(msg){console.error('STOP:',msg);process.exit(1);}
for(const ent of entries){const p=path.join(target,...ent.name.split('/'));if(!fs.existsSync(p)||sha(p)!==ent.newHash)stop('Target changed after patch installation: '+ent.name+'. No rollback applied.');}
for(const ent of entries){const p=path.join(target,...ent.name.split('/'));if(ent.existed)fs.copyFileSync(path.join(here,...ent.name.split('/')),p);else fs.unlinkSync(p);}
console.log('PASS: Previous verified Library Tycoon files restored from',here);
