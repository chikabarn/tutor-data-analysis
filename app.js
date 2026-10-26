(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// flat week list
const WEEKS=[];PHASES.forEach((p,pi)=>p.weeks.forEach((w,wi)=>WEEKS.push({...w,p,pi,wi,id:p.id+(wi+1),g:WEEKS.length})));
const LS_KEY="dct-state-v1";
let state={start:"2026-11-02",done:[],notes:{},best:{}};
let sel=null, sample=null;

function loadLocal(){try{const r=localStorage.getItem(LS_KEY);if(r)Object.assign(state,JSON.parse(r));}catch(e){}}
function persist(){
  try{localStorage.setItem(LS_KEY,JSON.stringify(state));}catch(e){}
}
function weekDate(g){const d=new Date(state.start+"T00:00:00");d.setDate(d.getDate()+g*7);return d;}
function fmt(d){return d.toLocaleDateString(undefined,{day:"numeric",month:"short"});}
function nowIndex(){const s=new Date(state.start+"T00:00:00");const diff=Math.floor((Date.now()-s)/864e5/7);return diff;}

function renderMap(){
  const ni=nowIndex();
  $("#lines").innerHTML=PHASES.map((p,pi)=>{
    const ws=WEEKS.filter(w=>w.pi===pi);
    const doneN=ws.filter(w=>state.done.includes(w.id)).length;
    const lastDone=ws.reduce((m,w,i)=>state.done.includes(w.id)?i:m,-1);
    const fillW=lastDone<0?0:(lastDone*64);
    return `<div class="line-row" style="--lc:var(${p.color})">
      <div class="line-label"><b>${esc(p.name)}</b><span>${doneN} of ${ws.length} weeks</span></div>
      <div class="track-scroll"><div class="track"><div class="fill" style="width:${fillW}px"></div>
      ${ws.map(w=>`<button class="stn${state.done.includes(w.id)?" done":""}${w.g===ni?" now":""}${sel&&sel.id===w.id?" sel":""}" data-id="${w.id}" aria-label="${esc(p.name)} week ${w.wi+1}: ${esc(w.t)}${state.done.includes(w.id)?", done":""}"><span class="dot">${w.wi+1}</span><small>${fmt(weekDate(w.g))}</small></button>`).join("")}
      </div></div></div>`;
  }).join("");
  document.querySelectorAll(".stn").forEach(b=>b.onclick=()=>openWeek(b.dataset.id));
  const total=WEEKS.length,d=state.done.length;
  const cur=WEEKS[Math.max(0,Math.min(ni,total-1))];
  const status = ni<0 ? `Starts ${fmt(weekDate(0))}` : ni>=total ? "Route complete by date" : `This week: ${esc(cur.p.name)}, week ${cur.wi+1}`;
  const behind = ni>=0 ? WEEKS.slice(0,Math.min(ni,total)).filter(w=>!state.done.includes(w.id)).length : 0;
  $("#stats").innerHTML=`<span><b>${d}</b>of ${total} weeks done</span><span><b>${Math.round(d/total*100)}%</b>complete</span><span>${status}</span>${behind?`<span>${behind} earlier week${behind>1?"s":""} still open</span>`:""}`;
}

function quizHTML(qs,prefix){
  return qs.map((q,i)=>`<div class="q" data-a="${q.a}" data-why="${esc(q.w||"")}"><p class="qt">${i+1}. ${esc(q.q)}</p><div class="opts">${q.o.map((o,j)=>`<button class="opt" data-j="${j}">${esc(o)}</button>`).join("")}</div></div>`).join("");
}
function wireQuiz(root,onAnswer){
  root.querySelectorAll(".q").forEach(qe=>{
    const a=+qe.dataset.a;
    qe.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{
      const j=+b.dataset.j;
      qe.querySelectorAll(".opt").forEach(x=>{x.disabled=true;if(+x.dataset.j===a)x.classList.add("right");});
      if(j!==a)b.classList.add("wrong");
      const why=document.createElement("p");why.className="why";
      why.innerHTML=`<b>${j===a?"Correct.":"Not quite."}</b> ${qe.dataset.why}`;qe.appendChild(why);
      onAnswer&&onAnswer(j===a);
    });
  });
}

