'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine.js');
const copy=()=>structuredClone(E.initial);

test('Patched cross-tenant read denies without document data',()=>{const r=E.run(copy());assert.equal(r.report.patched.status,404);assert.equal(r.report.patched.data,null);assert.equal(r.report.vulnerable.allowed,true);});
test('Same-tenant reads succeed',()=>{assert.equal(E.authorize('alice','north-plan','read').allowed,true);});
test('Viewer can read but cannot write or share',()=>{assert.equal(E.authorize('viewer','north-plan','read').allowed,true);for(const a of ['update','share'])assert.equal(E.authorize('viewer','north-plan',a).status,403);});
test('Tenant admin has no cross-tenant bypass',()=>{assert.equal(E.authorize('admin','south-budget','read').allowed,false);});
test('Unknown actors, objects and actions are rejected',()=>{assert.throws(()=>E.authorize('intruder','north-plan','read'));assert.throws(()=>E.authorize('alice','missing','read'));assert.throws(()=>E.authorize('alice','north-plan','delete'));});
test('Invalid update values cannot enter a comparison',()=>{const x=copy();x.action='update';x.newTitle='';assert.throws(()=>E.run(x),/title/i);});
