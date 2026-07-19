const APP_VERSION='1.4.1',QUESTION_BANK_VERSION='cles-v1-50-final',PROFILE_KEY='cles.activeProfile.v1',PROFILE_SET_KEY='cles.profileConfigured.v1',NAME_KEY='cles.learnerName.v1';let pendingSettingsProfile='';let DATA,WEEKLY,TODAY,allItems=[],groups=[],currentPack=[],currentIndex=0,currentWeekId='',answerLocked=false,timer,t0=0,limit=10,activeProfile=localStorage.getItem(PROFILE_KEY)||'';const E=id=>document.getElementById(id);
async function boot(){[DATA,WEEKLY,TODAY]=await Promise.all([fetch('data.json',{cache:'no-store'}).then(r=>r.json()),fetch('weekly.json',{cache:'no-store'}).then(r=>r.json()),fetch('today.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({days:{},default:{}}))]);allItems=DATA.items||[];groups=DATA.groups||[];bind();ensureProfileSelected();syncProfileUI();renderToday();renderWeeks();renderProgress();renderReview()}
function bind(){
 document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
 E('startReviewQueue').onclick=startReviewQueue;E('quitLearning').onclick=()=>finishSession();E('nextQuestion').onclick=nextQuestion;E('previousQuestion').onclick=previousQuestion;
 E('openSettings').onclick=()=>{loadSettingsForm();showScreen('settingsScreen')};
 E('saveSettings').onclick=saveSettings;
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.onclick=()=>selectSettingsProfile(b.dataset.settingsProfile));
 document.querySelectorAll('[data-gate-profile]').forEach(b=>b.onclick=()=>completeInitialProfile(b.dataset.gateProfile));
}
function setProfile(p){activeProfile=p;localStorage.setItem(PROFILE_KEY,p);syncProfileUI();renderProgress();renderReview()}
function syncProfileUI(){
 const learner=activeProfile==='learner';
 const learnerName=(localStorage.getItem(NAME_KEY)||'学習者').trim()||'学習者';
 E('activeUserChip').textContent=learner?learnerName:'管理者';
 E('modeChip').textContent=learner?'学習者モード':'管理・確認モード';
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.classList.toggle('active',b.dataset.settingsProfile===activeProfile));
}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));E(id).classList.add('active');if(id==='progressScreen')renderProgress();if(id==='reviewScreen')renderReview();if(id==='reviewQueueScreen')renderQueue()}
function logs(){return (CLESStorage.load().logs||[])}function learnerLogs(){return logs().filter(l=>l.user_profile?l.user_profile==='learner':(l.mode!=='test'&&l.app_mode!=='test'))}
function ensureProfileSelected(){
 const configured=localStorage.getItem(PROFILE_SET_KEY)==='true';
 const valid=activeProfile==='learner'||activeProfile==='developer';
 if(!configured||!valid){
   E('roleGate').classList.add('show');
 }else{
   E('roleGate').classList.remove('show');
 }
}
function completeInitialProfile(profile){
 if(profile!=='learner'&&profile!=='developer')return;
 activeProfile=profile;
 localStorage.setItem(PROFILE_KEY,profile);
 localStorage.setItem(PROFILE_SET_KEY,'true');
 if(!localStorage.getItem(NAME_KEY))localStorage.setItem(NAME_KEY,'学習者');
 E('roleGate').classList.remove('show');
 syncProfileUI();
 renderProgress();
 renderReview();
}
function loadSettingsForm(){
 pendingSettingsProfile=activeProfile||'learner';
 E('learnerName').value=localStorage.getItem(NAME_KEY)||'学習者';
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.classList.toggle('active',b.dataset.settingsProfile===pendingSettingsProfile));
}
function selectSettingsProfile(profile){
 if(profile!=='learner'&&profile!=='developer')return;
 pendingSettingsProfile=profile;
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.classList.toggle('active',b.dataset.settingsProfile===profile));
}
function saveSettings(){
 const name=(E('learnerName').value||'学習者').trim()||'学習者';
 const profile=pendingSettingsProfile||activeProfile||'learner';
 localStorage.setItem(NAME_KEY,name);
 localStorage.setItem(PROFILE_KEY,profile);
 localStorage.setItem(PROFILE_SET_KEY,'true');
 activeProfile=profile;
 syncProfileUI();
 renderProgress();
 renderReview();
 showScreen('homeScreen');
 alert('設定を保存しました。');
}
function renderToday(){
  const now=new Date();
  const key=String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const fallback={
    title:'今日は、新しい構造を一つ見つける日。',
    message:'正解を急ぐより、英文全体が何をしているかを一度見渡してみよう。',
    cles_message:'今日も10問。速く、でも決めつけずに。'
  };
  const d=(TODAY&&TODAY.days&&TODAY.days[key])||(TODAY&&TODAY.default)||fallback;
  E('todayTitle').textContent=d.title||fallback.title;
  E('todayMessage').textContent=d.message||fallback.message;
  E('todayClesMessage').textContent=d.cles_message||fallback.cles_message;
}

