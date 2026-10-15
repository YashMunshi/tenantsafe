import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=require('./web/engine.js');
const input=process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):engine.initial;
try{console.log(JSON.stringify(await engine.run(input),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
