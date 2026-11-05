'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const rules=require('../tycoon_director.js');
let n=0;const test=(label,fn)=>{fn();n++;console.log('PASS '+label);};
test('five reputation levels based on services, happiness, cleanliness and queues',()=>{
 const hi=rules.reputation({satisfaction:100,cleanliness:100,served:100,lost:0,waiting:0});
 const lo=rules.reputation({satisfaction:25,cleanliness:20,served:2,lost:50,waiting:14});
 assert.equal(hi.score,100);assert.equal(hi.stars,5);assert(lo.score<hi.score&&lo.stars<5);
});
test('reputation bounds invalid data and produces finite scores',()=>{
 for(const x of [{served:Infinity,waiting:-3,satisfaction:-100,cleanliness:9999},{served:'NaN',lost:1e18},{},null]){
  const r=rules.reputation(x);assert(Number.isInteger(r.score)&&r.score>=0&&r.score<=100);assert(r.stars>=1&&r.stars<=5);
 }
});
test('three physical map points belong to the selected library room',()=>{
 const p=rules.huntSpots({x:-10,z:10});assert.equal(p.length,3);
 assert(p.every(a=>a.x>=-13&&a.x<=-7&&a.z>=8&&a.z<=12));
 assert.equal(new Set(p.map(p=>p.x+','+p.z)).size,3);
});
test('four distinct visitor cases only use existing library services',()=>{
 assert.equal(rules.cases.length,4);
 assert.deepEqual(rules.cases.map(x=>x.job),['books','print','study','research']);
});
test('map marker buttons are independent clickable overlay, not fake screenshot',()=>{
 const js=fs.readFileSync(path.join(root,'tycoon_director.js'),'utf8');
 assert(js.includes("markers.className='lt-hunt-markers'"));
 assert(js.includes('checkBookShelf?.(i)'));
 assert(js.includes('projectPoint?.('));
 assert(js.includes('markerButtons'));
});
test('V2.5 does not modify official logo or the mascot source',()=>{
 const protectedHashes={
  'tycoon_brand_assets.js':'932768dc0382c6c5eaba6caef261e27f7894e5044bbb8e33d9c1f169246a3287',
  'r22.js':'ddc6e86cbc6539a2f03be739e94915cb48e7b1e63804e52bd7e7c113fb1e89a5',
  'tycoon_navigation.js':'ebe7ff6f234836d66457f1d90fd97b2590633ca5fc38ae4ce60de97a869c3548',
  'tycoon_central_identity.css':'a3b436c39d477672742032cb5dc1e1a74398b6b40e2c22212229e55478577235',
  'tycoon_visual_theme.js':'c0373e4aa3267bb9e468534f56785a997bf771fd46d366bc58a92c4d9a3a055a'
 };
 const crypto=require('node:crypto');const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 for(const [f,expected] of Object.entries(protectedHashes))assert.equal(sha(path.join(root,f)),expected,f);
 assert(!/fetch\(|XMLHttpRequest|https?:\/\//.test(fs.readFileSync(path.join(root,'tycoon_director.js'),'utf8')));
});
test('director module loads before inline game and no new external network dependency',()=>{
 assert(html.indexOf('<script src="tycoon_director.js"></script>')<html.indexOf('const KEY='));
 assert(html.includes('<link rel="stylesheet" href="tycoon_director.css">'));
 assert(!/src="https?:\/\//.test(html));
});
test('staff auto-service stops on break and cleaner remains within existing zone',()=>{
 assert(html.includes('staff&&!directorOnBreak(index)'));
 assert(html.includes('if(directorOnBreak(3))continue'));
 assert(html.includes('const stops=[{x:0.7,z:10.7},{x:-0.7,z:10.6},{x:0,z:9.6},{...a.station}]'));
});
test('exam increases visitor arrivals but leaves the original traffic limits outside exam',()=>{
 assert(html.includes('const examRush=ensureDirector().exam.active'));
 assert(html.includes('examRush?17:11'));
 assert(html.includes('examRush?3.5:Math.max(4.3,9-state.level*.18)'));
});
test('the original save key is unchanged and new progress is nested in state',()=>{
 assert(html.includes("const KEY='library_tycoon_v14_living_library'"));
 assert(html.includes('challenge:null,director:null'));
 assert(html.includes('function directorCaseResult(a,success)'));
 assert(html.includes('function startExamWeek()'));
});
const start=html.indexOf('function initialDirector(){'),end=html.indexOf('function challengeMetrics(){');
assert(start>0&&end>start);
const source=html.slice(start,end);
function sandbox(extra={}){
 const state={cash:1000,level:2,staff:1,day:1,served:0,lost:0,satisfaction:85,cleanliness:95,playSeconds:0,director:null,...extra};
 const queues={books:[],study:[],print:[],research:[]},agents=[],note=[];
 const jobs={books:{unlock:0},print:{unlock:4},study:{unlock:2},research:{unlock:7}};
 let seq=0,saves=0;
 const ctx={state,rooms:[{kind:'books',unlock:0,ar:'الخوارزمي',x:-10,z:10,index:0},{kind:'books',unlock:5,ar:'جابر بن حيان',x:10,z:10,index:1}],
  SERVICE:jobs,STAFF_TYPES:['أمين استعارة','موظف الطباعة','عامل نظافة','مساعد بحث علمي','مشرف قاعة مطالعة'],
  DIRECTOR_RULES:rules,paused:false,queues,agents,staffAgents:[{id:1,station:{x:0,z:18},x:0,z:18,path:[]}],
  spawn:job=>{const a={id:++seq,job,mode:'arriving'};agents.push(a);return a;},
  notify:x=>note.push(x),save:()=>{saves++;},refreshUI:()=>{},lookAtArea:()=>{},cash:n=>String(n),
  allQueue:()=>Object.values(queues).reduce((s,q)=>s+q.length,0),Math,Number};
 const context=vm.createContext(ctx);vm.runInContext(source,context);
 return {context,state,queues,agents,note,saveCount:()=>saves,eval:code=>vm.runInContext(code,context)};
}
test('book hunt cannot grant rewards twice, respects attempts and active-play cooldown',()=>{
 const x=sandbox();assert.equal(x.eval('startBookHunt()'),true);assert.equal(x.eval('startBookHunt()'),false);
 const target=x.state.director.hunt.target;assert.equal(target,2);
 assert.equal(x.eval('checkBookShelf('+((target+1)%3)+')'),true);
 assert.equal(x.eval('checkBookShelf('+((target+2)%3)+')'),true);assert.equal(x.state.director.hunt.active,true);
 assert.equal(x.eval('checkBookShelf('+target+')'),true);assert.equal(x.state.cash,1105);
 assert.equal(x.state.director.hunt.won,1);assert.equal(x.eval('checkBookShelf(0)'),false);
 assert.equal(x.eval('startBookHunt()'),false);
 x.state.playSeconds=91;assert.equal(x.eval('startBookHunt()'),true);
 assert(x.saveCount()>=5);
});
test('book hunt times out and no late answer is rewarded',()=>{
 const x=sandbox();x.eval('startBookHunt()');x.state.playSeconds=81;
 assert.equal(x.eval('checkBookShelf(0)'),false);
 assert.equal(x.state.director.hunt.active,false);assert.equal(x.state.director.hunt.lost,1);assert.equal(x.state.cash,1000);
});
test('exam challenge pays once when eight real services meet the threshold',()=>{
 const x=sandbox();assert.equal(x.eval('startExamWeek()'),true);assert.equal(x.eval('startExamWeek()'),false);
 x.state.served=8;x.state.playSeconds=116;x.eval('directorTick()');
 assert.equal(x.state.director.exam.won,1);assert.equal(x.state.cash,1260);
 x.eval('directorTick()');assert.equal(x.state.cash,1260);
 assert.equal(x.eval('startExamWeek()'),false);
 x.state.day=2;assert.equal(x.eval('startExamWeek()'),true);
});
test('failed exam penalizes satisfaction only once and cannot become negative',()=>{
 const x=sandbox({satisfaction:10});assert.equal(x.eval('startExamWeek()'),true);
 x.state.playSeconds=200;x.eval('directorTick()');
 assert.equal(x.state.director.exam.lost,1);assert.equal(x.state.satisfaction,10);
 x.eval('directorTick()');assert.equal(x.state.director.exam.lost,1);
});
test('special visitor is an actual NPC and prioritization moves existing queue',()=>{
 const x=sandbox();assert.equal(x.eval('startVisitorCase()'),true);
 const active=x.state.director.cases.active;
 assert.equal(active.agentId,x.agents[0].id);assert.equal(x.agents[0].job,'books');
 assert.equal(x.eval('prioritizeVisitor()'),false);
 x.agents[0].mode='queued';const other={id:99,job:'books',mode:'queued'};
 x.queues.books.push(other,x.agents[0]);
 assert.equal(x.eval('prioritizeVisitor()'),true);
 assert.equal(x.queues.books[0].id,x.agents[0].id);
 assert.equal(x.state.satisfaction,84);assert.equal(x.eval('prioritizeVisitor()'),false);
 x.eval('directorCaseResult(agents[0],true)');
 assert.equal(x.state.cash,1075);assert.equal(x.state.director.cases.completed,1);
 assert.equal(x.state.director.cases.active,null);assert.equal(x.eval('startVisitorCase()'),false);
});
test('visitors who abandon give no special reward and cause one penalty',()=>{
 const x=sandbox();x.eval('startVisitorCase()');x.eval('directorCaseResult(agents[0],false)');
 assert.equal(x.state.director.cases.lost,1);assert.equal(x.state.cash,1000);
 const unhappy=x.state.satisfaction;x.eval('directorCaseResult(agents[0],false)');assert.equal(x.state.satisfaction,unhappy);
});
test('staff breaks lock correctly, expire with active play clock, and never move workers',()=>{
 const x=sandbox();assert.equal(x.eval('staffBreak(2)'),false);
 assert.equal(x.eval('staffBreak(1)'),true);assert.equal(x.eval('directorOnBreak(1)'),true);
 assert.equal(x.eval('staffBreak(1)'),false);x.state.playSeconds=23;
 assert.equal(x.eval('directorOnBreak(1)'),false);
 assert.equal(x.eval('staffBreak(1)'),false);x.state.playSeconds=146;
 assert.equal(x.eval('staffBreak(1)'),true);assert.equal(x.context.staffAgents[0].x,0);
});
test('reloaded orphan request is cleared, other persistent game state stays intact',()=>{
 const x=sandbox({director:{...{hunt:{won:2},exam:{won:4},cases:{active:{agentId:99,job:'books'},completed:3,started:5,lost:0}},breakUntil:[0,0,0,0,0]}});
 assert.equal(x.state.director.cases.active,null);assert.equal(x.state.director.cases.completed,3);
 assert.equal(x.state.director.hunt.won,2);assert.equal(x.state.director.exam.won,4);
});
console.log(n+'/'+n+' director systems PASS');
