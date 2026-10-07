const $=id=>document.getElementById(id),token=location.pathname.split('/')[2];let current,offset=0,lastSuccess=0;
function el(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n}
function render(s){current=s;offset=s.serverTime-Date.now();$('content').hidden=false;$('round').textContent=`${s.done.filter(Boolean).length} / 8 경기 완료`;$('title').textContent=s.title;for(const k of ['label','question','answer'])$(k).textContent=s[k];$('answer').hidden=!s.answer;
 $('schedule').replaceChildren(...s.games.map((g,i)=>el('span',(s.done[i]?'✓ ':'')+g,i===s.round?'active':'')));
 $('rules').replaceChildren(...s.rules.map(r=>el('li',r)));
 const teams=s.teams.map(t=>({...t,total:t.scores.slice(1).reduce((a,b)=>a+b,0)})).sort((a,b)=>b.total-a.total);
 $('rankings').replaceChildren(...teams.map(t=>{const r=el('div','','rank');r.append(el('span',(teams.findIndex(x=>x.total===t.total)+1)+'위'),el('b',t.name),el('strong',t.total+'점'));return r}));
 const h=el('tr');h.append(...['팀',...s.games.slice(1),'합계'].map(t=>el('th',t)));$('tableHead').replaceChildren(h);
 $('tableBody').replaceChildren(...teams.map(t=>{const r=el('tr');r.append(el('th',t.name),...[...t.scores.slice(1),t.total].map(v=>el('td',v)));return r}));tick();
}
function tick(){if(!current)return;const t=current.timer,sec=t.running?Math.max(0,Math.ceil((t.deadline-Date.now()-offset)/1000)):t.remaining;$('timer').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
async function poll(){try{const r=await fetch('/api/public/'+token);if(!r.ok)throw Error();const s=await r.json();if(!current||s.version!==current.version)render(s);else offset=s.serverTime-Date.now();lastSuccess=Date.now();$('status').textContent='연결됨 · 진행 상황과 점수는 자동으로 업데이트돼요.'}catch{$('status').textContent=lastSuccess?'연결이 끊겼어요. 마지막으로 확인한 기록을 표시하고 있어요. 연결을 다시 시도하고 있습니다.':'경기를 불러오지 못했어요. 학생 링크와 인터넷 연결을 확인해 주세요.'}finally{setTimeout(poll,2000)}}
setInterval(tick,200);poll();