function renderWeeks(){let g=E('weekGrid');g.innerHTML='';WEEKLY.weeks.forEach(w=>{let c=document.createElement('div');c.className='card';c.innerHTML=`<h3>${w.label}: ${w.title}</h3><div class="small">${w.item_ids.length}問 / 学習ログ ${learnerLogs().filter(l=>l.week_id===w.id).length}件</div><div class="weekActions"><button class="btn primary">開始</button><button class="btn outline">復習</button></div>`;let b=c.querySelectorAll('button');b[0].onclick=()=>startWeek(w.id,false);b[1].onclick=()=>startWeek(w.id,true);g.appendChild(c)})}
function mapItems(){return Object.fromEntries(allItems.map(x=>[x.id,x]))}function startWeek(id,review){let w=WEEKLY.weeks.find(x=>x.id===id),m=mapItems(),a=w.item_ids.map(x=>m[x]).filter(Boolean);currentPack=smartSort(a,review?weakTypes():{}).slice(0,10);currentIndex=0;currentWeekId=id;E('learnTitle').textContent=`${w.label}: ${w.title}`;showScreen('learnScreen');renderQuestion()}
function startReviewQueue(){currentPack=smartSort([...allItems],weakTypes()).slice(0,10);currentIndex=0;currentWeekId='review-queue';E('learnTitle').textContent='Review Queue';showScreen('learnScreen');renderQuestion()}
function weakTypes(){let out={};groups.forEach(g=>{let l=learnerLogs().filter(x=>(x.correct_answer||x.type)===g.id);if(!l.length){out[g.id]=.5;return}let acc=l.filter(x=>x.ok).length/l.length,mas=l.reduce((a,b)=>a+(+b.mastery_score||0),0)/l.length/100;out[g.id]=1-(acc+mas)/2});return out}
function smartSort(a,w){let recent=new Set(learnerLogs().slice(-8).map(x=>x.item_id));return a.map(it=>({it,score:Math.random()*20+(w[it.type]||0)*25-(recent.has(it.id)?15:0)})).sort((x,y)=>y.score-x.score).map(x=>x.it)}
function renderQuestion(){answerLocked=false;E('feedback').classList.add('hidden');let it=currentPack[currentIndex];E('questionMeta').textContent=`${it.theme} / ${it.chunk}`;E('questionTitle').textContent=it.title;E('sentence').innerHTML=highlight(it.sentence,it.chunk)+`<div class="jp">${it.jp}</div>`;E('questionCounter').textContent=`${currentIndex+1}/${currentPack.length}`;E('nextQuestion').textContent=currentIndex===currentPack.length-1?'レビューへ':'次へ';drawChoices();startTimer()}
function highlight(s,c){let e=c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return s.replace(new RegExp(e,'i'),m=>`<span style="color:#fb7c13;background:#fff3df;border-radius:8px;padding:0 5px">${m}</span>`)}
function drawChoices(){let b=E('choices');b.innerHTML='';groups.forEach(g=>{let x=document.createElement('button');x.className='choice';x.innerHTML=`${g.label}<br><span class="small">${g.id}</span>`;x.onclick=()=>answer(g.id,x);b.appendChild(x)})}
function startTimer(){clearInterval(timer);t0=Date.now();timer=setInterval(()=>{let r=Math.max(0,limit-(Date.now()-t0)/1000);E('timeText').textContent=r.toFixed(1);E('timeBar').style.width=(r/limit*100)+'%';if(r<=0)clearInterval(timer)},100)}function elapsed(){clearInterval(timer);return +((Date.now()-t0)/1000).toFixed(2)}
function mastery(ok,t){let s=t<=3?42:t<=5?31:t<=8?18:t<=10?7:0;return ok?Math.min(100,44+s):Math.max(0,18+Math.round(s*.2)-(t<=6?12:0))}
function answer(ans,btn){if(answerLocked)return;answerLocked=true;let it=currentPack[currentIndex],t=elapsed(),ok=ans===it.type,m=mastery(ok,t);[...E('choices').children].forEach(b=>{b.disabled=true;if(b.textContent.includes(it.type))b.classList.add('correct')});btn.classList.add(ok?'correct':'wrong');let log={ts:new Date().toISOString(),session_id:`S${new Date().toISOString().slice(0,10).replaceAll('-','')}_${currentWeekId}_${activeProfile}`,item_index:currentIndex+1,item_id:it.id,type:it.type,theme:it.theme,title:it.title,chunk:it.chunk,answer:ans,correct_answer:it.type,ok,time_sec:t,timeout:t>limit,mastery_score:m,sentence:it.sentence,jp:it.jp,feedback:ok?`この読み方でOKです。ポイントは、"${it.chunk}" の前後を見ることです。`:`今回は「${label(it.type)}」が一番自然です。ポイントは、"${it.chunk}" の前後を見ることです。`,user_profile:activeProfile,app_mode:activeProfile==='learner'?'learning':'test',app_version:APP_VERSION,question_bank_version:QUESTION_BANK_VERSION,week_id:currentWeekId,device_info:getDeviceInfo()};let d=CLESStorage.load();CLESStorage.save({logs:[...(d.logs||[]),log],state:d.state||{}});showFeedback(log)}
function label(id){return (groups.find(g=>g.id===id)||{}).label||id}function showFeedback(l){let f=E('feedback');f.classList.remove('hidden');f.className='feedback '+(l.ok?'ok':'ng');let s=l.ok&&l.time_sec<=3?'3秒以内で正解。構造がかなり速く見えています。':!l.ok&&l.time_sec<=6?'速く間違えています。根拠を1つ確認しましょう。':l.ok&&l.time_sec>=8?'正解ですが少し時間がかかっています。':'正誤だけでなく、どこを見たかを確認しましょう。';f.innerHTML=`<b>${l.ok?'正解':'惜しい'}</b><br>${l.feedback}<br><br>${s}`}
function nextQuestion(){if(!answerLocked)return;if(currentIndex>=currentPack.length-1){finishSession();return}currentIndex++;renderQuestion()}function previousQuestion(){if(currentIndex>0){currentIndex--;renderQuestion()}}
function finishSession(){clearInterval(timer);showScreen('reviewScreen');if(activeProfile==='learner'){renderReview(learnerLogs().filter(x=>x.session_id===`S${new Date().toISOString().slice(0,10).replaceAll('-','')}_${currentWeekId}_learner`))}else{E('reviewText').innerHTML='<b>管理・確認モードでの実行です。</b><br><br>この結果は学習者の理解度・成長データには反映されません。';E('reviewWarning').innerHTML='設定から学習者モードへ切り替えると、学習レビューを開始できます。'}}
function aggregate(l){let n=l.length,ok=l.filter(x=>x.ok).length,avg=n?l.reduce((a,b)=>a+(+b.time_sec||0),0)/n:0,mas=n?l.reduce((a,b)=>a+(+b.mastery_score||0),0)/n:0;return{n,accuracy:n?Math.round(ok/n*100):0,avg:+avg.toFixed(1),mastery:Math.round(mas),fastWrong:l.filter(x=>!x.ok&&(+x.time_sec||99)<=6).length}}
function renderProgress(){let l=learnerLogs(),a=aggregate(l);E('statsGrid').innerHTML=[['問題数',a.n],['正答率',a.accuracy+'%'],['理解度',a.mastery+'%'],['平均時間',a.avg+'s']].map(x=>`<div class="stat"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');let p=E('functionProgress');p.innerHTML='';groups.forEach(g=>{let q=l.filter(x=>(x.correct_answer||x.type)===g.id),z=aggregate(q),sc=q.length?Math.round((z.accuracy+z.mastery)/2):0;p.innerHTML+=`<div class="progressRow"><div class="progressRowTop"><span>${g.label} / ${g.id}</span><span>${sc}%</span></div><div class="meter"><div class="fill" style="width:${sc}%"></div></div></div>`})}
function renderReview(src){let l=src&&src.length?src:learnerLogs().slice(-10),a=aggregate(l),by={};groups.forEach(g=>{let q=l.filter(x=>(x.correct_answer||x.type)===g.id);if(q.length)by[g.id]=aggregate(q)});let weak=Object.entries(by).sort((x,y)=>(x[1].accuracy+x[1].mastery)-(y[1].accuracy+y[1].mastery))[0],strong=Object.entries(by).sort((x,y)=>(y[1].accuracy+y[1].mastery)-(x[1].accuracy+x[1].mastery))[0];if(!l.length){E('reviewText').innerHTML='まだ学習ログがありません。今週号を10問だけ試してみましょう。';E('reviewWarning').innerHTML='管理・確認モードのログは学習レビューに入りません。';return}E('reviewText').innerHTML=`<b>直近${l.length}問のレビュー</b><br><br>正答率：${a.accuracy}%<br>理解度：${a.mastery}%<br>平均回答時間：${a.avg}秒<br><br>${strong?`得意：${label(strong[0])}<br>`:''}${weak?`次に見るポイント：${label(weak[0])}<br><br>`:''}${a.fastWrong?'速く間違えた問題があります。根拠を一つ確認しましょう。':'速さと正確さのバランスを確認しましょう。'}`;E('reviewWarning').innerHTML=`<b>次の10問への反映</b><br>${weak?label(weak[0])+'を少し多めにします。':''} 同じ型やキーワードばかりにはしません。`}
function renderQueue(){let t=Object.entries(weakTypes()).sort((a,b)=>b[1]-a[1]).slice(0,3);E('queueDescription').innerHTML=t.length?`現在の重点：${t.map(x=>label(x[0])).join(' / ')}。同じFunctionの別表現を混ぜます。`:'まずは今週号を解いてください。'}
function getDeviceInfo(){let ua=navigator.userAgent||'',os=/Android/i.test(ua)?'Android':(/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))?'iOS/iPadOS':/Windows/i.test(ua)?'Windows':/Macintosh|Mac OS X/i.test(ua)?'macOS':'Other',browser=/Edg/i.test(ua)?'Edge':/CriOS|Chrome/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'Other';return{device_id:getDeviceId(),os,browser,user_agent:ua,screen:`${screen.width}x${screen.height}`,touch_points:navigator.maxTouchPoints||0}}
function getDeviceId(){let id=localStorage.getItem('cles.deviceId.v1');if(!id){id='dev_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('cles.deviceId.v1',id)}return id}boot().catch(err=>{console.error(err);const t=E('todayTitle');if(t)t.textContent='今日は、新しい構造を一つ見つける日。';const m=E('todayMessage');if(m)m.textContent='データを読み込めませんでした。ページを再読み込みしてください。';});