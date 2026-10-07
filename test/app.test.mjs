import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {mockSupabase} from './mock-supabase.mjs';
import net from 'node:net';
const cwd=fileURLToPath(new URL('..',import.meta.url));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
test('server authorization, shared scores, hidden answers, concurrency, restart',async t=>{
 const mock=await mockSupabase(),port=await freePort();let child;
 async function start(){child=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,NODE_ENV:'test',PORT:String(port),APP_ORIGIN:`http://127.0.0.1:${port}`,SUPABASE_URL:mock.url,SUPABASE_SECRET_KEY:'test-secret',ADMIN_LINK_TOKEN:'test-admin-link-token-01234567890123456789'},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/api/health`)).ok)return}catch{}await new Promise(r=>setTimeout(r,30))}throw Error(logs)}
 const stop=async()=>{if(child&&child.exitCode===null){const p=new Promise(r=>child.once('exit',r));child.kill();await p}};
 t.after(async()=>{await stop();await new Promise(r=>mock.server.close(r))});await start();
 const base=`http://127.0.0.1:${port}`;let cookie='';
 const req=(path,method='GET',body,auth=true,extra={})=>fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Playday':'1',...(auth?{Cookie:cookie}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
 assert.equal((await req('/api/state')).status,401);assert.equal((await req('/teacher')).status,302);assert.equal((await req('/data.json')).status,404);
 for(const page of ['/','/manage']){const html=await(await req(page)).text();assert(!/<input|<form/i.test(html));assert(!html.includes('test-admin-link-token'))}
 assert.equal((await req('/api/login','POST',{})).status,404);
 assert.equal((await req('/api/access','POST',{token:'bad'})).status,403);
 cookie='playday=9999999999999.forged';assert.equal((await req('/api/state')).status,401);
 const login=await req('/api/access','POST',{token:'test-admin-link-token-01234567890123456789'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert(!cookie.includes('test-admin-link-token'));
 assert.equal((await req('/teacher')).status,200);
 let data=await(await req('/api/state')).json();const share='/api/public/'+data.sharePath.split('/').pop();
 assert.equal((await req('/api/access','POST',{token:data.sharePath.split('/').pop()},false)).status,403);
 assert.equal((await req('/api/public/bad-token')).status,404);assert.equal((await req(data.sharePath,'GET',undefined,false)).status,200);
 data.state.round=1;data.state.teams[0].scores[1]=30;data.state.mafiaRoster=[{name:'PRIVATE_STUDENT',role:'마피아'}];
 const pack=JSON.parse(readFileSync(new URL('../data.json',import.meta.url))).QUIZ_PACKS.initial[0];data.state.selectedPacks.initial=pack.id;data.state.packEdits[pack.id]=[['ㅂㅁ','비밀정답']];
 assert.equal((await req('/api/state','PUT',data,false)).status,401);
 assert.equal((await req('/api/state','PUT',data,true,{Origin:'https://attacker.example'})).status,403);
 let write=await req('/api/state','PUT',data);assert.equal(write.status,200,await write.text());
 let pub=await(await req(share,'GET',undefined,false)).json();assert.equal(pub.teams[0].scores[1],30);assert.equal(pub.answer,'');assert(!JSON.stringify(pub).includes('비밀정답'));assert(!JSON.stringify(pub).includes('PRIVATE_STUDENT'));assert(!('mafiaRoster'in pub));
 assert.equal((await req('/api/state','PUT',data)).status,409);
 data=await(await req('/api/state')).json();data.state.live.revealed=true;assert.equal((await req('/api/state','PUT',data)).status,200);pub=await(await req(share)).json();assert.equal(pub.answer,'비밀정답');
 data=await(await req('/api/state')).json();data.state.round=4;data.state.live.revealed=true;assert.equal((await req('/api/state','PUT',data)).status,200);pub=await(await req(share)).json();assert.equal(pub.answer,'');assert.equal(pub.question,'친구의 설명에 집중해 주세요');
 data=await(await req('/api/state')).json();data.state.teams[0].scores[1]=10000;assert.equal((await req('/api/state','PUT',data)).status,400);
 await stop();await start();pub=await(await req(share,'GET',undefined,false)).json();assert.equal(pub.teams[0].scores[1],30);
 const logout=await req('/api/logout','POST');assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);cookie='';assert.equal((await req('/api/state')).status,401);
 assert(!mock.calls.some(c=>c.path.startsWith('/auth/')));
});
test('teacher scripts compile, no local persistence, schema blocks browser access',()=>{
 const html=readFileSync(new URL('../teacher.html',import.meta.url),'utf8');for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(m[1]);assert(!html.includes('localStorage'));
 assert(!html.includes('type="password"'));assert(!html.includes('id="authForm"'));
 for(const f of ['teacher-sync.js','student.js','access.js'])new Script(readFileSync(new URL('../public/'+f,import.meta.url),'utf8'));
 const sql=readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8');assert.match(sql,/enable row level security/);assert.match(sql,/revoke all.*anon, authenticated/);
});
