const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
test('initial identity: staff remain assigned to fixed station coordinates', () => {
  const s=C.initialState(); const origin=JSON.stringify(C.STAFF_POS);
  for(let i=0;i<800;i++) C.tick(s, .25,()=>0);
  assert.equal(JSON.stringify(C.STAFF_POS),origin);
  assert.ok(s.cleaner.x>=C.CLEANING_ZONE.x0&&s.cleaner.x<=C.CLEANING_ZONE.x1);
  assert.ok(s.cleaner.y>=C.CLEANING_ZONE.y0&&s.cleaner.y<=C.CLEANING_ZONE.y1);
});
test('students enter queues and the hired worker processes requests',()=>{
  const s=C.initialState(); C.enqueue(s,'borrow'); const before=s.money;
  for(let i=0;i<50;i++) C.tick(s,.5,()=>0);
  assert.ok(s.served>0); assert.ok(s.money>before);
});
test('lost book reward cannot be claimed twice',()=>{
  const s=C.initialState();const price=s.money;
  assert.equal(C.inspectShelf(s,'shelf-B').ok,true);
  assert.equal(s.money,price+5000);
  assert.equal(C.inspectShelf(s,'shelf-B').ok,false);
  assert.equal(s.money,price+5000);
});
test('three wrong shelves fail securely',()=>{
  const s=C.initialState();for(let i=0;i<3;i++) C.inspectShelf(s,'shelf-A');
  assert.equal(C.inspectShelf(s,'shelf-B').ok,false);
  assert.equal(s.money,72000);
});
test('inspection fails while queue and cleanliness breach thresholds',()=>{
  const s=C.initialState(); s.cleanliness=50; s.waits.borrow=14;
  assert.equal(C.startEvent(s,'inspection').ok,true);
  C.finishEvent(s);assert.equal(s.flags.inspection,false);
});
test('inspection succeeds and cannot reward twice',()=>{
  const s=C.initialState();const money=s.money;
  C.startEvent(s,'inspection');C.finishEvent(s);
  assert.equal(s.money,money+8000);
  assert.equal(C.startEvent(s,'inspection').ok,false);
});
test('rush reward requires actual visitor service and satisfaction',()=>{
  const s=C.initialState(); C.startEvent(s,'rush');C.finishEvent(s);
  assert.equal(s.flags.rush,false);
  C.startEvent(s,'rush');s.served+=10;s.satisfaction=80;C.finishEvent(s);
  assert.equal(s.flags.rush,true);
});
test('upgrades charge once and affect level',()=>{
  const s=C.initialState();const price=s.money;
  assert.equal(C.upgrade(s,'shelves').ok,true);
  assert.equal(s.money,price-6000);
  assert.equal(s.upgrades.shelves,2);
});
test('quiz reward only after three correct answers',()=>{
  const s=C.initialState();const money=s.money;
  assert.equal(C.answerQuiz(s,1).ok,true); assert.equal(s.money,money);
  assert.equal(C.answerQuiz(s,0).ok,true); assert.equal(s.money,money);
  assert.equal(C.answerQuiz(s,2).ok,true); assert.equal(s.money,money+1800);
  C.answerQuiz(s,2); assert.equal(s.money,money+1800);
});
test('save restoration clamps untrusted values and ignores incompatible versions',()=>{
  const s=C.normalizedState({...C.initialState(),money:1234,cleanliness:900,book:{target:'unknown',guesses:33}});
  assert.equal(s.money,1234); assert.equal(s.cleanliness,100);
  assert.equal(s.book.target,'shelf-B');assert.equal(s.book.guesses,3);
  assert.equal(C.normalizedState({version:100,money:999}).money,72000);
});
test('printer repair costs money and closes event',()=>{
  const s=C.initialState();C.startEvent(s,'printer');const before=s.money;
  assert.equal(C.repairPrinter(s).ok,true);assert.equal(s.money,before-400);assert.equal(s.event,null);
});
test('new day resets only daily missions, preserving progression',()=>{
  const s=C.initialState();s.flags.lost=true;s.upgrades.shelves=3;
  C.resetDay(s);assert.equal(s.day,2);assert.equal(s.flags.lost,false);assert.equal(s.upgrades.shelves,3);
});