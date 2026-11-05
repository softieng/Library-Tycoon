const assert=require('node:assert/strict');
const o=require('../tycoon_operations.js');
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
const sample={day:4,level:7,served:31,lost:2,staff:4,satisfaction:91,cleanliness:87,visitors:8,navBlocked:1,paused:false,nextUpgrade:{name:'استراحة الموظفين',cost:860},services:{books:{unlock:0,queue:2,active:true},print:{unlock:4,queue:1,active:false},study:{unlock:2,queue:3,active:true},research:{unlock:7,queue:1,active:false}}};
test('operations rejects unavailable data',()=>assert.equal(o.normalize(null),null));
test('operations count waiting and active independently',()=>{const x=o.normalize(sample);assert.equal(x.totalWaiting,7);assert.equal(x.totalServing,2);});
test('all 4 original services preserved',()=>assert.deepEqual(o.normalize(sample).services.map(x=>x.name),['الاستعارة','الطباعة','المطالعة','البحث العلمي']));
test('staff, satisfaction, cleanliness, date, visitors, navigation status visible',()=>{const x=o.normalize(sample);assert.deepEqual([x.staff,x.satisfaction,x.cleanliness,x.day,x.visitors,x.navBlocked],[4,91,87,4,8,1]);});
test('locked services excluded from visible counts',()=>{const x=o.normalize({...sample,level:0});assert.equal(x.totalWaiting,2);assert.equal(x.totalServing,1);assert.equal(x.services[3].unlocked,false);});
test('normalization limits malformed values',()=>{const x=o.normalize({...sample,staff:-99,visitors:Infinity,satisfaction:900,services:{books:{queue:-1,active:1,unlock:0},print:{queue:Infinity,unlock:4}}});assert.equal(x.staff,0);assert.equal(x.visitors,0);assert.equal(x.satisfaction,100);assert.equal(x.totalWaiting,0);});
test('normalization does not write to its input',()=>{const b=JSON.stringify(sample);o.normalize(sample);assert.equal(JSON.stringify(sample),b);});
test('no upgrade safely handled',()=>assert.equal(o.normalize({...sample,nextUpgrade:null}).nextUpgrade,null));
test('reject excessive untrusted upgrade labels',()=>assert.equal(o.normalize({...sample,nextUpgrade:{name:'x'.repeat(150),cost:1}}).nextUpgrade,null));
console.log(n+'/9 operations checks PASS');
