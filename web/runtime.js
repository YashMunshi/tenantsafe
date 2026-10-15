(function(g){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function check(ok,message){if(!ok)throw Error(message);}
function obj(x){check(x&&typeof x==='object'&&!Array.isArray(x),'Expected a JSON object.');return x;}
function text(x,label,max=200){check(typeof x==='string'&&x.trim().length>0&&x.length<=max,label+' must be nonempty text, at most '+max+' characters.');return x;}
function list(x,label,max=500){check(Array.isArray(x)&&x.length<=max,label+' must be an array of at most '+max+' items.');return x;}
function number(x,label,min=0,max=1e9){check(Number.isFinite(x)&&x>=min&&x<=max,label+' is outside its supported range.');return x;}
function one(x,options,label){check(options.includes(x),'Unknown '+label+'.');return x;}
function unique(items,label){const ids=items.map(x=>text(x.id,label+' ID'));check(new Set(ids).size===ids.length,label+' IDs must be unique.');}
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
async function sha256(x){const raw=new TextEncoder().encode(typeof x==='string'?x:canonical(x));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function timestamp(x){text(x,'Timestamp');check(/(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x)),'Timestamps must include a UTC Z or numeric timezone offset.');return Date.parse(x);}
const U={clone,check,obj,text,list,number,one,unique,canonical,sha256,timestamp};if(typeof module!=='undefined')module.exports=U;else g.LabUtil=U;
})(globalThis);
