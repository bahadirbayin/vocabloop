
let WORDS = [];
let state = JSON.parse(localStorage.getItem("vocabloop_state") || "null") || {
  level:"B1", progress:{}, plan:null, quizHistory:[], settings:{quizHour:"21:00"}
};
let currentQuiz = null;

const save = () => localStorage.setItem("vocabloop_state", JSON.stringify(state));
const dayKey = (d=new Date()) => d.toISOString().slice(0,10);
const isSunday = (d=new Date()) => d.getDay() === 0;

function weekStart(d=new Date()){
  const x=new Date(d); const day=x.getDay(); const diff=(day===0?-6:1-day);
  x.setDate(x.getDate()+diff); x.setHours(0,0,0,0); return x;
}
function shuffled(a){ return [...a].sort(()=>Math.random()-0.5); }

async function init(){
  WORDS = await fetch("words.json").then(r=>r.json());
  ensurePlan();
  renderAll();
  setInterval(()=>renderCurrentWord(), 60*1000);
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
}

function ensurePlan(){
  const today=dayKey();
  if(state.plan && state.plan.day===today) return;
  const levelWords=WORDS.filter(w=>w.level===state.level);
  const due = Object.values(state.progress).filter(p => !p.learned && (!p.nextReview || p.nextReview<=today));
  const dueIds = due.sort((a,b)=>(b.wrong||0)-(a.wrong||0)).map(p=>p.id);

  if(isSunday()){
    const start=weekStart();
    const weekly = Object.values(state.progress)
      .filter(p => p.lastSeen && new Date(p.lastSeen)>=start)
      .sort((a,b)=>(b.wrong||0)-(a.wrong||0))
      .map(p=>p.id);
    state.plan={day:today,newIds:[],reviewIds:[...new Set([...dueIds,...weekly])].slice(0,40)};
  }else{
    const unseen=levelWords.filter(w=>!state.progress[w.id]);
    state.plan={day:today,newIds:shuffled(unseen).slice(0,10).map(w=>w.id),reviewIds:dueIds.slice(0,20)};
  }
  save();
}

function todaysWords(){
  const ids=[...(state.plan?.newIds||[]),...(state.plan?.reviewIds||[])];
  return ids.map(id=>WORDS.find(w=>w.id===id)).filter(Boolean);
}

function currentWord(){
  const list=todaysWords();
  const fallback=WORDS.filter(w=>w.level===state.level);
  if(!list.length) return fallback[0];
  const slot=Math.floor(Date.now()/(30*60*1000));
  return list[Math.abs(slot)%list.length];
}

function renderCurrentWord(forceOffset=0){
  const list=todaysWords();
  const use=list.length?list:WORDS.filter(w=>w.level===state.level);
  if(!use.length) return;
  const slot=Math.floor(Date.now()/(30*60*1000))+forceOffset;
  const w=use[Math.abs(slot)%use.length];
  const ex=w.examples[Math.abs(slot)%w.examples.length];

  document.getElementById("wordLevel").textContent=w.level;
  document.getElementById("wordEn").textContent=w.en;
  document.getElementById("wordTr").textContent=w.tr;
  document.getElementById("exEn").textContent=ex.en;
  document.getElementById("exTr").textContent=ex.tr;
  const img=document.getElementById("wordImage");
  img.src=w.image;
  img.onerror=()=>{img.style.display="none"};
  img.onload=()=>{img.style.display="block"};
  document.getElementById("slotInfo").textContent="≈ 30 dk döngü";
}

let manualOffset=0;
function nextCard(){ manualOffset++; renderCurrentWord(manualOffset); }

function speakCurrent(){
  const text=document.getElementById("wordEn").textContent;
  const u=new SpeechSynthesisUtterance(text); u.lang="en-US"; speechSynthesis.speak(u);
}

function renderAll(){
  document.getElementById("todayLine").textContent=new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"});
  document.getElementById("levelBadge").textContent=state.level;
  document.getElementById("levelSelect").value=state.level;
  document.getElementById("quizHour").value=state.settings.quizHour||"21:00";
  document.getElementById("sundayBanner").style.display=isSunday()?"block":"none";
  document.getElementById("newCount").textContent=state.plan?.newIds?.length||0;
  document.getElementById("reviewCount").textContent=state.plan?.reviewIds?.length||0;
  renderCurrentWord();
  renderStats();
  renderQuizDue();
}

function renderQuizDue(){
  const now=new Date();
  const [h,m]=(state.settings.quizHour||"21:00").split(":").map(Number);
  const due=new Date(); due.setHours(h,m,0,0);
  document.getElementById("quizDueText").textContent = now>=due
    ? "Bugünün mini quizi hazır."
    : `Quiz saatin ${state.settings.quizHour}. İstersen şimdi de çözebilirsin.`;
}

function saveLevel(){
  state.level=document.getElementById("levelSelect").value;
  state.plan=null; save(); ensurePlan(); renderAll(); showView("home");
}

function saveSettings(){
  state.settings.quizHour=document.getElementById("quizHour").value||"21:00"; save(); renderQuizDue();
}

