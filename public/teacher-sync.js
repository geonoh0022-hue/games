let serverVersion=0,ready=false,dirty=false,saving=false,saveTimer,conflicted=false,serverOffset=0,lastSnapshot='';
const notice=document.createElement('div');notice.style.cssText='position:sticky;top:0;z-index:20;padding:12px 20px;background:#fff3c4;display:none';notice.setAttribute('role','alert');document.body.prepend(notice);
function warn(text){notice.textContent=text;notice.style.display=text?'block':'none'}
function snapshot(){return {...state,live:{revealed,mafiaPhase,remaining:running?state.live?.remaining||remaining:remaining,running,deadline:running?deadline+serverOffset:0,duration:Number($('duration').value)||180}}}
function queueSave(){if(!ready||conflicted)return;dirty=true;$('saveState').textContent='서버에 저장 중…';clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,200)}
async function flushSave(){
 if(!ready||saving||!dirty||conflicted)return;saving=true;dirty=false;
 const value=snapshot();
 try{const r=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-Playday':'1'},body:JSON.stringify({version:serverVersion,state:value})});const b=await r.json();
  if(r.status===409){conflicted=true;document.querySelector('main').inert=true;warn(b.error+' 이 화면의 마지막 변경은 저장되지 않았습니다.');throw Error(b.error)}
  if(!r.ok)throw Error(b.error);serverVersion=b.version;lastSnapshot=JSON.stringify(value);if(!dirty){$('saveState').textContent='서버 저장 완료';warn('')}
 }catch(e){dirty=true;$('saveState').textContent='저장되지 않음';if(!conflicted)warn('서버에 저장하지 못했습니다. 이 창을 유지해 주세요. 연결되면 다시 저장합니다. '+e.message)}
 finally{saving=false;if(dirty&&!conflicted)saveTimer=setTimeout(flushSave,2000)}
}
function applyServer(b){
 clearInterval(interval);serverOffset=b.serverTime-Date.now();serverVersion=b.version;state=b.state;const l=state.live;
 revealed=l.revealed;mafiaPhase=l.mafiaPhase;running=l.running;deadline=l.deadline-serverOffset;remaining=running?Math.max(0,Math.ceil((deadline-Date.now())/1000)):l.remaining;
 $('duration').value=l.duration;render();lastSnapshot=JSON.stringify(snapshot());$('saveState').textContent='서버 저장 완료';
 $('shareLink').onclick=async()=>{const link=location.origin+b.sharePath;try{await navigator.clipboard.writeText(link);toast('학생 링크를 복사했어요.')}catch{prompt('아래 링크를 복사해서 학생들에게 보내 주세요.',link)}};
}
async function loadServer(){try{const r=await fetch('/api/state');if(!r.ok)throw Error('연결 실패');applyServer(await r.json());ready=true;document.body.classList.remove('loading');warn('')}catch{warn('서버에 연결하지 못했습니다. 3초 후 다시 시도합니다.');setTimeout(loadServer,3000)}}
// Run after the original event handlers, including handlers that change only live state.
for(const event of ['click','change','submit','keydown'])document.addEventListener(event,()=>setTimeout(()=>{if(ready&&JSON.stringify(snapshot())!==lastSnapshot)queueSave()},0));
window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue=''}});
setInterval(()=>{if(!ready)return;if(running){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));renderTime()}},200);
setInterval(async()=>{if(!ready||dirty||saving||conflicted||document.querySelector('dialog[open]'))return;try{const r=await fetch('/api/state');if(!r.ok)return;const b=await r.json();if(dirty||saving||conflicted)return;if(b.version!==serverVersion)applyServer(b)}catch{}},3000);
loadServer();

