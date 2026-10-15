import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('public',{recursive:true});await cp('web','public',{recursive:true});
await cp('README.md','public/README.md');
const config=JSON.parse(await readFile('project.json','utf8'));
const html=await readFile('web/index.html','utf8');
await writeFile('public/404.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · ${config.name}</title><link rel="stylesheet" href="style.css"><link rel="icon" href="favicon.svg"></head><body><main class="wrap guide"><p class="eyebrow">404 / Unknown route</p><h1>This path ends here.</h1><p class="intro">Return to ${config.name} to continue the experiment.</p><p class="edit-note"><a class="button primary" href="/">Open the lab</a></p></main></body></html>`);
console.log('Built '+config.name+' into public/.');
