(() => {
  const sample=window.LESSON;
  const units=window.UNITS;
  let lesson=sample, course=null, semester="六上", cornerUnlocked=false;
  const world = window.World;
  const $ = selector => document.querySelector(selector);
  const set = (selector, value) => { $(selector).textContent = value; };
  const dialog = $("#dialog"), body = $("#dialog-body");
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
  const state = {mode:"home",...world.spawn,dir:Math.PI,phase:0,repair:0,active:[]};
  const keys = new Set(), touch = new Map();
  const movement = {w:"up",a:"left",s:"down",d:"right",arrowup:"up",arrowleft:"left",arrowdown:"down",arrowright:"right"};
  const pins = new Map();
  let stage=0, heard=new Set(), records=[], tries=[0,0,0], nearby, toastTimer, repairStart=0, chosenPlan=null, selectedMore="";
  let previousTime=0,lastFocus=null,route=[],guideTarget=null;
  const progressKey="lost-town-memories-progress-v1";
  const shareOrigin=location.origin;
  const fx=(name)=>window.dispatchEvent(new CustomEvent("ltm:fx",{detail:name}));
  let playStart=Date.now();
  const currentId=()=>course?.id??"sample";
  let progress={};
  try { progress=JSON.parse(localStorage.getItem(progressKey))??{}; } catch {}
  const getProgress=id=>progress[id]??{};
  function saveProgress(completed=false){
    const id=currentId(), previous=getProgress(id);
    progress[id]={
      completed:completed||previous.completed===true,
      checkpoint:completed?null:{stage,heard:[...heard],records,tries:[...tries],cornerUnlocked}
    };
    try { localStorage.setItem(progressKey,JSON.stringify(progress)); } catch {}
    window.dispatchEvent(new CustomEvent("ltm:save",{detail:{id,completed,
      tries:tries.reduce((a,b)=>a+b,0),seconds:Math.round((Date.now()-playStart)/1000),title:course?.unit??"港灣市集"}}));
  }
  function progressLabel(id){
    const {completed,checkpoint}=getProgress(id);
    if(completed)return checkpoint?"已完成 · 可續玩":"已完成";
    return checkpoint?"探索中 · "+checkpoint.stage+" / 3 枚":"尚未開始";
  }

  set("#source-tag","翰林版社會 · 六年級");
  set("#footer-source","六上／六下課前預習");
  if(!world.available) $("#stage").classList.add("fallback");

  const modeNames={pick:"找出證據",match:"線索配對",sort:"卡片排序",route:"連接路線",budget:"分配預算",stance:"方案與證據",corners:"四角站位"};
  const stationLocations={
    market:[[-8,0],[1,-2],[8,2]],industry:[[-8,-1],[1,3],[7,-3]],lab:[[-7,0],[0,-4],[7,-2]],
    civic:[[-7,-1],[0,-4],[8,-1]],culture:[[-8,-1],[-1,-4],[8,-2]],debate:[[-3,4],[0,-2],[0,-7]],
    trade:[[-11,2],[0,-3],[8,0]],aid:[[-7,-1],[1,-4],[7,1]],nature:[[-8,-3],[1,0],[9,4]],
    action:[[-7,-1],[1,-3],[8,-2]]
  };
  const corners=[[-6,-6],[6,-6],[-6,2],[6,2]];
  function point(id){return lesson.landmarks.find(item=>item.id===id);}
  function createPins(){
    pins.clear();$("#markers").replaceChildren();
    for(const place of lesson.landmarks){
      const pin=document.createElement("button");
      pin.type="button";pin.setAttribute("aria-label","走向"+place.name);
      pin.addEventListener("click",()=>{route=findRoute(place);});
      pin.className="pin";pin.textContent=place.name;pin.hidden=true;
      $("#markers").append(pin);pins.set(place.id,pin);
    }
  }
  function startFilm(id){
    const entry=units.find(unit=>unit.id===id)??sample;
    const shots={
      wallet:["🎫","🍱","🪙"],history:["🌾","🏭","🔬"],tech:["📱","☀️","🔬"],
      civic:["📜","🗣️","🌳"],culture:["🍲","🧵","🏮"],debate:["📋","💬","🎙️"],
      trade:["🧶","🛳️","🛍️"],society:["🌧️","🚚","🤝"],earth:["🌧️","🏞️","🌱"],
      action:["🔎","📝","🌿"],sample:["⛵","🧺","🏘️"]
    };
    const captions=entry.story.match(/[^。！？]+[。！？]?/g)??[entry.story];
    const frames=[captions[0],captions.slice(1).join("")||entry.concept,
      "第一站　"+(entry.tasks[0].station??entry.landmarks[0].name)];
    open(entry.chapter,"關卡序幕",'<div class="film"><div class="film-symbol" aria-hidden="true"></div><p class="film-caption" aria-live="polite"></p><div class="film-time"></div></div>'+
      actions(action("跳過動畫","skip-film")),{closable:false});
    dialog.style.setProperty("--film-color",entry.color??"#376f88");
    function draw(i){
      const symbol=$(".film-symbol");
      symbol.textContent=shots[id][i];
      if(!matchMedia("(prefers-reduced-motion: reduce)").matches)
        symbol.animate([{opacity:0,transform:"translateX(-28px) scale(.82)"},{opacity:1,transform:"translateX(0) scale(1)"},{opacity:1,transform:"translateX(12px) scale(1.08)"}],{duration:3900,fill:"forwards"});
      set(".film-caption",frames[i]);
    }
    let i=0;
    draw(i);
    const timer=setInterval(()=>{if(++i===3)end();else draw(i);},4000);
    const skip=body.querySelector('[data-action="skip-film"]');
    function end(){
      clearInterval(timer);
      skip.removeEventListener("click",end);
      enterLesson(id,false);
    }
    skip.addEventListener("click",end);
    skip.focus();
  }
  function enterLesson(id,resume){
    course=units.find(unit=>unit.id===id)??null;
    lesson=sample;
    if(course){
      const landmarks=course.tasks.map((task,index)=>{
        const [x,z]=stationLocations[course.scene][index];
        return {id:"task"+index,x,z,name:task.station,action:"和"+task.speaker+"互動",index};
      });
      if(course.scene==="debate"){
        corners.forEach(([x,z],index)=>{
          const name=course.tasks[1].plans[index][0];
          landmarks.push({id:"corner"+index,x,z,name,action:"選擇「"+name+"」",corner:true,index});
        });
      }
      lesson={...course,landmarks};
    }
    const label=course?course.volume+" · 第 "+course.number+" 單元":"架空示範關卡";
    set("#source-tag",label);
    set("#footer-source",course?course.unit+" ・ 架空冒險情境":"港灣城為架空場景");
    world.configure(course?.scene??"harbor",lesson.landmarks);
    createPins();
    close();reset(resume?getProgress(id).checkpoint:null);
    playStart=Date.now();
    saveProgress();
    if(stage===3) crystalPanel();
    else if(resume) notice("已回到上次的任務。");
  }
  function lessonEntry(id){
    const unit=units.find(item=>item.id===id);
    const entry=unit??sample;
    const {checkpoint,completed}=getProgress(id);
    const label=unit?unit.volume+" · 第 "+unit.number+" 單元 · "+unit.unit:"架空示範關卡";
    if(unit)semester=unit.volume;
    open(entry.chapter,label,para(entry.story)+para(entry.concept)+
      '<p class="entry-progress">'+esc(progressLabel(id))+'</p>'+
      actions(action("選擇單元","picker","quiet"),action("分享此關","share-"+id,"quiet"),
        action(checkpoint?"繼續冒險":completed?"再玩一次":"開始冒險",(checkpoint?"resume-":"play-")+id)));
  }
  function shareLesson(id){
    const entry=units.find(item=>item.id===id)??sample;
    const url=shareOrigin+"/?unit="+encodeURIComponent(id);
    open("分享此關",entry.chapter,
      '<img class="share-qr" src="qr/'+esc(id)+'.png" alt="掃描 QR Code 直接開啟此關" width="216" height="216">'+
      '<label class="share-label">關卡連結<input id="share-url" type="url" readonly value="'+esc(url)+'"></label>'+
      '<p id="share-status" role="status"></p>'+
      actions(action("返回關卡","unit-"+id,"quiet"),action("複製連結","copy-share")));
  }
  async function copyShare(){
    const input=$("#share-url"), status=$("#share-status");
    try {
      await navigator.clipboard.writeText(input.value);
      status.textContent="已複製關卡連結。";
    } catch {
      input.focus();
      input.select();
      status.textContent="已選取關卡連結，請使用瀏覽器的複製功能。";
    }
  }
  createPins();

  function reset(checkpoint){
    stage=0;heard=new Set();records=[];tries=[0,0,0];chosenPlan=null;selectedMore="";cornerUnlocked=false;
    Object.assign(state,world.spawn,{mode:"play",dir:Math.PI,phase:0,repair:0});
    if(checkpoint){
      ({stage,records,tries,cornerUnlocked}=checkpoint);
      records=[...records];tries=[...tries];heard=new Set(checkpoint.heard);
      const lastStation=course&&stage>0&&lesson.landmarks[stage-1];
      if(lastStation&&world.walkable(lastStation.x,lastStation.z)){
        Object.assign(state,{x:lastStation.x,z:lastStation.z});
      }
    }
    nearby=null;route=[];clearGuide();keys.clear();touch.clear();
    $("#interact").hidden=true;
    $("#repair").hidden=true;$("#toast").hidden=true;
    mode("play");
    updateHUD();
    if(window.scrollY)window.scrollTo(0,0);
    $("#stage").focus({preventScroll:true});
  }
  function mode(name){
    state.mode=name;$("#app").dataset.mode=name;
    $("#home").hidden=name!=="home";
    $("#mission").hidden=name!=="play";
    $("#progress").hidden=name==="home";
    $("#controls").hidden=name!=="play";
    $("#switch").hidden=name!=="play";
    $("#home-link").disabled=name==="home";
    if(name!=="play")$("#interact").hidden=true;
  }
  function updateHUD(){
    const task=lesson.tasks[stage];
    state.active=course?(stage===3?[]:cornerUnlocked&&stage===1?lesson.landmarks.filter(p=>p.corner).map(p=>p.id):["task"+stage]):stage===0?["map"]:stage===1?["sailor","vendor"].filter(id=>!heard.has(id)):stage===2?["council"]:[];
    set("#count",stage+" / 3");
    document.querySelectorAll(".gems i").forEach((gem,index)=>gem.classList.toggle("on",index<stage));
    if(!task)return;
    set("#mission-no","任務 "+(stage+1)+" / 3");
    set("#mission-title",course?modeNames[task.type]:task.name);
    set("#mission-hint",course?(cornerUnlocked&&stage===1?"走到你支持的角落，再提出理由。":"走到發光的地標，查看線索並完成任務。"):task.guide);
    const next=course&&cornerUnlocked&&stage===1?"四個立場角落":state.active.map(id=>point(id).name).join("、");
    set("#destination",next||(course?"":point("sailor").name+"或"+point("vendor").name));
    $("#destination").disabled=state.active.length!==1;
    $("#route-help").disabled=state.active.length===0;
    if(guideTarget&&!state.active.includes(guideTarget.id))clearGuide();
  }
  function notice(text){
    set("#toast",text);$("#toast").hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$("#toast").hidden=true;},2900);
  }
  function open(title,kicker,content,{closable=true}={}){
    dialog.classList.remove("projection");
    if(!dialog.open) lastFocus=document.activeElement;
    body.innerHTML='<div class="dialog-head"><div><p class="eyebrow">'+esc(kicker)+'</p><h2 id="dialog-title" tabindex="-1">'+esc(title)+'</h2></div>'+
      (closable?'<button class="close" data-action="close" aria-label="關閉視窗" type="button">×</button>':'')+'</div>'+content;
    body.dataset.locked=String(!closable);
    keys.clear();touch.clear();
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
    $("#dialog-title").focus({preventScroll:true});
  }
  function close(){
    if(!dialog.open)return;
    dialog.close();
    if(lastFocus&&!lastFocus.hidden&&lastFocus.getClientRects().length)lastFocus.focus({preventScroll:true});
  }
  dialog.addEventListener("cancel",event=>{event.preventDefault();if(body.dataset.locked!=="true")close();});
  const action=(label,id,style="primary")=>'<button type="button" class="'+style+'" data-action="'+id+'">'+esc(label)+'</button>';
  const actions=(...buttons)=>'<div class="dialog-actions">'+buttons.join("")+'</div>';
  const para=text=>'<p class="dialog-text">'+esc(text)+'</p>';
  const feedback='<p id="feedback" class="feedback" tabindex="-1" role="status" hidden></p>';

  let sequence=[], stanceIndex=null;
  function picker(){
    const cards=units.filter(unit=>unit.volume===semester).map(unit=>{
      const types=[...new Set(unit.tasks.map(task=>modeNames[task.type]))].join("、");
      return '<div class="unit-tile" style="--unit-color:'+unit.color+'">'+
        '<button type="button" class="unit-card" data-action="unit-'+unit.id+'">'+
        '<span class="unit-kicker">第 '+unit.number+' 單元</span><strong>'+esc(unit.unit)+'</strong>'+
        '<span>'+esc(unit.chapter)+'</span><small>'+esc(types)+'</small></button>'+
        '<div class="unit-tile-footer"><span>'+esc(progressLabel(unit.id))+'</span>'+
        '<button type="button" class="unit-share" data-action="share-'+unit.id+'" aria-label="'+esc("分享此關："+unit.unit)+'">分享此關</button></div></div>';
    }).join("");
    open("選擇單元","翰林版六年級社會",
      '<div class="semester" role="group" aria-label="選擇學期">'+
      '<button type="button" data-action="six-top" aria-pressed="'+(semester==="六上")+'">六上</button>'+
      '<button type="button" data-action="six-bottom" aria-pressed="'+(semester==="六下")+'">六下</button></div>'+
      '<div class="units">'+cards+'</div><div class="dialog-actions">'+action("遊玩原創示範：港灣市集","unit-sample","quiet")+'</div>',
      {closable:state.mode!=="end"});
  }
  function checkOptions(options,name){
    return options.map((option,i)=>'<label class="choice"><input type="checkbox" name="'+name+'" value="'+i+'"><span>'+esc(option)+'</span></label>').join("");
  }
  function unitInteract(place){
    const task=lesson.tasks[stage];
    if(place.corner){
      showUnitTask(task,place.index);
      return;
    }
    if(place.index!==stage){
      open(place.name,"目前任務",para("請先前往畫面上發光的任務地標。")+actions(action("返回探索","close")));
      return;
    }
    if(task.type==="corners"){
      open(task.station,task.speaker,para(task.clue)+para("綠、黃、藍、粉四個角落代表不同立場。讀過線索後，走到你支持的一角。")+
        actions(action("到四角選擇立場","corners")));
      return;
    }
    showUnitTask(task);
  }
  function showUnitTask(task,corner=null){
    sequence=[];stanceIndex=corner;
    let activity="";
    if(task.type==="sort"||task.type==="route"){
      activity='<div class="order-slot'+(task.type==="route"?" route-slot":"")+'" id="order-slot" aria-label="已選順序"></div>'+
        (task.map?riverMap(task):'<div class="order-options">'+task.options.map((item,i)=>action(item,"order-"+i,"order-option")).join("")+'</div>')+
        actions(action("清除排序","clear-order","quiet"));
    }
    if(task.type==="match"){
      activity=task.rows.map((row,i)=>'<label class="match"><span>'+esc(row)+'</span><select name="unit-match'+i+'" required><option value="">請配對</option>'+
        task.options.map((item,index)=>'<option value="'+index+'">'+esc(item)+'</option>').join("")+'</select></label>').join("");
    }
    if(task.type==="pick"){
      activity=task.answer.length===1?radio("unit-answer",task.options,"請選一項"):
        '<fieldset class="choices"><legend>請選 '+task.answer.length+' 項</legend>'+checkOptions(task.options,"unit-answer")+'</fieldset>';
    }
    if(task.type==="budget"){
      activity='<div class="budget" id="budget-status" aria-live="polite"></div>'+
        (task.basket?basket(task):'<fieldset class="choices"><legend>選擇要支出的項目</legend>'+
          checkOptions(task.items.map(([name,cost])=>name+" ・ "+cost+" "+(task.currency||"點")),"unit-answer")+'</fieldset>');
    }
    if(task.type==="stance"||task.type==="corners"){
      activity=corner===null?radio("unit-plan",task.plans.map(plan=>plan[0]),"你的提案"):
        '<p class="impact">你站在「'+esc(task.plans[corner][0])+'」一角。'+esc(task.plans[corner][1])+'</p>';
      activity+=radio("unit-evidence",task.options,"支持你選擇的線索");
      if(corner===null)activity+='<p class="impact" id="unit-impact" hidden></p>';
    }
    open(task.station,"任務 "+(stage+1)+" · "+task.speaker,
      '<div class="lesson-clue"><strong>線索</strong>'+para(task.clue)+'</div>'+para(task.prompt)+
      '<form data-unit-task>'+activity+feedback+submit("確認答案")+'</form>');
    if(task.type==="sort"||task.type==="route")updateOrder();
    if(task.type==="budget")updateBudget(task);
  }
  function riverMap(task){
    return '<div class="river-map" role="group" aria-label="潮汐島河流地圖">'+
      '<div class="river-water" aria-hidden="true"></div><div class="river-links" aria-hidden="true"></div>'+
      task.options.map((name,index)=>'<button type="button" class="river-spot spot-'+index+
        '" aria-pressed="false" data-action="order-'+index+'"><span class="river-number" aria-hidden="true"></span>'+
        esc(name)+'</button>').join("")+'</div>';
  }
  function basket(task){
    const symbols=["🎫","🍱","🔑","🥤"];
    const products=task.items.map(([name,cost],index)=>
      '<label class="product"><input type="checkbox" name="unit-answer" value="'+index+'">'+
      '<span class="product-icon" aria-hidden="true">'+symbols[index]+'</span><strong>'+esc(name)+
      '</strong><span>'+cost+' 星幣</span></label>').join("");
    return '<fieldset class="shop"><legend>市集攤位</legend><div class="product-grid">'+products+'</div></fieldset>'+
      '<div class="basket"><strong>購物籃</strong><p id="basket-items"></p></div>';
  }
  function selectCard(index){
    if(sequence.includes(index))return;
    sequence.push(index);updateOrder();
  }
  function removeCard(index){
    sequence.splice(index,1);updateOrder();
  }
  function updateOrder(){
    const task=lesson.tasks[stage], route=task.type==="route";
    if(route){
      $("#order-slot").innerHTML=task.options.map((_,position)=>{
        const filled=position<sequence.length;
        const stop=filled?action(task.options[sequence[position]]+" ×","remove-"+position,"route-stop"):
          '<span class="route-stop empty">'+(position===0?"起點":position===task.options.length-1?"終點":"中途站")+'</span>';
        return '<div class="route-node">'+stop+'</div>';
      }).join("");
    }else{
      $("#order-slot").innerHTML=sequence.length?sequence.map((index,position)=>
        action((position+1)+"　"+task.options[index]+" ×","remove-"+position,"order-chip")).join(""):
        '<span>依序點選下方卡片。點已選卡片可移除。</span>';
    }
    if(task.map){
      body.querySelectorAll(".river-spot").forEach((button,index)=>{
        const position=sequence.indexOf(index);
        button.setAttribute("aria-pressed",String(position>=0));
        button.querySelector(".river-number").textContent=position<0?"":position+1;
      });
      const stops=[[81,74],[17,29],[50,54]];
      $(".river-links").replaceChildren(...sequence.slice(1).map((stop,index)=>{
        const [x,y]=stops[sequence[index]], [endX,endY]=stops[stop];
        const link=document.createElement("span");
        link.style.clipPath="polygon("+x+"% "+(y-1)+"%,"+endX+"% "+(endY-1)+"%,"+
          endX+"% "+(endY+1)+"%,"+x+"% "+(y+1)+"%)";
        return link;
      }));
    }else{
      body.querySelectorAll('[data-action^="order-"]').forEach((button,index)=>{button.disabled=sequence.includes(index);});
    }
    $("#order-slot").setAttribute("aria-label",sequence.length?"已選 "+sequence.length+" 張":"尚未選擇");
  }
  function updateBudget(task){
    const selected=[...body.querySelectorAll('[name="unit-answer"]:checked')].map(input=>task.items[Number(input.value)]);
    const used=selected.reduce((sum,item)=>sum+item[1],0);
    if(task.basket)set("#basket-items",selected.map(item=>item[0]).join("、")||"購物籃目前是空的");
    const remaining=task.budget-used;
    const currency=task.currency||"點";
    set("#budget-status","預算 "+task.budget+" "+currency+" · 已用 "+used+" "+currency+" · 剩餘 "+remaining+" "+currency);
    $("#budget-status").classList.toggle("over",remaining<task.reserve);
  }
  body.addEventListener("change",event=>{
    const task=course&&lesson.tasks[stage];
    if(!task)return;
    if(task.type==="budget"&&event.target.name==="unit-answer")updateBudget(task);
    if(event.target.name==="unit-plan"){
      stanceIndex=Number(event.target.value);
      set("#unit-impact",task.plans[stanceIndex][1]);
      $("#unit-impact").hidden=false;
    }
  });
  function sameAnswer(values,answer){
    return values.length===answer.length&&values.every((value,index)=>value===answer[index]);
  }
  function submitUnit(form){
    const task=lesson.tasks[stage], data=new FormData(form);
    let correct=false, complete=true;
    if(task.type==="sort"||task.type==="route"){
      complete=sequence.length===task.answer.length;
      correct=sameAnswer(sequence,task.answer);
    }
    if(task.type==="match"){
      const values=task.rows.map((_,index)=>Number(data.get("unit-match"+index)));
      correct=sameAnswer(values,task.answer);
    }
    if(task.type==="pick"){
      const values=data.getAll("unit-answer").map(Number);
      complete=values.length===task.answer.length;
      correct=sameAnswer(values,[...task.answer].sort((a,b)=>a-b));
    }
    if(task.type==="budget"){
      const selected=data.getAll("unit-answer").map(Number);
      complete=Boolean(selected.length);
      const used=selected.reduce((sum,index)=>sum+task.items[index][1],0);
      correct=task.required.every(index=>selected.includes(index))&&task.budget-used>=task.reserve;
    }
    if(task.type==="stance"||task.type==="corners"){
      complete=stanceIndex!==null&&data.has("unit-evidence");
      correct=complete&&task.plans[stanceIndex][2]===Number(data.get("unit-evidence"));
    }
    if(!correct){
      const node=$("#feedback"), attempt=tries[stage];
      const firstHints={
        budget:"先回看記帳員的線索，找出必須買的東西。",
        route:"再讀一次觀察紀錄，找出路線從哪裡開始。",
        sort:"先在上方線索找出最早或最先做的步驟。",
        match:"回看線索，先配對你最有把握的那一列。",
        pick:"回看上方線索，圈出題目要你驗證的資訊。",
        stance:"先找出你選的方案想解決哪個問題。",
        corners:"回看調查紀錄，找出和你這一角有關的資訊。"
      };
      const secondHint=task.basket?"用 100 星幣扣掉必要支出，再比較剩餘金額和 20 星幣的備用目標。":task.hint;
      const hints=[firstHints[task.type],secondHint,task.hint];
      node.textContent=complete?"提示 "+Math.min(attempt+1,3)+" · "+hints[Math.min(attempt,2)]:
        task.type==="pick"?"請選 "+task.answer.length+" 項。":"請先完成這題的選擇。";
      if(complete){tries[stage]+=1;saveProgress();fx("wrong");}
      node.hidden=false;node.focus();return;
    }
    records.push(task.clue);cornerUnlocked=false;stage+=1;route=[];saveProgress();updateHUD();fx("gem");
    open("找回第 "+stage+" 枚碎片",lesson.chapter,para(task.plans?task.plans[stanceIndex][1]:task.hint)+
      actions(action(stage===3?"修復記憶水晶":"繼續冒險",stage===3?"repair":"close")),{closable:false});
  }

  function mapPicture(){
    return '<figure class="map-frame" style="margin-inline:0"><img src="'+esc(lesson.map.image)+'" alt="'+esc(lesson.map.alt)+'"><div class="map-labels" aria-hidden="true">'+lesson.map.labels.map((label,i)=>{
      const [x,y]=lesson.map.pins[i];
      return '<span style="left:'+x+'%;top:'+y+'%">'+esc(label)+'</span>';
    }).join("")+'</div></figure>';
  }
  function radio(name,options,title){
    return '<fieldset class="choices"><legend>'+esc(title)+'</legend>'+options.map((item,i)=>'<label class="choice"><input type="radio" name="'+name+'" value="'+i+'" required><span>'+esc(item)+'</span></label>').join("")+'</fieldset>';
  }
  function submit(label){
    return '<div class="dialog-actions"><button type="submit" class="primary">'+esc(label)+'</button></div>';
  }
  function mapPanel(){
    if(stage!==0){
      open("港灣地圖","線索回顧",mapPicture()+para(lesson.map.record)+actions(action("返回探索","close")));
      return;
    }
    const task=lesson.tasks[0], map=lesson.map;
    const order=map.places.length===3?[2,0,1]:map.places.map((_,i)=>i);
    const matches=map.labels.map((label,i)=>'<label class="match"><span><strong>'+esc(label)+'</strong>　'+esc(map.positions[i])+'</span><select name="match'+i+'" required><option value="">選擇地名</option>'+
      order.map(index=>'<option value="'+index+'">'+esc(map.places[index])+'</option>').join("")+'</select></label>').join("");
    open(task.name,"任務 1 · "+point("map").name,para(map.help)+mapPicture()+'<form data-task="0">'+para(task.prompt)+matches+feedback+submit("確認配對")+'</form>');
  }
  function npcPanel(id){
    const npc=lesson.npc[id];
    if(stage===0){
      open(point(id).name,npc.role,npc.lines.slice(0,3).map(para).join("")+actions(action("返回探索","close")));
      return;
    }
    heard.add(id);
    saveProgress();
    updateHUD();
    const ready=stage===1&&heard.size===Object.keys(lesson.npc).length;
    open(point(id).name,npc.role,npc.lines.slice(0,3).map(para).join("")+
      actions(action("返回探索","close",ready?"quiet":"primary"),...(ready?[action("比對說法","compare")]:[])));
  }
  function comparePanel(){
    const task=lesson.tasks[1];
    const review='<details><summary>回看地圖與兩位居民的話</summary>'+mapPicture()+Object.values(lesson.npc).map(npc=>para(npc.record)).join("")+'</details>';
    open(task.name,"任務 2 · 比對證據",para(task.prompt)+review+'<form data-task="1">'+
      radio("claim",task.claims,"最符合線索的說法")+radio("evidence",task.evidence,"支持說法的證據")+feedback+submit("確認說法與證據")+'</form>');
  }
  function councilPanel(){
    if(stage!==2){
      open(point("council").name,"地標",para("完成地圖和居民訪談後，再來這裡比較市集方案。")+actions(action("返回探索","close")));
      return;
    }
    const task=lesson.tasks[2];
    const impacts=task.plans.map(plan=>'<p class="impact"><strong>'+esc(plan.name)+'</strong><br>'+esc(plan.impact)+'</p>').join("");
    open(task.name,"任務 3 · "+point("council").name,para(task.prompt)+impacts+
      '<details><summary>回看港灣地圖與線索</summary>'+mapPicture()+records.map(para).join("")+'</details>'+
      '<form data-task="2">'+radio("plan",task.plans.map(plan=>plan.name),"你的方案")+'<div id="plan-reasons"><p>選好方案後，就會出現理由選項。</p></div>'+
      radio("more",task.more,"做決定前還想查什麼？")+feedback+submit("提出決定")+'</form>');
    if(chosenPlan!==null){
      body.querySelector('[name="plan"][value="'+chosenPlan+'"]').checked=true;
      updateReasons(chosenPlan);
    }
    if(selectedMore!=="")body.querySelector('[name="more"][value="'+selectedMore+'"]').checked=true;
  }
  function updateReasons(index){
    $("#plan-reasons").innerHTML=radio("reason",lesson.tasks[2].plans[index].reasons,"支持這個方案的理由");
  }
  body.addEventListener("change",event=>{
    if(event.target.name==="plan"){
      chosenPlan=Number(event.target.value);
      updateReasons(chosenPlan);
      $("#feedback").hidden=true;
    }
    if(event.target.name==="more")selectedMore=event.target.value;
  });
  body.addEventListener("submit",event=>{
    event.preventDefault();
    if(event.target.matches("[data-unit-task]")){submitUnit(event.target);return;}
    const number=Number(event.target.dataset.task);
    if(number!==stage)return;
    const form=new FormData(event.target), task=lesson.tasks[number];
    let correct=false;
    if(number===0)correct=lesson.map.answer.every((answer,i)=>Number(form.get("match"+i))===answer);
    if(number===1)correct=task.answer[0]===Number(form.get("claim"))&&task.answer[1]===Number(form.get("evidence"));
    if(number===2){
      if(!form.has("plan")||!form.has("reason")||!form.has("more"))return;
      correct=task.plans[Number(form.get("plan"))].answer===Number(form.get("reason"));
    }
    if(!correct){
      const node=$("#feedback"), hint=Math.min(tries[number]++,task.hints.length-1);
      node.textContent="提示 "+(hint+1)+" · "+task.hints[hint];
      saveProgress();fx("wrong");
      node.hidden=false;node.focus();return;
    }
    fx("gem");
    if(number===0)records=[lesson.map.record];
    if(number===1)records.push(...Object.values(lesson.npc).map(npc=>npc.record));
    stage+=1;route=[];saveProgress();updateHUD();
    open("找回第 "+stage+" 枚碎片","記憶碎片 "+stage+" / 3",para(task.success)+
      actions(action(stage===3?"修復記憶水晶":"繼續冒險",stage===3?"repair":"close")),{closable:false});
  });

  function journal(){
    const notes=course?records:[...(stage>0?[lesson.map.record]:[]),...Object.entries(lesson.npc).filter(([id])=>heard.has(id)).map(([,npc])=>npc.record)];
    open("線索筆記",lesson.chapter,(notes.length?'<ol>'+notes.map(note=>'<li>'+esc(note)+'</li>').join("")+'</ol>':para("找到地圖或聽居民說話後，線索會出現在這裡。"))+
      actions(...(!course&&stage===1&&heard.size===Object.keys(lesson.npc).length?[action("比對說法","compare")]:[]),action("返回探索","close","quiet")));
  }
  function crystalPanel(){
    open("三枚碎片已集齊",lesson.chapter,actions(action("修復記憶水晶","repair")),{closable:false});
  }
  function beginRepair(){
    close();mode("repair");repairStart=performance.now();fx("repair");
    $("#repair").hidden=false;
  }
  function finish(){
    saveProgress(true);
    showFinish();
  }
  function showFinish(){
    fx("win");
    mode("end");$("#repair").hidden=true;
    open("城鎮記憶回來了！","三枚碎片已集齊",
      actions(action("前往碼頭搭船","dock"),action("回首頁","home","quiet"))+
      '<h3>你用過的三條線索</h3><ol>'+records.map(record=>'<li>'+esc(record)+'</li>').join("")+'</ol>'+
      '<h3>全班一起討論</h3><p class="discuss">'+esc(lesson.discussion)+'</p>'+
      (course?'<p class="source-note">課程對照及史實參考 · <a href="'+esc(course.source)+'" target="_blank" rel="noopener">查看來源</a></p>':"")+
      actions(action("選擇其他單元","picker","quiet"),
        action("再玩一次","replay","quiet"),action("投影討論","project")),{closable:false});
  }
  function ferryScreen(phase, message=""){
    const aboard=phase==="board";
    const ports=units.filter(unit=>unit.id!==currentId());
    const options=ports.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.volume+'第'+u.number+'單元 · '+u.unit)+'</option>').join("");
    open(aboard?"選擇目的島嶼":"村落碼頭",lesson.chapter,
      '<canvas class="ferry-scene" width="640" height="245" aria-label="村落渡船"></canvas>'+
      (message?para(message):"")+(aboard?'<label>目的單元 <select id="port-choice">'+options+'</select></label>':"")+
      actions(aboard?action("開始掌舵","sail"):action("登船","board"),action("回首頁","home","quiet")),{closable:false});
    world.ferry(body.querySelector("canvas"),0,aboard,"699b80");
  }
  function sail(next){
    if(!next)return;
    open("掌舵前往"+next.chapter,lesson.chapter,
      para("點選海面讓船朝該處航行，或按方向鍵操船。沿著金色虛線駛入終點旗。")+
      '<canvas class="sea-chart" tabindex="0" width="640" height="300" aria-label="操船海圖，使用方向鍵航行"></canvas><p role="status" class="sea-status">已離港，請沿航線航行。</p>',{closable:false});
    const map=body.querySelector(".sea-chart"),ctx=map.getContext("2d"),status=body.querySelector(".sea-status");
    const bend=units.indexOf(next)%2===0?1:-1;
    const points=[[52,150],[190,150+65*bend],[330,150-58*bend],[465,150-25*bend],[588,150]];
    let x=52,y=150,goal=null,last=performance.now(),danger=0,hit=0,heading=0;
    const keys=new Set(),directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    map.focus();
    map.onkeydown=e=>{if(directions[e.key]){e.preventDefault();e.stopPropagation();keys.add(e.key);goal=null;}};
    map.onkeyup=e=>keys.delete(e.key);
    map.onblur=()=>keys.clear();
    map.onpointerdown=e=>{
      const r=map.getBoundingClientRect();
      goal=[(e.clientX-r.left)*640/r.width,(e.clientY-r.top)*300/r.height];map.focus();
    };
    function routeDistance(){
      return Math.min(...points.slice(1).map(([bx,by],i)=>{
        const [ax,ay]=points[i],vx=bx-ax,vy=by-ay;
        const t=Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy)));
        return Math.hypot(x-ax-t*vx,y-ay-t*vy);
      }));
    }
    function frame(now){
      if(!map.isConnected)return;
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!hit){
        let dx=0,dy=0;
        for(const key of keys){dx+=directions[key][0];dy+=directions[key][1];}
        if(goal){dx=goal[0]-x;dy=goal[1]-y;}
        const d=Math.hypot(dx,dy),step=goal?Math.min(d,dt*95):dt*95;
        if(d>.1){heading=Math.atan2(dy,dx);x=Math.max(8,Math.min(632,x+dx/d*step));y=Math.max(8,Math.min(292,y+dy/d*step));}
        danger=routeDistance()>31?danger+dt:0;
        if(danger>=1.8)hit=now;
        else if(Math.hypot(x-588,y-150)<17){landAtPort(next);return;}
      }
      const label=hit?"海盜砲擊！即將在出發島的碼頭重生。":danger?"偏離航線！快回到金色虛線旁。":"沿著金色虛線前進，朝終點旗靠港。";
      if(status.textContent!==label)status.textContent=label;
      const sea=ctx.createLinearGradient(0,0,0,300);sea.addColorStop(0,"#12546b");sea.addColorStop(1,"#238789");
      ctx.fillStyle=sea;ctx.fillRect(0,0,640,300);
      ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));
      ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=62;ctx.strokeStyle="#59aaa7";ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle="#ffe099";ctx.setLineDash([8,10]);ctx.stroke();ctx.setLineDash([]);
      ctx.font="30px sans-serif";ctx.textAlign="center";ctx.fillText("🏝️",48,154);ctx.fillText("🏁",588,150);
      ctx.save();ctx.translate(x,y);ctx.rotate(heading);ctx.fillStyle="#71432d";ctx.beginPath();ctx.moveTo(17,0);ctx.quadraticCurveTo(1,-14,-14,-7);ctx.lineTo(-14,7);ctx.quadraticCurveTo(1,14,17,0);ctx.fill();ctx.fillStyle="#fff0ca";ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-6,-8);ctx.lineTo(-4,6);ctx.fill();ctx.restore();
      if(danger){const py=y<150?268:38;ctx.fillText("🏴‍☠️",320,py);
        if(hit){const t=Math.min(1,(now-hit)/650);ctx.beginPath();ctx.arc(320+(x-320)*t,py+(y-py)*t,5,0,Math.PI*2);ctx.fillStyle="#252733";ctx.fill();if(t===1)ctx.fillText("💥",x,y);}
      }
      if(hit&&now-hit>1550){ferryScreen("dock","你已在原本的島嶼重生，可以重新登船。");return;}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function landAtPort(next){
    semester=next.volume;
    if(getProgress(next.id).checkpoint)enterLesson(next.id,true);
    else startFilm(next.id);
  }
  function projection(){
    const question=course?lesson.discussion:"如果把市集搬到山坡，誰會更方便？誰要多走一段路？";
    const evidence=course?records.map(para).join(""):mapPicture()+lesson.tasks[2].plans.map(plan=>
      '<p class="impact"><strong>'+esc(plan.name)+'</strong><br>'+esc(plan.impact)+'</p>').join("");
    open("全班一起討論",lesson.chapter,
      '<p class="projection-question">'+esc(question)+'</p>'+
      '<p class="projection-sentence">我選＿＿，因為我在＿＿看到＿＿。</p>'+
      '<details><summary>回看遊戲證據</summary>'+evidence+'</details>'+
      actions(action("返回通關畫面","finish-screen")),{closable:false});
    dialog.classList.add("projection");
  }
  body.addEventListener("click",event=>{
    const command=event.target.closest("[data-action]")?.dataset.action;
    if(command==="close")close();
    if(command!==undefined&&command!==null&&command!=="close")fx("tap");
    if(command==="picker")picker();
    if(command==="home")returnHome();
    if(command==="dock"||command==="board")ferryScreen(command);
    if(command==="sail")sail(units.find(u=>u.id===body.querySelector("#port-choice")?.value));
    if(command==="six-top"||command==="six-bottom"){semester=command==="six-top"?"六上":"六下";picker();}
    if(command?.startsWith("unit-"))lessonEntry(command.slice(5));
    if(command?.startsWith("share-"))shareLesson(command.slice(6));
    if(command==="copy-share")copyShare();
    if(command?.startsWith("play-"))startFilm(command.slice(5));
    if(command?.startsWith("resume-"))enterLesson(command.slice(7),true);
    if(command==="corners"){cornerUnlocked=true;saveProgress();updateHUD();close();}
    if(command?.startsWith("guide-")){close();showGuide(point(command.slice(6)));}
    if(command?.startsWith("order-")){
      const index=Number(command.slice(6)), position=sequence.indexOf(index);
      if(position<0)selectCard(index);
      else if(lesson.tasks[stage].map)removeCard(position);
    }
    if(command?.startsWith("remove-"))removeCard(Number(command.slice(7)));
    if(command==="clear-order"){sequence=[];updateOrder();}
    if(command==="compare")comparePanel();
    if(command==="repair")beginRepair();
    if(command==="replay")startFilm(currentId());
    if(command==="project")projection();
    if(command==="finish-screen")showFinish();
  });

  function interact(){
    if(state.mode!=="play"||dialog.open||!nearby)return;
    if(course){unitInteract(nearby);return;}
    if(nearby.id==="map")mapPanel();
    else if(nearby.id==="council")councilPanel();
    else npcPanel(nearby.id);
  }
  function updateNearby(){
    let best, distance=2.15;
    for(const place of lesson.landmarks){
      if(place.corner&&!(cornerUnlocked&&stage===1))continue;
      const candidate=Math.hypot(place.x-state.x,place.z-state.z);
      if(candidate<distance){distance=candidate;best=place;}
    }
    if(best!==nearby){
      nearby=best;
      $("#interact").hidden=!nearby;
      if(nearby)set("#interact",nearby.action+" · E");
    }
  }
  $("#stage").tabIndex=-1;
  function returnHome(){
    close();
    course=null;lesson=sample;state.active=[];state.repair=0;
    keys.clear();touch.clear();route=[];nearby=null;clearGuide();
    const url=new URL(location.href);
    if(url.searchParams.has("unit")){
      url.searchParams.delete("unit");history.replaceState(null,"",url);
    }
    set("#sample-progress",getProgress("sample").completed||getProgress("sample").checkpoint?
      progressLabel("sample"):"架空示範關卡");
    world.configure("harbor",sample.landmarks);
    createPins();mode("home");
    set("#source-tag","翰林版社會 · 六年級");
    set("#footer-source","六上／六下課前預習");
    $("#start-upper").focus({preventScroll:true});
  }
  mode("home");
  if(getProgress("sample").completed||getProgress("sample").checkpoint)set("#sample-progress",progressLabel("sample"));
  $("#start-upper").addEventListener("click",()=>{semester="六上";picker();});
  $("#start-lower").addEventListener("click",()=>{semester="六下";picker();});
  $("#start-sample").addEventListener("click",()=>lessonEntry("sample"));
  $(".portal-cta").addEventListener("click",event=>{
    event.preventDefault();
    $("#portal-levels").scrollIntoView({block:"nearest"});
    $("#start-upper").focus({preventScroll:true});
  });
  $("#home-link").addEventListener("click",returnHome);
  $("#switch").addEventListener("click",picker);
  $("#interact").addEventListener("click",interact);
  $("#return").addEventListener("click",()=>{Object.assign(state,world.spawn,{dir:Math.PI});route=[];clearGuide();updateNearby();notice("已回到起始廣場。你的線索還在。");});
  $("#journal").addEventListener("click",journal);
  $("#destination").addEventListener("click",()=>{
    if(state.active.length===1)route=findRoute(point(state.active[0]));
  });
  $("#route-help").addEventListener("click",()=>{
    if(guideTarget){clearGuide();return;}
    const destinations=state.active.map(point);
    if(destinations.length===1){showGuide(destinations[0]);return;}
    open("想去哪個地標？","找路提示",actions(...destinations.map(place=>action(place.name,"guide-"+place.id,"quiet"))));
  });
  $("#help").addEventListener("click",()=>open("操作說明","異界巡旅",
    para("電腦用 WASD 或方向鍵移動，靠近居民或物件時按 E，也可以點「互動」按鈕。")+
    para("平板可按住左下方的方向按鈕移動。也可以點金色地標讓角色走過去，或點「回到廣場」回到起點。")+
    para("點「找路提示」會顯示一條路徑。答錯時，可以依出現的提示回看線索。關卡進度會保存在這個瀏覽器。")+
    (!lesson.fictional&&lesson.source?para(lesson.source):"")+actions(action("關閉說明","close"))));
  window.addEventListener("keydown",event=>{
    if(state.mode!=="play"||dialog.open||$("#wardrobe").open||event.ctrlKey||event.metaKey||event.altKey)return;
    const key=event.key.toLowerCase();
    if(key in movement){event.preventDefault();keys.add(movement[key]);}
    if(key==="e"&&!event.repeat){event.preventDefault();interact();}
  });
  window.addEventListener("keyup",event=>keys.delete(movement[event.key.toLowerCase()]));
  window.addEventListener("blur",()=>{keys.clear();touch.clear();});
  for(const button of document.querySelectorAll("[data-move]")){
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();button.setPointerCapture(event.pointerId);touch.set(event.pointerId,button.dataset.move);
    });
    for(const name of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(name,event=>touch.delete(event.pointerId));
  }
  let guideDots=[];
  function clearGuide(){
    guideTarget=null;guideDots=[];
    $("#guide-trail").replaceChildren();
    $("#route-help").setAttribute("aria-pressed","false");
    set("#route-help","找路提示");
  }
  function showGuide(place){
    clearGuide();
    if(Math.hypot(place.x-state.x,place.z-state.z)<2.15){
      notice("已到達"+place.name+"，請點互動。");
      return;
    }
    const path=findRoute(place);
    if(!path.length)return;
    guideTarget=place;
    guideDots=path.filter((_,index)=>index%2===0||index===path.length-1).map(position=>{
      const dot=document.createElement("span");
      $("#guide-trail").append(dot);
      return {position,dot};
    });
    $("#route-help").setAttribute("aria-pressed","true");
    set("#route-help","隱藏引路");
    notice("沿著發光路徑前往"+place.name+"。");
  }
  function findRoute(place){
    const step=.52;
    const origin={x:state.x,z:state.z,parent:null};
    const queue=[origin], seen=new Set(["0,0"]);
    const dx=place.x-origin.x,dz=place.z-origin.z;
    const offsets=[[1,0],[-1,0],[0,1],[0,-1]];
    offsets.sort((a,b)=>(b[0]-a[0])*dx+(b[1]-a[1])*dz);
    for(let i=0;i<queue.length&&i<6500;i++){
      const node=queue[i];
      if(Math.hypot(node.x-place.x,node.z-place.z)<1.45){
        const result=[];
        for(let point=node;point.parent;point=point.parent)result.push(point);
        return result.reverse();
      }
      for(const [ox,oz] of offsets){
        const x=node.x+ox*step,z=node.z+oz*step;
        const key=Math.round((x-origin.x)/step)+","+Math.round((z-origin.z)/step);
        if(seen.has(key))continue;
        const clear=[.25,.5,.75,1].every(t=>world.walkable(node.x+ox*step*t,node.z+oz*step*t));
        if(clear){seen.add(key);queue.push({x,z,parent:node});}
      }
    }
    notice("請用方向鍵或方向按鈕走到地標。");
    return [];
  }
  function move(dt){
    const held=[...touch.values()];
    const pressed=name=>Number(keys.has(name)||held.includes(name));
    const dx=pressed("right")-pressed("left"), dz=pressed("down")-pressed("up");
    const vx=.966*dx+.259*dz,vz=-.259*dx+.966*dz;
    if(dx||dz)route=[];
    if(route.length){
      let remaining=5.3*dt;
      while(route.length&&remaining>0){
        const next=route[0],vx=next.x-state.x,vz=next.z-state.z;
        const distance=Math.hypot(vx,vz);
        state.dir=Math.atan2(vx,vz);
        if(distance>remaining){
          state.x+=vx*remaining/distance;state.z+=vz*remaining/distance;
          break;
        }
        state.x=next.x;state.z=next.z;
        remaining-=distance;route.shift();
      }
      state.phase+=dt*14;
    }else if(dx||dz){
      const slices=Math.max(1,Math.ceil(dt/.035));
      const step=5.3*dt/(Math.hypot(vx,vz)*slices);
      state.dir=Math.atan2(vx,vz);
      for(let i=0;i<slices;i++){
        if(world.walkable(state.x+vx*step,state.z))state.x+=vx*step;
        if(world.walkable(state.x,state.z+vz*step))state.z+=vz*step;
      }
      state.phase+=dt*14;
    }else state.phase=0;
    updateNearby();
  }
  function frame(time){
    const dt=Math.min(1,(time-(previousTime||time))/1000);
    previousTime=time;
    if(state.mode==="play"&&!dialog.open&&!$("#wardrobe").open)move(dt);
    if(state.mode==="repair"){
      state.repair=Math.min(3,(time-repairStart)/1000);
      if(state.repair>=3)finish();
    }
    world.render(state,time/1000,dt);
    if(guideTarget&&Math.hypot(guideTarget.x-state.x,guideTarget.z-state.z)<2.15)clearGuide();
    for(const {position,dot} of guideDots){
      const projected=world.project(position.x,.12,position.z);
      dot.hidden=!projected;
      if(projected){dot.style.left=projected[0]+"px";dot.style.top=projected[1]+"px";}
    }
    for(const place of lesson.landmarks){
      const pin=pins.get(place.id), active=state.active.includes(place.id)||(!course&&stage===1&&state.active.length===0&&place.id in lesson.npc);
      const pos=state.mode==="play"&&(active||nearby?.id===place.id)?world.project(place.x,2.68,place.z):null;
      pin.hidden=!pos;
      if(pos){
        const width=$("#stage").clientWidth,height=$("#stage").clientHeight;
        pin.style.left=Math.max(55,Math.min(width-55,pos[0]))+"px";
        pin.style.top=Math.max(width<680?138:83,Math.min(height-75,pos[1]))+"px";
        pin.classList.toggle("active",active);
      }
    }
    requestAnimationFrame(frame);
  }
  const requested=new URLSearchParams(location.search).get("unit");
  if(requested==="sample"||units.some(unit=>unit.id===requested))lessonEntry(requested);
  requestAnimationFrame(frame);
})();
