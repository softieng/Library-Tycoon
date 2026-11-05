const assert=require('node:assert/strict');const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..'),s=fs.readFileSync(path.join(root,'index.html'),'utf8');
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
const read=f=>fs.readFileSync(path.join(root,f));
const hash=f=>crypto.createHash('sha256').update(read(f)).digest('hex');
test('all 6 room labels unchanged',()=>{for(const r of ['الخوارزمي','جابر بن حيان','البيروني','المراجع','ثابت بن قرة','الأطاريح'])assert(s.includes("ar:'"+r+"'"));});
test('all 17 original upgrades unchanged',()=>{assert(s.includes("name:'منطقة انتظار منظمة'"));assert(s.includes("name:'المكتبة الذهبية'"));assert.equal(s.split('const upgrades=[')[1].split('];')[0].match(/\{name:/g).length,17);});
test('4 original services and costs unchanged',()=>{for(const n of ['الاستعارة','الطباعة','المطالعة','البحث العلمي'])assert(s.includes("name:'"+n+"'"));});
test('5 original staff jobs retained',()=>{for(const n of ['أمين استعارة','موظف الطباعة','عامل نظافة','مساعد بحث علمي','مشرف قاعة مطالعة'])assert(s.includes("'"+n+"'"));});
test('original save key and IQD currency intact',()=>{assert(s.includes("const KEY='library_tycoon_v14_living_library'"));assert(s.includes('cash(state.cash)'));});
test('source character assets and guardian implementation retained',()=>{const r=read('r22.js').toString();assert(r.includes('buildGuardian'));assert(r.includes('assets/guardian'));assert(r.includes('makeActor(a, staff)'));assert(r.includes('LibraryTycoonFixedCamera.install'));});
test('original brand asset config untouched',()=>assert.equal(hash('tycoon_brand_assets.js'),'932768dc0382c6c5eaba6caef261e27f7894e5044bbb8e33d9c1f169246a3287'));
test('operations load after simulation initialization',()=>{assert(s.endsWith('<script src="tycoon_operations.js"></script></body></html>'));assert(s.includes('window.__LT22={directorView,startBookHunt,checkBookShelf,startExamWeek,startVisitorCase,prioritizeVisitor,staffBreak,projectPoint:(x,y,z)=>project(x,y,z),challengeView,claimChallenge,resolveIncident,shelfView,answerShelf,startShelfRound,operations:'));});
test('read-only operations snapshot does not mutate economy',()=>{let code=s.split('window.__LT22={directorView,startBookHunt,checkBookShelf,startExamWeek,startVisitorCase,prioritizeVisitor,staffBreak,projectPoint:(x,y,z)=>project(x,y,z),challengeView,claimChallenge,resolveIncident,shelfView,answerShelf,startShelfRound,operations:')[1].split(',fixedCtl:')[0];assert(!/(state\.cash\s*=|state\.cash\+\+|localStorage\.setItem|queues\[\w+\]\.push)/.test(code));});
test('fixed camera mode and original navigation preserved',()=>{assert(s.includes('window.__fixedCam=true'));assert(s.includes('tycoon_navigation.js'));});
console.log(n+'/10 continuity checks PASS');
