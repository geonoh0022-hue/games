import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';

const root=dirname(fileURLToPath(import.meta.url));
const production=process.env.NODE_ENV==='production';
const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL;
if(production&&(!origin||!origin.startsWith('https://')))throw Error('APP_ORIGIN에 HTTPS 앱 주소를 설정하세요.');
const supabase=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const secretKey=process.env.SUPABASE_SECRET_KEY,adminToken=process.env.ADMIN_LINK_TOKEN;
if(!adminToken||adminToken.length<32)throw Error('ADMIN_LINK_TOKEN을 32자 이상의 임의 값으로 설정하세요. Render Blueprint는 자동 생성합니다.');
if(!supabase||!secretKey)throw Error('Supabase 환경 변수를 설정하세요. README.md를 확인해 주세요.');
if(production&&!supabase.startsWith('https://'))throw Error('Supabase URL은 HTTPS여야 합니다.');
const base=JSON.parse(readFileSync(resolve(root,'data.json'),'utf8'));
async function sb(path,{method='GET',body,key=secretKey,token,prefer}={}){
 const h={apikey:key,'Content-Type':'application/json'};
 if(token)h.Authorization='Bearer '+token;else if(key.split('.').length===3)h.Authorization='Bearer '+key;
 if(prefer)h.Prefer=prefer;
 const r=await fetch(supabase+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const text=await r.text();let data;try{data=text?JSON.parse(text):null}catch{data=null}
 if(!r.ok)throw Object.assign(new Error('Supabase 요청 실패 ('+r.status+'). 설정 또는 연결을 확인해 주세요.'),{upstreamStatus:r.status});return data;
}
const initial={...base.state,live:{revealed:false,mafiaPhase:'ready',remaining:180,running:false,deadline:0,duration:180}};
await sb('/rest/v1/playday_state?on_conflict=id',{method:'POST',body:{id:1,state:initial,version:0,share:randomBytes(24).toString('hex')},prefer:'resolution=ignore-duplicates,return=minimal'});
const read=async()=>{const rows=await sb('/rest/v1/playday_state?id=eq.1&select=*');if(!rows?.length)throw Error('경기 데이터가 없습니다.');return rows[0]};
const cookie=req=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('playday='))?.slice(8)||'';
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const sign=expires=>createHmac('sha256',adminToken).update('playday-session:'+expires).digest('hex');
function isTeacher(req){const [expires,signature]=cookie(req).split('.');return /^\d{13}$/.test(expires||'')&&Number(expires)>Date.now()&&equal(signature,sign(expires))}
const sessionCookie=(token,age=2592000)=>`playday=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${production?'; Secure':''}`;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
function send(res,status,data,type='application/json; charset=utf-8',extra={}){res.writeHead(status,{...headers,'Content-Type':type,...extra});res.end(type.startsWith('application/json')?JSON.stringify(data):data)}
const fail=(status,message)=>Object.assign(new Error(message),{status});
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'JSON 요청이 필요합니다.');let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>1000000)throw fail(413,'저장 데이터가 너무 큽니다.')}try{return JSON.parse(text)}catch{throw fail(400,'요청 내용을 확인해 주세요.')}}
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const questions=v=>Array.isArray(v)&&v.length>0&&v.length<=100&&v.every(q=>Array.isArray(q)&&q.length===2&&q.every(s=>typeof s==='string'&&s.trim()&&s.length<=200));
function validate(s){
 if(!obj(s)||!int(s.round,0,7)||!Array.isArray(s.teams)||!int(s.teams.length,2,8)||!s.teams.every(t=>obj(t)&&typeof t.id==='string'&&t.id.length<=100&&typeof t.name==='string'&&t.name.trim()&&t.name.length<=20&&Array.isArray(t.scores)&&t.scores.length===8&&t.scores.every(n=>int(n,-9999,9999)))||new Set(s.teams.map(t=>t.id)).size!==s.teams.length||new Set(s.teams.map(t=>t.name)).size!==s.teams.length)throw fail(400,'팀과 점수 형식을 확인해 주세요.');
 if(!Array.isArray(s.done)||s.done.length!==8||s.done.some(v=>typeof v!=='boolean')||!int(s.mafiaCount,8,60)||!Array.isArray(s.mafiaRoster)||s.mafiaRoster.length>60||!s.mafiaRoster.every(p=>obj(p)&&typeof p.name==='string'&&p.name.length<=30&&['시민','마피아','경찰','의사'].includes(p.role)))throw fail(400,'경기 정보 형식을 확인해 주세요.');
 for(const k of ['packEdits','selectedPacks','packPositions','packOrders','legacyPacks'])if(!obj(s[k])||Object.keys(s[k]).length>100)throw fail(400,'문제 모음 형식을 확인해 주세요.');
 if(!Object.values(s.packEdits).every(questions)||!Object.values(s.selectedPacks).every(v=>typeof v==='string'&&v.length<=100)||!Object.values(s.packPositions).every(v=>int(v,0,99))||!Object.values(s.packOrders).every(v=>Array.isArray(v)&&v.length<=100&&v.every(n=>int(n,0,99))&&new Set(v).size===v.length)||!Object.entries(s.legacyPacks).every(([k,p])=>Object.keys(base.defaults).includes(k)&&obj(p)&&p.id===k+'-legacy'&&typeof p.title==='string'&&p.title.length<=100&&questions(p.questions)))throw fail(400,'문제 모음의 내용이 올바르지 않습니다.');
 const l=s.live;if(!obj(l)||typeof l.revealed!=='boolean'||typeof l.running!=='boolean'||!['ready','night','day','vote'].includes(l.mafiaPhase)||!int(l.remaining,0,3600)||!int(l.duration,1,3600)||!Number.isSafeInteger(l.deadline)||l.deadline<0||l.deadline>Date.now()+3600000)throw fail(400,'진행 상태 형식을 확인해 주세요.');
 return {round:s.round,teams:s.teams.map(t=>({id:t.id,name:t.name,scores:t.scores})),done:s.done,mafiaCount:s.mafiaCount,mafiaRoster:s.mafiaRoster.map(p=>({name:p.name,role:p.role})),packEdits:s.packEdits,selectedPacks:s.selectedPacks,packPositions:s.packPositions,packOrders:s.packOrders,legacyPacks:s.legacyPacks,banks:base.defaults,positions:{},collectionsVersion:2,live:l};
}
function publicView(row){
 const s=row.state,g=base.games[s.round];let question=g.headline,answer='',label=g.cue;
 if(g.quiz){const packs=[...base.QUIZ_PACKS[g.quiz],...(s.legacyPacks[g.quiz]?[s.legacyPacks[g.quiz]]:[])],p=packs.find(p=>p.id===s.selectedPacks[g.quiz])||packs[0];let qs=s.packEdits[p.id]||p.questions;
  if(g.quiz==='whisper'){qs=qs.filter(q=>q.every(w=>/^[가-힣]{2,4}$/.test(w)));if(!qs.length)qs=base.QUIZ_PACKS.whisper[0].questions}
  const order=s.packOrders[p.id];if(order?.length===qs.length&&new Set(order).size===qs.length&&order.every(i=>i>=0&&i<qs.length))qs=order.map(i=>qs[i]);
  const q=qs[Math.min(s.packPositions[p.id]||0,qs.length-1)];
  question=g.quiz==='initial'?[...q[1]].map(c=>{const n=c.charCodeAt(0)-44032;return n>=0&&n<11172?'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[Math.floor(n/588)]:''}).join(''):q[0].replaceAll('·',' ');
  label=g.quiz==='initial'?'초성을 보고 정답을 맞혀 보세요':'함께 정답을 생각해 보세요';
  // These games reveal their word only on the teacher's screen.
  if(['speed','whisper'].includes(g.quiz)){question='친구의 설명에 집중해 주세요';label='제시어는 교사 화면에서만 보여요'}
  else if(s.live.revealed)answer=q[1].replaceAll('·',' ');
 }
 if(s.round===0){question={ready:'반 전체가 함께하는 마피아',night:'밤이 되었습니다',day:'아침이 되었습니다',vote:'투표 시간입니다'}[s.live.mafiaPhase];label=s.mafiaCount+'명 참여 · 진행자의 안내를 따라 주세요'}
 return {version:row.version,serverTime:Date.now(),round:s.round,done:s.done,teams:s.teams.map(t=>({name:t.name,scores:t.scores})),games:base.games.map(g=>g.name),title:g.name,question,answer,label,rules:g.rules,timer:{remaining:s.live.remaining,running:s.live.running,deadline:s.live.deadline}};
}
const attempts=new Map();
setInterval(()=>{const now=Date.now();for(const [k,v] of attempts)if(v.until<now)attempts.delete(k)},60000).unref();
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(!['GET','POST','PUT'].includes(req.method))throw fail(405,'지원하지 않는 요청입니다.');
 if(req.method!=='GET'){
  if(req.headers['x-playday']!=='1')throw fail(403,'허용되지 않은 요청입니다.');
  if(req.headers.origin&&req.headers.origin!==(origin||`http://${req.headers.host}`))throw fail(403,'허용되지 않은 주소입니다.');
 }
 if(path==='/api/health'&&req.method==='GET')return send(res,200,{ok:true});
 if(path==='/api/access'&&req.method==='POST'){
  const key=req.socket.remoteAddress,now=Date.now();let a=attempts.get(key);if(!a||a.until<now){a={count:0,until:now+60000};attempts.set(key,a)}if(a.count>=10)throw fail(429,'잠시 후 관리 링크를 다시 열어 주세요.');
  const b=await body(req);if(!b||!equal(b.token,adminToken)){a.count++;throw fail(403,'유효한 교사 관리 링크로 접속해 주세요.');}
  attempts.delete(key);const expires=String(now+2592000000);return send(res,200,{ok:true},undefined,{'Set-Cookie':sessionCookie(expires+'.'+sign(expires))});
 }
 if(path==='/api/logout'&&req.method==='POST')return send(res,200,{ok:true},undefined,{'Set-Cookie':sessionCookie('',0)});
 if(path.startsWith('/api/public/')&&req.method==='GET'){const row=await read();if(path.slice(12)!==row.share)throw fail(404,'학생 링크를 확인해 주세요.');return send(res,200,publicView(row))}
 if(path==='/api/state'){
  if(!await isTeacher(req))throw fail(401,'교사 관리 링크로 접속해 주세요.');
  if(req.method==='GET'){const row=await read();return send(res,200,{state:row.state,version:row.version,sharePath:'/s/'+row.share,serverTime:Date.now()})}
  if(req.method==='PUT'){const b=await body(req),state=validate(b.state);if(!Number.isSafeInteger(b.version)||b.version<0)throw fail(400,'버전 정보가 올바르지 않습니다.');const result=await sb('/rest/v1/playday_state?id=eq.1&version=eq.'+b.version,{method:'PATCH',body:{state,version:b.version+1},prefer:'return=representation'});if(!result.length)throw fail(409,'다른 교사 화면에서 수정했습니다. 새로고침 후 다시 수정하세요.');return send(res,200,{version:b.version+1})}
 }
 if(req.method!=='GET')throw fail(404,'경로를 찾을 수 없습니다.');
 let file;
 if(path==='/teacher'||path==='/teacher-sync.js'){
  if(!await isTeacher(req)){res.writeHead(302,{...headers,Location:'/'});return res.end()}
  file=path==='/teacher'?'teacher.html':'public/teacher-sync.js';
 }else if(path==='/'||path==='/login'){if(isTeacher(req)){res.writeHead(302,{...headers,Location:'/teacher'});return res.end()}file='public/welcome.html'}
 else if(path==='/manage')file='public/access.html';
 else if(path.startsWith('/s/')){if(path.slice(3)!==(await read()).share)throw fail(404,'학생 링크를 확인해 주세요.');file='public/student.html'}
 else if(['/student.js','/app.css','/access.js'].includes(path))file='public'+path;
 else throw fail(404,'경로를 찾을 수 없습니다.');
 return send(res,200,readFileSync(resolve(root,file)),file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');
 }catch(e){if(!e.status)console.error(e);send(res,e.status||500,{error:e.status?e.message:'서버 오류입니다. 잠시 후 다시 시도하세요.'})}});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('Playday server ready on port '+(process.env.PORT||3000)));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{process.exit(0)}));
