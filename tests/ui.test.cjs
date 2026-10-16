'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const E=require('../web/engine.js'),U=require('../web/runtime.js'),config=require('../project.json');
function setup(){const downloads=[];const context=vm.createContext({window:{LabConfig:config,LabEngine:E,LabUtil:U},document:{querySelector:()=>({}),createElement:()=>({click(){}})},Blob:class{constructor(parts){downloads.push(parts.join(''));}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout:()=>0});const source=fs.readFileSync('web/app.js','utf8').replace(/shell\(\);\s*$/,'');vm.runInContext(source,context);return {context,downloads};}
test('Evidence tables escape imported markup and retain field labels',()=>{const {context}=setup();context.payload=[{identity:'<img src=x onerror=alert(1)>',reason:'"quoted" & text'}];const html=vm.runInContext('table(payload,"Imported evidence")',context);assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('data-label="Identity"'));assert.ok(html.includes('scope="col"'));});
test('Every guided control has a corresponding accessible label',()=>{const {context}=setup(),html=vm.runInContext('fields()',context);const controls=[...html.matchAll(/<(?:input|select) id="([^"]+)"/g)].map(m=>m[1]);assert.ok(controls.length>0);for(const id of controls)assert.ok(html.includes('for="'+id+'"'));});
test('Export binds evidence to the executed input after draft edits',async()=>{const {context,downloads}=setup(),result=await E.run(structuredClone(E.initial));context.sample=result;context.executed=structuredClone(E.initial);vm.runInContext('result=sample;lastInput=executed;draft={changedAfterRun:true};download();',context);const exported=JSON.parse(downloads[0]);assert.deepEqual(exported.input,E.initial);assert.ok(!exported.input.changedAfterRun);assert.equal(exported.project,config.name);assert.ok(exported.limits.length>0);});
test('Built HTML declares project metadata and scripts exist',()=>{const html=fs.readFileSync('web/index.html','utf8');assert.ok(html.includes('<html lang="en">'));assert.ok(html.includes(config.name));assert.ok(html.includes('og:image'));for(const [,file] of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|woff|svg))"/g))assert.ok(fs.existsSync('web/'+file),file);});

test('Typing updates the submitted JSON immediately without rewriting partial list text',()=>{
 const {context}=setup();
 const editor={value:JSON.stringify(E.initial)},status={textContent:''},error={textContent:''};
 const control={dataset:{path:'removeEdges',type:'list'},value:'e3,'};
 const nodes={'#json-input':editor,'#run-status':status,'#run-error':error,'#experiment-form':{},'#reset':{},'#import-file':{}};
 context.formView={querySelector:s=>nodes[s],querySelectorAll:()=>[control]};
 vm.runInContext("root.querySelector=s=>s==='#view'?formView:null;renderView();",context);
 assert.equal(typeof control.oninput,'function');control.oninput();
 assert.deepEqual(JSON.parse(editor.value).removeEdges,['e3']);
 assert.equal(control.value,'e3,','Typing must preserve a trailing comma for the next ID');
 control.value='e3, e4';control.oninput();
 assert.deepEqual(JSON.parse(editor.value).removeEdges,['e3','e4']);
 assert.match(status.textContent,/Inputs changed/);assert.equal(error.textContent,'');
});