/* One-question-at-a-time quiz with score and retake */
function runQuiz(root,questions,opt){
  opt=opt||{};
  let order=questions.map((_,i)=>i),i=0,score=0,missed=[];
  const shuffle=a=>{for(let k=a.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[a[k],a[j]]=[a[j],a[k]];}return a;};
  function draw(){
    if(i>=order.length){
      const best=state.weekBest||(state.weekBest={});
      if(opt.key&&(best[opt.key]==null||score>best[opt.key])){best[opt.key]=score;persist();}
      const n=order.length,pct=Math.round(score/n*100);
      root.innerHTML=`<p class="kicker">Your score${opt.key&&best[opt.key]!=null?`, best so far ${best[opt.key]} of ${n}`:""}</p>
        <p class="score">${score} / ${n}</p>
        <p>${pct>=80?"Strong. You’re ready to move on.":pct>=60?"Close. Re-read the parts of the lesson behind the questions you missed.":"Go back over the lesson and videos, then try again."}</p>
        ${missed.length?`<details class="ans"><summary>Review the ${missed.length} you missed</summary>${missed.map(q=>`<p style="margin:0 0 10px"><b>${esc(q.q)}</b><br>Answer: ${esc(q.o[q.a])}. <span class="note">${esc(q.w||"")}</span></p>`).join("")}</details>`:""}
        <div class="row"><button class="btn primary" data-act="retake">Retake in a new order</button></div>`;
      root.querySelector('[data-act="retake"]').onclick=()=>{order=shuffle(questions.map((_,k)=>k));i=0;score=0;missed=[];draw();};
      return;
    }
    const q=questions[order[i]];
    root.innerHTML=`${opt.title?`<p class="kicker">${esc(opt.title)}</p>`:""}
      <div class="progressbar"><span style="width:${i/order.length*100}%"></span></div>
      <p class="kicker">Question ${i+1} of ${order.length}, score ${score}</p>
      <div class="qbox">${quizHTML([q]).replace('<p class="qt">1. ','<p class="qt">')}</div>
      <div class="row" hidden data-row><button class="btn primary" data-act="next">${i===order.length-1?"See score":"Next question"}</button></div>`;
    wireQuiz(root.querySelector(".qbox"),ok=>{if(ok)score++;else missed.push(q);const r=root.querySelector("[data-row]");r.hidden=false;r.querySelector("button").focus();});
    root.querySelector('[data-act="next"]').onclick=()=>{i++;draw();};
  }
  draw();
}

