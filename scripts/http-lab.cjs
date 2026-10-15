'use strict';
const http=require('node:http'),crypto=require('node:crypto');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const random=()=>crypto.randomBytes(32).toString('base64url');
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function tokenService(secret=random()){
 const issuer='urn:security-lab:local',audience='security-lab';
 function sign(claims){const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify(claims)).toString('base64url'),data=head+'.'+body;return data+'.'+crypto.createHmac('sha256',secret).update(data).digest('base64url');}
 function verify(token,now){if(typeof token!=='string'||token.length>10000)fail(401,'Invalid token.');const parts=token.split('.');if(parts.length!==3)fail(401,'Invalid token.');let head,claims;try{head=JSON.parse(Buffer.from(parts[0],'base64url'));claims=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{fail(401,'Invalid token encoding.');}if(head.alg!=='HS256'||head.typ!=='JWT')fail(401,'Unsupported token type or algorithm.');const signature=crypto.createHmac('sha256',secret).update(parts[0]+'.'+parts[1]).digest('base64url');if(!equal(signature,parts[2]))fail(401,'Invalid signature.');if(claims.iss!==issuer||claims.aud!==audience)fail(401,'Untrusted issuer or audience.');if(!Number.isInteger(claims.exp)||now>=claims.exp)fail(401,'Token expired.');if(!Number.isInteger(claims.nbf)||now<claims.nbf)fail(401,'Token not active.');if(typeof claims.sub!=='string'||!claims.sub)fail(401,'Missing subject.');return claims;}
 return {issuer,audience,sign,verify};
}
function createLab({engine,kind,clock=()=>Math.floor(Date.now()/1000),enableVulnerable=false}={}){
 const sessions=new Map(),attempts=new Map(),tokens=tokenService();let server;
 const users=kind==='retrieval'?Object.keys(engine.users):['alice','bob','viewer','admin'];
 async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32768)fail(413,'Request body too large.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'Invalid JSON.');}}
 function cookie(req){const match=/(?:^|;\s*)lab_session=([A-Za-z0-9_-]+)/.exec(req.headers.cookie||'');return match?.[1];}
 function session(req){const id=cookie(req),s=sessions.get(id);if(!s||clock()>=s.expires){sessions.delete(id);fail(401,'Session missing or expired.');}return {id,...s};}
 const setCookie=(res,id,age=300)=>res.setHeader('Set-Cookie','lab_session='+id+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+age);
 server=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");const send=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};try{
  const port=server.address().port,allowedHosts=['127.0.0.1:'+port,'localhost:'+port],origin='http://'+req.headers.host;if(!allowedHosts.includes(req.headers.host))fail(403,'Untrusted Host header.');const url=new URL(req.url,origin);if(!['GET','POST'].includes(req.method))fail(405,'Method not allowed.');if(req.method==='POST'&&req.headers.origin!==origin)fail(403,'Origin check failed.');const input=req.method==='POST'?await body(req):{};
  if(req.method==='POST'&&url.pathname==='/login'){
   const key=req.socket.remoteAddress,history=(attempts.get(key)||[]).filter(t=>clock()-t<60);if(history.length>=10)fail(429,'Too many login attempts.');history.push(clock());attempts.set(key,history);
   if(!users.includes(input.name)||!equal(input.password,'DemoPass!2026'))fail(401,'Invalid demo credentials.');sessions.delete(cookie(req));const id=random(),s={actor:input.name,csrf:random(),expires:clock()+300,authenticated:clock()};sessions.set(id,s);setCookie(res,id);send(200,{actor:s.actor,csrf:s.csrf,expires:s.expires});return;
  }
  const s=session(req);if(req.method==='POST'&&!equal(req.headers['x-csrf-token'],s.csrf))fail(403,'Session-bound CSRF token required.');
  if(req.method==='GET'&&url.pathname==='/me'){send(200,{actor:s.actor,csrf:s.csrf,expires:s.expires});return;}
  if(req.method==='POST'&&url.pathname==='/logout'){sessions.delete(s.id);setCookie(res,'',0);send(200,{revoked:true});return;}
  if(req.method==='POST'&&url.pathname==='/reauthenticate'){if(!equal(input.password,'DemoPass!2026'))fail(401,'Reauthentication failed.');sessions.delete(s.id);const id=random(),next={actor:s.actor,csrf:random(),expires:clock()+300,authenticated:clock()};sessions.set(id,next);setCookie(res,id);send(200,{csrf:next.csrf,reauthenticated:true});return;}
  if(req.method==='POST'&&url.pathname==='/sensitive'){if(clock()-s.authenticated>120)fail(403,'Recent authentication required.');send(200,{allowed:true,actor:s.actor});return;}
  if(req.method==='GET'&&url.pathname==='/token'){send(200,{token:tokens.sign({iss:tokens.issuer,aud:tokens.audience,sub:s.actor,nbf:clock(),exp:clock()+60})});return;}
  if(req.method==='POST'&&url.pathname==='/verify-token'){const claims=tokens.verify(input.token,clock());if(claims.sub!==s.actor)fail(403,'Token subject does not match this session.');send(200,{valid:true,subject:claims.sub});return;}
  if(kind==='tenant'&&url.pathname.startsWith('/documents/')){const id=decodeURIComponent(url.pathname.slice('/documents/'.length)),action=req.method==='GET'?'read':input.action;if(req.method==='POST'&&!['update','share'].includes(action))fail(400,'Unsupported document action.');const decision=engine.authorize(s.actor,id,action,true);if(!decision.allowed){send(decision.status,{error:decision.reason});return;}if(action==='update'){if(typeof input.title!=='string'||!input.title.trim()||input.title.length>120)fail(400,'Invalid title.');decision.data={...decision.data,title:input.title};}send(200,{actor:s.actor,...decision,mutation:'isolated response copy only'});return;}
  if(kind==='tenant'&&url.pathname.startsWith('/vulnerable/')){if(!enableVulnerable)fail(404,'Vulnerable route disabled.');const decision=engine.authorize(s.actor,decodeURIComponent(url.pathname.slice('/vulnerable/'.length)),'read',false);send(200,{labOnly:true,...decision});return;}
  if(kind==='retrieval'&&req.method==='POST'&&url.pathname==='/retrieve'){if(typeof input.query!=='string'||!input.query.trim()||input.query.length>500)fail(400,'Invalid query.');const data=engine.retrieve(engine.users[s.actor],engine.initial.documents,input.query);send(200,{actor:s.actor,citations:data.map(d=>({id:d.id,text:d.body}))});return;}
  fail(404,'Route not found.');
 }catch(err){send(err.status||400,{error:err.message});}});
 return {server,sessions,tokens};
}
module.exports={createLab,tokenService};
if(require.main===module){const engine=require('../web/engine.js'),kind=process.env.LAB_KIND||'session',lab=createLab({engine,kind,enableVulnerable:process.env.ENABLE_VULNERABLE==='1'});lab.server.listen(Number(process.env.LAB_PORT||8780),'127.0.0.1',()=>console.log('Local '+kind+' HTTP lab at http://127.0.0.1:'+lab.server.address().port));}
