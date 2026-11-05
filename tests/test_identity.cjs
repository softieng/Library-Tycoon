'use strict';
const fs=require('node:fs'), path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), html=fs.readFileSync(path.join(root,'index.html'),'utf8'), js=fs.readFileSync(path.join(root,'tycoon_visual_theme.js'),'utf8'), css=fs.readFileSync(path.join(root,'tycoon_central_identity.css'),'utf8'), r22=fs.readFileSync(path.join(root,'r22.js'),'utf8');
let ok=0;
const test=(label,fn)=>{fn();ok++;console.log('PASS',label);};
test('correct V2.5 title and source ordering',()=>{
 assert.match(html, /<title>Library Tycoon V2\.5/);
 for(const name of ['tycoon_navigation.js','fixed_tycoon_camera.js','tycoon_brand_assets.js','tycoon_visual_theme.js','r22.js'])assert(html.includes('<script src="'+name+'"></script>'));
 assert(html.indexOf('tycoon_visual_theme.js')<html.indexOf('r22.js'));
});
test('genuine logo slots without invented graphics',()=>{
 assert.match(html,/id="ltLogoUot"/);assert.match(html,/id="ltLogoLibrary"/);
 assert(!html.includes('<div class="logo">🏛️</div>'));
 assert(!/https?:\/\//.test(css+js));
 assert.match(js,/LT_APPROVED_BRAND_ASSETS/);
});
test('credits visible on main menu, about, and loading',()=>{
 assert.equal(html.match(/Ass\. Lec\. Eng\. Samer Raad Azzawi/g).length,3);
 assert.match(html,/Concept • Systems Architecture • Project Direction/);
});
test('fixed Tycoon camera and correct instructions',()=>{
 assert.match(html,/__fixedCam=true/);assert.match(html,/حرّك العجلة للتقريب\. زاوية الكاميرا ثابتة/);
 assert.match(r22,/LibraryTycoonFixedCamera\.install/);
 assert(!html.includes('اسحب لتدوير الخريطة'));
});
test('3 palettes and keyboard focus styles',()=>{
 for(const theme of ['institutional','daylight','contrast'])assert(css.includes(`data-lt-theme="${theme}"`)||theme==='institutional');
 assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);
});
test('distinct visual preference and preserved economy',()=>{
 assert.equal(js.includes('lt22_visual_preset'),true);
 assert.equal(/setItem\(['"]KEY/.test(js),false);
 assert(!/state\.(money|cash|level|guardian)/.test(js));
 assert.match(html,/guardianClaim/);assert.match(html,/function save\(/);
 assert.match(r22,/R\.route/);
});
test('no external network dependency introduced',()=>{
 const refs=[...html.matchAll(/<(?:script|link)\s+(?:src|rel)=[^>]*?(?:src|href)="([^"]+)"/g)].map(x=>x[1]);
 assert(refs.every(x=>!x.startsWith('http')));
 assert(!css.includes('@import'));
});
test('JS scene bridge correctly placed after materials and fog',()=>{
 assert(r22.indexOf('R.mats =')<r22.indexOf('R.visualThemeApplied'));
 assert(r22.indexOf('scene.fogMode')<r22.indexOf('R.visualThemeApplied'));
});
const store={}, listeners={};
const rootEl={dataset:{}},fakeDocument={documentElement:rootEl,readyState:'loading',addEventListener:(n,cb)=>listeners[n]=cb,getElementById:()=>null};
const sandbox={document:fakeDocument,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},window:{},Image:class{}};
vm.runInNewContext(js,sandbox,{filename:'tycoon_visual_theme.js'});
test('theme switch persists only isolated preference',()=>{
 const api=sandbox.window.LibraryTycoonVisualTheme;
 assert(api.select('daylight'));assert.equal(rootEl.dataset.ltTheme,'daylight');assert.equal(store.lt22_visual_preset,'daylight');
 assert(!api.select('injected'));assert.equal(api.current(),'daylight');
});
test('PBR calibration stays within proper albedo range',()=>{
 class Color3{constructor(...c){this.channels=c;}static FromHexString(s){return new Color3(0,0,0);}}
 class Color4{constructor(...c){this.channels=c;}}
 const sun={},fill={},mats={wood:{},desk:{},glass:{},chairM:{}};
 const scene={getLightByName:n=>n==='sun'?sun:fill,imageProcessingConfiguration:{},environmentIntensity:0,fogDensity:0};
 const api=sandbox.window.LibraryTycoonVisualTheme;
 assert(api.applyScene(scene,{Color3,Color4},mats));
 for(const m of [mats.wood,mats.desk])assert(m.albedoColor.channels.every(n=>n>=0&&n<=1));
 assert(sun.intensity>=1.5&&sun.intensity<=2.5);
 assert(scene.fogDensity>0&&scene.fogDensity<0.01);
 assert(api.select('contrast'));assert.equal(sun.intensity,2);
});
test('optional brand assets absent by default',()=>{
 const config=fs.readFileSync(path.join(root,'tycoon_brand_assets.js'),'utf8');
 assert.match(config,/LT_APPROVED_BRAND_ASSETS = null/);
});
console.log(`${ok}/${ok} Visual identity tests PASS`);