function inline(h){
  return h.replace(/`([^`\n]+)`/g,"<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<i>$2</i>");
}
function md(t){
  const lines=esc(t).split("\n");let out="",i=0;
  while(i<lines.length){
    let l=lines[i];
    if(/^```/.test(l)){let c=[];i++;while(i<lines.length&&!/^```/.test(lines[i]))c.push(lines[i++]);i++;out+=`<pre><code>${c.join("\n")}</code></pre>`;continue;}
    let m=l.match(/^(#{1,4})\s+(.*)$/);
    if(m){const lv=Math.min(4,Math.max(2,m[1].length));out+=`<h${lv}>${inline(m[2])}</h${lv}>`;i++;continue;}
    if(/^\s*\|.*\|\s*$/.test(l)){let rows=[];while(i<lines.length&&/^\s*\|.*\|\s*$/.test(lines[i]))rows.push(lines[i++]);
      const cells=r=>r.trim().replace(/^\||\|$/g,"").split("|").map(x=>inline(x.trim()));
      const body=rows.filter(r=>!/^\s*\|[\s:|-]+\|\s*$/.test(r));
      out+=`<div class="tbl"><table><thead><tr>${cells(body[0]).map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${body.slice(1).map(r=>`<tr>${cells(r).map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;continue;}
    if(/^\s*[-*]\s+/.test(l)){let it=[];while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i]))it.push(lines[i++].replace(/^\s*[-*]\s+/,""));out+="<ul>"+it.map(x=>`<li>${inline(x)}</li>`).join("")+"</ul>";continue;}
    if(/^\s*\d+[.)]\s+/.test(l)){let it=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i]))it.push(lines[i++].replace(/^\s*\d+[.)]\s+/,""));out+="<ol>"+it.map(x=>`<li>${inline(x)}</li>`).join("")+"</ol>";continue;}
    if(/^&gt;\s?/.test(l)){let q=[];while(i<lines.length&&/^&gt;\s?/.test(lines[i]))q.push(lines[i++].replace(/^&gt;\s?/,""));out+=`<blockquote>${inline(q.join("<br>"))}</blockquote>`;continue;}
    if(!l.trim()){i++;continue;}
    let p=[];while(i<lines.length&&lines[i].trim()&&!/^(```|#{1,4}\s|\s*[-*]\s+|\s*\d+[.)]\s+|\s*\|.*\|\s*$|&gt;)/.test(lines[i]))p.push(lines[i++]);
    if(!p.length){p.push(lines[i++]);}
    out+=`<p>${inline(p.join("<br>"))}</p>`;
  }
  return out;
}
function errCopy(e){
  const c=e&&e.code;
  if(c==="not_granted")return "AI features aren’t available right now.";
  if(c==="rate_limited")return "Too many requests at once. Wait a minute, then try again.";
  if(c==="cancelled")return "";
  if(c==="not_configured")return "AI features are off. Add ANTHROPIC_API_KEY in your Vercel project settings to turn them on.";
  if(c==="bad_code")return "Enter your access code (AI settings, top right) to use AI features.";
  return "Couldn’t get an answer from Claude. Try again.";
}
const ytURL=(ch,q)=>"https://www.youtube.com/results?search_query="+encodeURIComponent((ch?ch+" ":"")+q);
const readURL=r=>/^https?:/.test(r)?r:"https://learn.microsoft.com/en-us/search/?terms="+encodeURIComponent(r);
const PLAY=`<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="rgba(255,255,255,.92)"/><path d="M19 15l14 9-14 9z" fill="#17212C"/></svg>`;
const BOOK=`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10h13a5 5 0 015 5v24a4 4 0 00-4-4H8zM40 10H27a5 5 0 00-5 5v24a4 4 0 014-4h14z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

/* lesson cache */
const lessonMem={};
async function getLesson(id){
  if(lessonMem[id])return lessonMem[id];
  try{const t=localStorage.getItem("dct-lesson-"+id);if(t){lessonMem[id]=t;return t;}}catch(e){}
  return null;
}
function putLesson(id,text){
  lessonMem[id]=text;
  try{localStorage.setItem("dct-lesson-"+id,text);}catch(e){}
}

function select(id){sel=WEEKS.find(w=>w.id===id)||WEEKS[0];}
function openWeek(id){
  if(location.hash!=="#"+id)location.hash=id;else route();
}
function renderUpNext(){
  const ni=nowIndex();
  const w=(ni>=0&&ni<WEEKS.length&&!state.done.includes(WEEKS[ni].id))?WEEKS[ni]:(WEEKS.find(x=>!state.done.includes(x.id))||WEEKS[WEEKS.length-1]);
  $("#upnext").style.setProperty("--lc",`var(${w.p.color})`);
  $("#upnext").innerHTML=`<div class="card" style="border-left:6px solid var(--lc);display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
    <div><p class="kicker">Up next: ${esc(w.p.name)}, week ${w.wi+1}, from ${fmt(weekDate(w.g))}</p><p style="font:700 22px/1.2 var(--display);margin:0">${esc(w.t)}</p></div>
    <button class="btn primary" id="go">Start this week’s lesson</button></div>`;
  $("#go").onclick=()=>openWeek(w.id);
}

let genCtl=null;
async function renderLesson(){
  const w=sel,done=state.done.includes(w.id),md0=MEDIA[w.id]||{v:[],r:null};
  const root=$("#lesson");root.style.setProperty("--lc",`var(${w.p.color})`);
  const SECS=[["watch","Watch"],["study","Study"],["practice","Practise"],["quiz","Test yourself"],["notes","Notes"]];
  root.innerHTML=`
  <div class="lp-bar"><button class="btn" id="back">← All weeks</button>
    <div style="display:flex;gap:8px"><button class="btn" id="prev">Previous week</button><button class="btn" id="next">Next week</button></div></div>
  <div class="lp-head">
    <p class="kicker">${esc(w.p.full)}, week ${w.wi+1} of ${w.p.weeks.length}, ${fmt(weekDate(w.g))} to ${fmt(new Date(weekDate(w.g).getTime()+6*864e5))}</p>
    <h2>${esc(w.t)}</h2>
    <p style="margin:0;max-width:68ch">This week: watch the two videos, read the lesson, do the practice exercises, then test yourself. Plan for about 8 to 10 hours in total.</p>
    <div class="jump">${SECS.map(([k,n])=>`<button data-to="${k}">${n}</button>`).join("")}<button class="btn ${done?"done":"primary"}" id="toggle" style="border-radius:999px;padding:6px 14px;font-size:14px">${done?"Week done ✓":"Mark week done"}</button></div>
  </div>

  <div class="sec" id="s-watch"><h3 class="sh"><span class="n">1</span>Watch</h3>
    <p class="sd">Start here to get the big picture. Each link opens YouTube with that channel’s videos on this topic; pick the top result that matches.</p>
    <div class="vids">
      ${md0.v.map(([ch,q])=>`<a class="vid" href="${esc(ytURL(ch,q))}" target="_blank" rel="noopener"><div class="thumb">${PLAY}</div><b>${esc(q.charAt(0).toUpperCase()+q.slice(1))}</b><span>${ch?esc(ch)+" on YouTube":"YouTube"}</span></a>`).join("")}
      ${md0.r?`<a class="vid read" href="${esc(readURL(md0.r[1]))}" target="_blank" rel="noopener"><div class="thumb">${BOOK}</div><b>${esc(md0.r[0].replace(/^[^:]+:\s*/,"").replace(/^./,c=>c.toUpperCase()))}</b><span>${esc(md0.r[0].split(":")[0])}</span></a>`:""}
    </div></div>

  <div class="sec" id="s-study"><h3 class="sh"><span class="n">2</span>Study</h3>
    <p class="sd">Your full lesson for the week. Read it with Power BI or a notebook open and try each example as you go.</p>
    <div class="article"><div class="status" id="lstatus"></div><div class="md" id="lstudy">
      <h3>Key ideas this week</h3><ul>${w.c.map(c=>`<li>${esc(c)}</li>`).join("")}</ul></div></div></div>

  <div class="sec" id="s-practice"><h3 class="sh"><span class="n">3</span>Practise</h3>
    <p class="sd">Hands-on work is where it sticks. Do the main task, then the exercises.</p>
    <div class="article"><div class="md"><h3>Main task</h3><blockquote>${esc(w.task)}</blockquote></div><div class="md" id="lpractice"></div></div></div>

  <div class="sec" id="s-quiz"><h3 class="sh"><span class="n">4</span>Test yourself</h3>
    <div class="two"><div class="card"><div id="wq"></div></div>
    <div class="card"><p style="margin:0 0 10px">Want more? Get five new exam-style questions on this week’s topic.</p><button class="btn" id="genq">Give me 5 new questions</button><div id="genq-out" aria-live="polite"></div></div></div></div>

  <div class="sec" id="s-notes"><h3 class="sh"><span class="n">5</span>Notes</h3>
    <textarea id="notes" placeholder="What you learned, links, questions to ask the tutor…">${esc(state.notes[w.id]||"")}</textarea><p class="save-state" id="ns"></p></div>
  <div class="lp-bar" style="margin-top:26px"><button class="btn" id="back2">← All weeks</button><button class="btn primary" id="next2">${w.g<WEEKS.length-1?"Next week":"Back to roadmap"}</button></div>`;

  runQuiz($("#wq"),w.q,{key:w.id,title:"This week’s "+w.q.length+" questions"});
  root.querySelectorAll(".jump [data-to]").forEach(b=>b.onclick=()=>$("#s-"+b.dataset.to).scrollIntoView({behavior:"smooth",block:"start"}));
  $("#toggle").onclick=()=>{if(state.done.includes(w.id))state.done=state.done.filter(x=>x!==w.id);else state.done.push(w.id);persist();const t=$("#toggle"),d=state.done.includes(w.id);t.className="btn "+(d?"done":"primary");t.textContent=d?"Week done ✓":"Mark week done";};
  $("#back").onclick=$("#back2").onclick=()=>{location.hash="route";};
  $("#prev").disabled=w.g===0;$("#next").disabled=w.g===WEEKS.length-1;
  $("#prev").onclick=()=>openWeek(WEEKS[w.g-1].id);$("#next").onclick=()=>openWeek(WEEKS[w.g+1].id);
  $("#next2").onclick=()=>w.g<WEEKS.length-1?openWeek(WEEKS[w.g+1].id):(location.hash="route");
  $("#notes").oninput=e=>{state.notes[w.id]=e.target.value;$("#ns").textContent="Saving…";persist();clearTimeout(window._nt);window._nt=setTimeout(()=>$("#ns").textContent="Saved",800);};
  $("#genq").hidden=!sample;$("#genq").onclick=()=>genQuestions(w);
  window.scrollTo(0,0);

  const cached=await getLesson(w.id);
  if(sel!==w)return;
  if(cached)showLesson(w,cached,false);
  else if(sample)generateLesson(w);
  else $("#lstatus").innerHTML=`<span>Full written lessons need the AI connection. Add your API key in Vercel (see the README), or use the key ideas above with the videos and practice below.</span>`;
}

function splitLesson(text){
  const k=text.indexOf("===PRACTICE===");
  return k<0?[text,""]:[text.slice(0,k),text.slice(k+14)];
}
function practiceHTML(p){
  if(!p.trim())return "";
  const m=p.search(/^#{1,4}\s*(Answers|Solutions)/mi);
  if(m<0)return md(p);
  return md(p.slice(0,m))+`<details class="ans"><summary>Show answers</summary>${md(p.slice(m).replace(/^#{1,4}.*\n?/,""))}</details>`;
}
function showLesson(w,text,streaming){
  const [study,prac]=splitLesson(text);
  $("#lstudy").innerHTML=md(study);
  $("#lpractice").innerHTML=prac.trim()?practiceHTML(prac):(streaming?"":"");
  if(!streaming){
    $("#lstatus").innerHTML=`<button class="btn" id="regen" style="font-size:13px;padding:5px 10px">Rewrite this lesson</button><span>Not clear? Ask the Tutor about any part.</span>`;
    $("#regen").onclick=()=>generateLesson(w);
  }
}
async function generateLesson(w){
  if(genCtl)genCtl.abort();
  const ctl=genCtl=new AbortController();
  $("#lstatus").innerHTML=`<span class="pulse"></span><span id="lmsg">Writing your lesson. This takes about a minute the first time; after that it opens instantly.</span><button class="btn" id="lstop" style="font-size:13px;padding:5px 10px">Stop</button>`;
  $("#lstop").onclick=()=>ctl.abort();
  const isMS=w.p.id==="pl"||w.p.id==="fb";
  const prompt=`You are an expert, warm teacher writing a complete self-study lesson. The learner has the Google and IBM Data Analytics certificates (spreadsheets, basic SQL, basic dashboards) and is now studying: ${w.p.full}. This is week ${w.wi+1}: "${w.t}".

Points the lesson must teach, in this order:
${w.c.map((c,i)=>(i+1)+". "+c).join("\n")}

The learner's main task this week: ${w.task}

Write the lesson in Markdown using this exact structure:

## Why this matters
2 to 3 sentences on why this skill matters on the job${isMS?" and on the exam":""}.

## The lesson
One ### subheading per point above. For each: explain it clearly from scratch, then give a concrete example. ${isMS?"Include exact click-by-click steps in Power BI or Fabric where relevant (for example: Home > Transform data), and DAX, M or T-SQL code in fenced code blocks.":"Include runnable Python code in fenced code blocks with a short explanation of each line that matters."}

## Worked example
Walk through one realistic mini scenario using a small bookings or sales dataset. Show the sample data as a Markdown table, then each step and the result.

## Common mistakes
4 bullets.

## Summary
5 short bullets of what to remember.

Then output a line containing only: ===PRACTICE===

## Exercises
3 exercises that get harder. For each: a ### title, the data to use (a small inline CSV of 6 to 10 rows, or a named free dataset), numbered steps, and what the finished result should look like.

## Answers
Short worked solutions for each exercise, including code or formulas.

Use only Markdown headings, "-" bullets, numbered lists, **bold**, backtick code, fenced code blocks and pipe tables. Be accurate and specific. Aim for 1,800 to 2,500 words.`;
  let last="";
  try{
    const {text}=await sample(prompt,{modelTier:"default",signal:ctl.signal,onText:({text})=>{last=text;if(sel===w){$("#lmsg")&&($("#lmsg").textContent="Writing your lesson…");showLesson(w,text,true);}}});
    putLesson(w.id,text);
    if(sel===w)showLesson(w,text,false);
  }catch(e){
    if(sel!==w)return;
    const keep=e.text||last;
    if(keep){showLesson(w,keep,true);}
    const msg=errCopy(e)||"Stopped.";
    $("#lstatus").innerHTML=`<span>${esc(msg)}</span><button class="btn" id="retry" style="font-size:13px;padding:5px 10px">Write the lesson again</button>`;
    $("#retry").onclick=()=>generateLesson(w);
  }finally{if(genCtl===ctl)genCtl=null;}
}

async function genQuestions(w){
  const out=$("#genq-out"),btn=$("#genq");btn.disabled=true;
  out.innerHTML=`<p class="thinking">Writing questions…</p>`;
  const prompt=`Write 5 new exam-style multiple-choice questions for someone studying ${w.p.full}, on the topic "${w.t}". Topic points: ${w.c.join(" ")}
Make them scenario-based where possible, like real certification questions, with exactly 4 options and one correct answer. Vary which option is correct.
Return ONLY a JSON array, no other text, in this shape:
[{"q":"question","o":["A","B","C","D"],"a":0,"w":"one-sentence explanation of why the answer is right"}]`;
  try{
    const data=await sample.json(prompt,{modelTier:"default",cache:false});
    const qs=(Array.isArray(data)?data:[]).filter(q=>q&&typeof q.q==="string"&&Array.isArray(q.o)&&q.o.length>=2&&Number.isInteger(q.a)&&q.a>=0&&q.a<q.o.length).slice(0,5);
    if(!qs.length)throw {code:"bad"};
    out.innerHTML=`<div style="margin-top:16px">`+quizHTML(qs.map(q=>({...q,w:q.w||""})))+`</div>`;
    wireQuiz(out);
  }catch(e){const m=errCopy(e);out.innerHTML=m?`<p class="note">${esc(m)}</p>`:"";}
  btn.disabled=false;
}

/* Practice drill */
let drill={phase:"pl",qs:[],i:0,score:0,answered:false};
function startDrill(pid){
  const pool=WEEKS.filter(w=>w.p.id===pid||pid==="all").flatMap(w=>w.q.map(q=>({...q,src:w.p.name+", week "+(w.wi+1)})));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  drill={phase:pid,qs:pool.slice(0,20),i:0,score:0};renderDrill();
}
function renderDrill(){
  const d=drill,root=$("#drill");
  const segs=[["pl","PL-300"],["py","Python & ML"],["fb","DP-600"],["all","Everything"]];
  const head=`<div class="drill-head"><div class="seg" role="group" aria-label="Question set">${segs.map(([k,n])=>`<button aria-pressed="${d.phase===k}" data-k="${k}">${n}${state.best[k]!=null?` (best ${state.best[k]}/20)`:""}</button>`).join("")}</div></div>`;
  if(d.i>=d.qs.length){
    const prev=state.best[d.phase];
    if(prev==null||d.score>prev){state.best[d.phase]=d.score;persist();}
    root.innerHTML=head+`<div class="card"><p class="kicker">Your score</p><p class="score">${d.score} / ${d.qs.length}</p><p>${d.score>=16?"Exam-ready on these topics. Keep it up.":d.score>=12?"Close. Review the weeks behind the questions you missed.":"Go back to the roadmap weeks for this set, then try again."}</p><div class="row"><button class="btn primary" id="again">Try another 20</button></div></div>`;
    $("#again").onclick=()=>startDrill(d.phase);
  }else{
    const q=d.qs[d.i];
    root.innerHTML=head+`<div class="progressbar"><span style="width:${d.i/d.qs.length*100}%"></span></div>
    <div class="card"><p class="kicker">Question ${d.i+1} of ${d.qs.length}, from ${esc(q.src)}</p><div id="dq">${quizHTML([q]).replace('<p class="qt">1. ','<p class="qt">')}</div><div class="row" id="nextrow" hidden><button class="btn primary" id="dnext">${d.i===d.qs.length-1?"See score":"Next question"}</button></div></div>`;
    wireQuiz($("#dq"),ok=>{if(ok)d.score++;$("#nextrow").hidden=false;$("#dnext").focus();});
    $("#dnext").onclick=()=>{d.i++;renderDrill();};
  }
  root.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>startDrill(b.dataset.k));
}

/* Tutor */
const turns=[];let ctl=null;
const RULES=`You are a friendly, precise tutor helping a data analyst (Google and IBM Data Analytics certificates) prepare for Microsoft PL-300 and DP-600 and learn Python, machine learning and automation. Answer clearly and concisely, show short code, DAX or SQL examples when useful, and say when something is exam-relevant. If they paste code or a formula, find the problem and show the fix. Use short paragraphs, "-" bullets, **bold** and backtick code only; no headings. Reply "Ready." to this message.`;
function addMsg(role,html){const d=document.createElement("div");d.className="msg "+role;d.innerHTML=html;$("#msgs").appendChild(d);return d;}
async function send(text){
  text=(text||"").trim();if(!text||!sample)return;
  $("#ask").value="";addMsg("u",esc(text).replace(/\n/g,"<br>"));
  turns.push({role:"user",content:text});
  const bubble=addMsg("a",`<span class="thinking">Thinking…</span>`);
  $("#send").disabled=true;$("#stop").hidden=false;$("#tutor-note").textContent="";
  ctl=new AbortController();
  try{
    const input=[{role:"user",content:RULES},{role:"assistant",content:"Ready."},...turns.slice(-12)];
    const {text:ans}=await sample(input,{cache:false,signal:ctl.signal,onText:({text})=>{bubble.innerHTML=md(text);}});
    turns.push({role:"assistant",content:ans});
  }catch(e){
    if(e.text){bubble.innerHTML=md(e.text);turns.push({role:"assistant",content:e.text});}
    else{bubble.remove();turns.pop();}
    const m=errCopy(e);if(m)$("#tutor-note").textContent=m;
  }
  $("#send").disabled=false;$("#stop").hidden=true;
}
const CHIPS=["Explain filter context like I’m new to DAX","When should I use Direct Lake vs Import?","Give me a 20-minute pandas exercise","Quiz me on Power Query"];
$("#chips").innerHTML=CHIPS.map(c=>`<button>${esc(c)}</button>`).join("");
$("#chips").querySelectorAll("button").forEach(b=>b.onclick=()=>send(b.textContent));
$("#send").onclick=()=>send($("#ask").value);
$("#stop").onclick=()=>ctl&&ctl.abort();
$("#ask").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send($("#ask").value);}});

/* Routing */
const VIEWS=["route","drill","tutor"];
function route(){
  const h=(location.hash||"").slice(1);
  const wk=WEEKS.find(w=>w.id===h);
  const v=wk?"lesson":(VIEWS.includes(h)?h:"route");
  ["route","lesson","drill","tutor"].forEach(x=>{$("#v-"+x).hidden=x!==v;});
  VIEWS.forEach(x=>document.querySelector(`[data-view="${x}"]`).setAttribute("aria-selected",x===v||(v==="lesson"&&x==="route")));
  if(genCtl&&(!wk||sel!==wk)){genCtl.abort();}
  if(wk){select(wk.id);renderLesson();}
  else if(v==="route"){renderMap();renderUpNext();}
  if(v==="drill"&&!drill.qs.length)startDrill("pl");
}
document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>{location.hash=b.dataset.view;});
window.addEventListener("hashchange",route);