function resetAll(){
  if(confirm("Tüm ilerleme silinsin mi?")){
    localStorage.removeItem("vocabloop_state"); location.reload();
  }
}

function showView(v){
  ["home","quiz","level","stats","settings"].forEach(x=>{
    const el=document.getElementById(x+"View"); if(el) el.classList.toggle("hidden",x!==v);
  });
  ["Home","Quiz","Level","Stats"].forEach(x=>{
    const b=document.getElementById("nav"+x); if(b) b.classList.toggle("active",x.toLowerCase()===v);
  });
  if(v==="quiz" && !currentQuiz) startQuiz("daily", false);
  if(v==="stats") renderStats();
}

function getQuizWords(kind){
  if(kind==="daily") return shuffled(todaysWords()).slice(0,10);
  const start=weekStart();
  let ids=Object.values(state.progress)
    .filter(p=>p.lastSeen && (new Date(p.lastSeen)>=start || !p.learned))
    .sort((a,b)=>(b.wrong||0)-(a.wrong||0))
    .map(p=>p.id);
  return shuffled([...new Set(ids)]).slice(0,30).map(id=>WORDS.find(w=>w.id===id)).filter(Boolean);
}

function startQuiz(kind, switchView=true){
  const words=getQuizWords(kind);
  currentQuiz={kind,words,index:0,correct:0,wrong:[]};
  if(switchView) showView("quiz");
  renderQuiz();
}

function renderQuiz(){
  const q=currentQuiz;
  const box=document.getElementById("choices");
  if(!q || !q.words.length){
    document.getElementById("quizTitle").textContent="Quiz";
    document.getElementById("quizWord").textContent="Henüz quiz için yeterli kelime yok.";
    box.innerHTML="";
    return;
  }
  if(q.index>=q.words.length){
    finishQuiz(); return;
  }
  const w=q.words[q.index];
  document.getElementById("quizTitle").textContent=q.kind==="daily"?"Günlük Quiz":"Haftalık Quiz";
  document.getElementById("quizCounter").textContent=`${q.index+1}/${q.words.length}`;
  document.getElementById("quizBar").style.width=`${(q.index/q.words.length)*100}%`;
  document.getElementById("quizWord").textContent=w.en;

  const distractors=shuffled(WORDS.filter(x=>x.level===w.level && x.id!==w.id)).slice(0,3).map(x=>x.tr);
  const choices=shuffled([w.tr,...distractors]);
  box.innerHTML="";
  choices.forEach(c=>{
    const b=document.createElement("button"); b.className="btn choice"; b.textContent=c;
    b.onclick=()=>answerQuiz(w,c===w.tr); box.appendChild(b);
  });
}

function answerQuiz(w,ok){
  const today=dayKey();
  let p=state.progress[w.id]||{id:w.id,correct:0,wrong:0,correctDays:0,lastCorrectDay:null,learned:false};
  p.lastSeen=new Date().toISOString();
  if(ok){
    currentQuiz.correct++; p.correct++;
    if(p.lastCorrectDay!==today){ p.correctDays++; p.lastCorrectDay=today; }
    if(p.correctDays>=3){ p.learned=true; p.nextReview=plusDays(today,7); }
    else p.nextReview=plusDays(today,2);
  }else{
    currentQuiz.wrong.push(w.id); p.wrong++; p.correctDays=0; p.learned=false; p.nextReview=plusDays(today,1);
  }
  state.progress[w.id]=p; save();
  currentQuiz.index++; renderQuiz();
}

function plusDays(iso,n){ const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return dayKey(d); }

function finishQuiz(){
  const q=currentQuiz;
  state.quizHistory.unshift({date:new Date().toISOString(),kind:q.kind,total:q.words.length,correct:q.correct,wrong:q.wrong});
  state.quizHistory=state.quizHistory.slice(0,50); save();
  document.getElementById("quizBar").style.width="100%";
  document.getElementById("quizCounter").textContent="";
  document.getElementById("quizWord").textContent=`${q.correct} / ${q.words.length}`;
  document.getElementById("choices").innerHTML=`<p class="sub">${q.wrong.length ? q.wrong.length+" kelime tekrar havuzuna alındı." : "Harika, bu tur tamamlandı."}</p><button class="btn primary" onclick="startQuiz('${q.kind}')">Tekrar çöz</button>`;
  renderStats();
}

function renderStats(){
  const ps=Object.values(state.progress);
  document.getElementById("learnedStat").textContent=ps.filter(p=>p.learned).length;
  document.getElementById("learningStat").textContent=ps.filter(p=>!p.learned).length;
  const h=document.getElementById("history");
  h.innerHTML=(state.quizHistory||[]).slice(0,8).map(x=>{
    const d=new Date(x.date).toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    return `<div style="padding:10px 0;border-bottom:1px solid #25314a"><b>${x.kind==="daily"?"Günlük":"Haftalık"} Quiz</b><br><span class="tiny">${d} • ${x.correct}/${x.total}</span></div>`;
  }).join("") || '<span class="sub">Henüz quiz sonucu yok.</span>';
}

init();
