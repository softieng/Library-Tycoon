/* Library Tycoon V2.2 visual identity module.
   Local-only presets. No game save, camera, personnel, bonus, or progression mutations.
   Official logos are displayed ONLY if owner registers paths in LT_APPROVED_BRAND_ASSETS.
 */
(() => {
'use strict';
const KEY = 'lt22_visual_preset';
const choices = ['institutional', 'daylight', 'contrast'];
const ar = { institutional:'مؤسسي',daylight:'إضاءة نهارية',contrast:'تباين عالٍ' };
const settings = {
 institutional:{sun:2.2,fill:0.56,exp:0.91,contrast:1.07,env:0.67,wood:[0.99,0.94,0.86],desk:[0.97,0.93,0.86],fog:[0.82,0.88,0.9],bg:[0.87,0.92,0.91],chair:'#33424b',warm:[1,0.96,0.89]},
 daylight:{sun:2.15,fill:0.67,exp:0.98,contrast:1.04,env:0.71,wood:[1,0.97,0.92],desk:[1,0.96,0.9],fog:[0.87,0.91,0.91],bg:[0.91,0.94,0.93],chair:'#42505a',warm:[1,0.98,0.94]},
 contrast:{sun:2.0,fill:0.51,exp:0.85,contrast:1.16,env:0.61,wood:[0.91,0.87,0.8],desk:[0.94,0.9,0.82],fog:[0.72,0.8,0.83],bg:[0.76,0.83,0.84],chair:'#253743',warm:[1,0.96,0.88]}
};
let active = 'institutional';
try { const saved = localStorage.getItem(KEY); if(choices.includes(saved)) active = saved; } catch(_) {}
function setRoot() { document.documentElement.dataset.ltTheme = active; }
setRoot();
let bridge = null;
function sceneColors(scene,B,mats) {
 if(!scene || !B || !mats)return false;
 const p=settings[active],c=a=>new B.Color3(...a), sun=scene.getLightByName('sun'), fill=scene.getLightByName('fill');
 if(sun) {sun.intensity=p.sun;sun.diffuse=c(p.warm);}
 if(fill) {fill.intensity=p.fill;fill.diffuse=c([0.89,0.95,1]);fill.groundColor=c([0.63,0.58,0.51]);}
 scene.imageProcessingConfiguration.exposure=p.exp;
 scene.imageProcessingConfiguration.contrast=p.contrast;
 scene.environmentIntensity=p.env;
 scene.fogDensity=0.0032;
 scene.fogColor=c(p.fog);
 scene.clearColor=new B.Color4(...p.bg,1);
 // Keep PBR texture multipliers in physically meaningful [0,1] range.
 if(mats.wood){mats.wood.albedoColor=c(p.wood);mats.wood.roughness=0.71;}
 if(mats.desk){mats.desk.albedoColor=c(p.desk);mats.desk.roughness=0.63;}
 if(mats.glass){mats.glass.roughness=0.11;mats.glass.environmentIntensity=0.85;}
 if(mats.chairM){mats.chairM.albedoColor=B.Color3.FromHexString(p.chair);mats.chairM.roughness=0.67;}
 return true;
}
function applyScene(scene,B,mats){bridge={scene,B,mats};return sceneColors(scene,B,mats);}
function updateLabel(){const el=document.getElementById('ltVisualTheme');if(el){el.textContent='🎨 الألوان: '+ar[active];el.setAttribute('aria-label','تبديل ألوان واجهة المكتبة. الحالي: '+ar[active]);}}
function select(name){if(!choices.includes(name))return false;active=name;setRoot();try{localStorage.setItem(KEY,name)}catch(_){}
 if(bridge)sceneColors(bridge.scene,bridge.B,bridge.mats);updateLabel();return true;}
function cycle(){select(choices[(choices.indexOf(active)+1)%choices.length]);}
function createApprovedLogo(holder,asset){
 // No request is made for missing/not approved logos. No artwork is created or altered.
 if(typeof asset!=='string' || !/^assets\/branding\/[\w.\-]+\.(?:png|webp|svg)$/i.test(asset))return;
 const img=new Image();img.alt=holder.getAttribute('data-logo-alt')||'';
 img.addEventListener('load',()=>{holder.replaceChildren(img);});
 img.addEventListener('error',()=>{});
 img.src=asset;
}
function wire(){
 updateLabel();const toggle=document.getElementById('ltVisualTheme');if(toggle)toggle.addEventListener('click',cycle);
 const approved=window.LT_APPROVED_BRAND_ASSETS;
 if(approved && typeof approved==='object') {
  const u=document.getElementById('ltLogoUot'),l=document.getElementById('ltLogoLibrary');
  if(u)createApprovedLogo(u,approved.university);if(l)createApprovedLogo(l,approved.library);
 }
 const panel=document.getElementById('ltAbout');const open=document.getElementById('ltOpenAbout'),close=document.getElementById('ltCloseAbout');
 if(panel&&open&&close){
  let previous=null;
  function hide(){panel.setAttribute('aria-hidden','true');(previous||open).focus();}
  open.addEventListener('click',()=>{previous=document.activeElement;panel.setAttribute('aria-hidden','false');close.focus();});
  close.addEventListener('click',hide);
  panel.addEventListener('click',e=>{if(e.target===panel)hide();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.getAttribute('aria-hidden')==='false'){e.preventDefault();hide();}
   else if(e.key==='Tab'&&panel.getAttribute('aria-hidden')==='false'){const focusable=[...panel.querySelectorAll('button:not([disabled]),a[href]')];if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
window.LibraryTycoonVisualTheme=Object.freeze({applyScene,select,current:()=>active,choices:[...choices]});
})();