$("#start").onchange=e=>{if(e.target.value){state.start=e.target.value;persist();renderMap();renderUpNext();}};
function boot(){$("#start").value=state.start;renderMap();renderUpNext();}
loadLocal();boot();route();

/* ---------- AI connection (Vercel function at /api/claude) ---------- */
let aiCode="";try{aiCode=localStorage.getItem("dct-code")||"";}catch(e){}
let aiInfo={enabled:false,needsCode:false,checked:false};
async function callAI(messages,{onText,signal,max}={}){
  let res;
  try{
    res=await fetch("/api/claude",{method:"POST",headers:{"content-type":"application/json","x-access-code":aiCode},body:JSON.stringify({messages,max_tokens:max||4000}),signal});
  }catch(e){throw {code:e&&e.name==="AbortError"?"cancelled":"error"};}
  if(!res.ok){
    let j={};try{j=await res.json();}catch(e){}
    throw {code:j.error==="bad_code"?"bad_code":j.error==="not_configured"?"not_configured":(res.status===429||j.status===429)?"rate_limited":"error"};
  }
  const reader=res.body.getReader(),dec=new TextDecoder();let buf="",text="",stop=null;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      let k;
      while((k=buf.indexOf("\n\n"))>=0){
        const ev=buf.slice(0,k);buf=buf.slice(k+2);
        const data=ev.split("\n").filter(l=>l.startsWith("data:")).map(l=>l.slice(5).trim()).join("");
        if(!data)continue;let m;try{m=JSON.parse(data);}catch(e){continue;}
        if(m.type==="content_block_delta"&&m.delta&&m.delta.type==="text_delta"){text+=m.delta.text;onText&&onText({text,delta:m.delta.text});}
        else if(m.type==="message_delta"&&m.delta)stop=m.delta.stop_reason;
        else if(m.type==="error")throw {code:m.error&&m.error.type==="overloaded_error"?"rate_limited":"error"};
      }
    }
  }catch(e){
    if(e&&e.name==="AbortError")throw {code:"cancelled",text};
    throw {code:(e&&e.code)||"error",text};
  }
  return {text,truncated:stop==="max_tokens"};
}
function makeSample(){
  const f=(input,o={})=>callAI(typeof input==="string"?[{role:"user",content:input}]:input,{onText:o.onText,signal:o.signal,max:o.max||7000});
  f.json=async(input,o={})=>{
    const {text}=await f(input,{...o,max:3000});
    const t=text.replace(/```json|```/g,"").trim(),a=t.indexOf("["),b=t.lastIndexOf("]");
    return JSON.parse(a>=0&&b>a?t.slice(a,b+1):t);
  };
  return f;
}
function aiStatusText(){
  if(!aiInfo.checked)return "Checking the AI connection…";
  if(!aiInfo.enabled)return "AI features are off. Add ANTHROPIC_API_KEY in your Vercel project’s environment variables, then redeploy. Everything else works without it.";
  if(aiInfo.needsCode&&!aiCode)return "AI is set up and protected with an access code. Enter it below.";
  return "AI is on: full lessons, extra questions and the tutor are available.";
}
function renderSettings(){
  $("#ai-status").textContent=aiStatusText();
  $("#code-row").hidden=!aiInfo.needsCode;
  $("#code").value=aiCode;
  $("#ai-dot").className="ai-dot "+(aiInfo.enabled&&(!aiInfo.needsCode||aiCode)?"on":"off");
}
$("#settings-btn").onclick=()=>{renderSettings();$("#settings").showModal();};
$("#close-settings").onclick=()=>$("#settings").close();
$("#save-code").onclick=()=>{aiCode=$("#code").value.trim();try{localStorage.setItem("dct-code",aiCode);}catch(e){}renderSettings();};
$("#backup").onclick=()=>{
  const lessons={};try{Object.keys(localStorage).filter(k=>k.startsWith("dct-lesson-")).forEach(k=>lessons[k]=localStorage.getItem(k));}catch(e){}
  const blob=new Blob([JSON.stringify({state,lessons},null,1)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="data-career-progress.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
};
$("#restore").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const d=JSON.parse(await f.text());
    if(!d.state||!Array.isArray(d.state.done))throw 0;
    state=Object.assign({start:"2026-11-02",done:[],notes:{},best:{}},d.state);persist();
    Object.entries(d.lessons||{}).forEach(([k,v])=>{if(k.startsWith("dct-lesson-"))try{localStorage.setItem(k,v);}catch(e){}});
    $("#restore-msg").textContent="Progress restored.";boot();route();
  }catch(err){$("#restore-msg").textContent="That file isn’t a progress backup from this site.";}
  e.target.value="";
};
(async()=>{
  try{
    const r=await fetch("/api/claude",{method:"GET"});
    if(r.ok){const j=await r.json();aiInfo.enabled=!!j.enabled;aiInfo.needsCode=!!j.needsCode;}
  }catch(e){}
  aiInfo.checked=true;renderSettings();
  if(aiInfo.enabled){sample=makeSample();$("#send").disabled=false;$("#tutor-note").textContent="";}
  else{$("#send").disabled=true;$("#tutor-note").textContent="The tutor needs the AI connection. Open AI settings (top right) for details.";}
  route();
})();

})();
