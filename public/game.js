(() => {
  const sample=window.LESSON;
  const units=window.UNITS;
  let lesson=sample, course=null, semester="六上", cornerUnlocked=false;
  const world = window.World;
  const Fleet = window.Fleet;
  let finishLines = "";
  let starLeft = 2, retryUsed = false, dashUntil = 0, dashReady = 0;
  let stam = 100, winded = false, sprintHeld = false, touchSprint = false, idleFor = 0;
  const coinLine = (n, label = "") => n ? '<p class="coin-gain">🪙 +' + n + " 金幣" + (label ? "（" + label + "）" : "") + "</p>" : "";
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
  // ---- 體力與衝刺 ----
  function sprintFactor(dt,moving,boost=1.6){
    const max=Fleet.stats().sta;
    stam=Math.min(stam,max);
    if((sprintHeld||touchSprint)&&moving&&!winded&&stam>0){
      stam=Math.max(0,stam-30*dt);idleFor=0;
      if(stam===0)winded=true;
      return boost;
    }
    idleFor+=dt;
    if(idleFor>.5)stam=Math.min(max,stam+14*dt);
    if(winded&&stam>=Math.min(25,max*.3))winded=false;
    return 1;
  }
  const barCache={};
  function setWidth(selector,percent){
    if(barCache[selector]===percent)return;
    barCache[selector]=percent;$(selector).style.width=percent+"%";
  }
  function paintBars(){
    const percent=Math.round(Math.max(0,Math.min(1,stam/Fleet.stats().sta))*100);
    setWidth("#sta-fill",percent);setWidth("#sail-sta",percent);
    $("#sta-fill").parentElement.classList.toggle("low",winded);
    if(sailRun){
      setWidth("#hp-fill",Math.round(sailRun.hp/sailRun.maxHp*100));
      const text=sailRun.hp+" / "+sailRun.maxHp;
      if(barCache.hpText!==text){barCache.hpText=text;set("#hp-text",text);}
    }
  }
  function makeSceneCoins(id){
    let seed=0;for(const ch of id)seed=(seed*31+ch.charCodeAt(0))>>>0;seed=seed||7;
    const rnd=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
    const got=Fleet.collected(id,"c"),out=[];
    for(let t=0;t<600&&out.length<3;t++){
      const x=rnd()*30-15,z=rnd()*22-11;
      if(!world.walkable(x,z))continue;
      if(lesson.landmarks.some(place=>Math.hypot(place.x-x,place.z-z)<3.2))continue;
      if(Math.hypot(x-world.spawn.x,z-world.spawn.z)<4||out.some(c=>Math.hypot(c.x-x,c.z-z)<7))continue;
      out.push({x,z,i:out.length,taken:got[out.length]});
    }
    return out;
  }
  function collectScene(){
    const radius=Fleet.skillId()==="curious"?1.8:1.2;
    for(const c of state.coins||[]){
      if(c.taken||Math.hypot(c.x-state.x,c.z-state.z)>radius)continue;
      c.taken=true;
      const gain=Fleet.scene(currentId(),c.i);
      if(gain){fx("coin");notice("✦ 找到閃光金幣！ 🪙 +"+gain);}
      updateHUD();
    }
  }
  function useSkill(){
    if(state.mode!=="play"||Fleet.skillId()!=="dash")return;
    const now=performance.now();
    if(now<dashReady)return;
    dashUntil=now+3000;dashReady=now+10000;fx("skill");
  }
  function refreshSkill(){
    const c=Fleet.costume();
    set("#skill-badge",c.icon+" "+c.skill.name);
  }
  window.addEventListener("ltm:wallet",refreshSkill);
  function posOnRoute(route,distance){
    let acc=0;
    for(let i=1;i<route.length;i++){
      const [ax,az]=route[i-1],[bx,bz]=route[i],len=Math.hypot(bx-ax,bz-az);
      if(distance<=acc+len||i===route.length-1){
        const t=Math.min(1,(distance-acc)/len);
        return {x:ax+(bx-ax)*t,z:az+(bz-az)*t,nx:-(bz-az)/len,nz:(bx-ax)/len};
      }
      acc+=len;
    }
  }
  function makeSeaCoins(route,total,id){
    const got=Fleet.collected(id,"s");
    return Array.from({length:8},(_,i)=>{
      const p=posOnRoute(route,total*(i+1)/9),chest=i===2||i===5;
      const off=chest?(i===2?13:-13):(i%2?4.5:-4.5);
      return {x:p.x+p.nx*off,z:p.z+p.nz*off,i,chest,taken:got[i]};
    });
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
    playStart=Date.now();finishLines="";starLeft=2;retryUsed=false;state.coins=makeSceneCoins(id);updateHUD();
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
    $("#progress").hidden=name==="home"||name==="sail";
    $("#controls").hidden=name!=="play"&&name!=="sail";
    $("#sail-hud").hidden=name!=="sail";
    $("#switch").hidden=name!=="play";
    $("#home-link").disabled=name==="home";
    if(name!=="play")$("#interact").hidden=true;
  }
  function updateHUD(){
    const task=lesson.tasks[stage];
    state.active=course?(stage===3?[]:cornerUnlocked&&stage===1?lesson.landmarks.filter(p=>p.corner).map(p=>p.id):["task"+stage]):stage===0?["map"]:stage===1?["sailor","vendor"].filter(id=>!heard.has(id)):stage===2?["council"]:[];
    set("#count",stage+" / 3");
    const hidden=(state.coins||[]).filter(c=>!c.taken).length;
    set("#scene-coins",(state.coins||[]).length&&hidden?"✦ 場景裡還藏著 "+hidden+" 枚閃光金幣":"");
    refreshSkill();
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
  // 點視窗外的空白處關閉（需按下與放開都在視窗外；進行中的關卡序幕、通關畫面等鎖定視窗會輕輕晃動提示）
  const outside=(box,event)=>{const r=box.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  for(const box of [dialog,$("#cloud"),$("#wardrobe"),$("#review")]){
    let pressedOutside=false;
    box.addEventListener("pointerdown",event=>{pressedOutside=event.target===box&&outside(box,event);});
    box.addEventListener("click",event=>{
      if(event.target!==box||!pressedOutside||!outside(box,event))return;
      pressedOutside=false;
      if(box===dialog&&body.dataset.locked==="true"){
        box.classList.remove("nudge");void box.offsetWidth;box.classList.add("nudge");return;
      }
      if(box===dialog)close();else box.close();
    });
  }
  const action=(label,id,style="primary")=>'<button type="button" class="'+style+'" data-action="'+id+'">'+esc(label)+'</button>';
  const actions=(...buttons)=>'<div class="dialog-actions">'+buttons.join("")+'</div>';
  const para=text=>'<p class="dialog-text">'+esc(text)+'</p>';
  const starButton=()=>Fleet.skillId()==="star"?'<div class="dialog-actions star-row">'+action("✦ 星象提示（剩 "+starLeft+" 次）","star-hint","quiet")+"</div>":"";
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
      '<form data-unit-task>'+activity+starButton()+feedback+submit("確認答案")+'</form>');
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
      if(complete){
        if(Fleet.skillId()==="retry"&&!retryUsed){retryUsed=true;node.textContent="再試一次 · 這次不算答錯。"+node.textContent;}
        else tries[stage]+=1;
        saveProgress();fx("wrong");
      }
      node.hidden=false;node.focus();return;
    }
    records.push(task.clue);cornerUnlocked=false;stage+=1;route=[];saveProgress();updateHUD();fx("gem");
    const gain=Fleet.gem(currentId(),stage-1);
    open("找回第 "+stage+" 枚碎片",lesson.chapter,para(task.plans?task.plans[stanceIndex][1]:task.hint)+coinLine(gain)+
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
    open(task.name,"任務 1 · "+point("map").name,para(map.help)+mapPicture()+'<form data-task="0">'+para(task.prompt)+matches+starButton()+feedback+submit("確認配對")+'</form>');
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
      radio("claim",task.claims,"最符合線索的說法")+radio("evidence",task.evidence,"支持說法的證據")+starButton()+feedback+submit("確認說法與證據")+'</form>');
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
      radio("more",task.more,"做決定前還想查什麼？")+starButton()+feedback+submit("提出決定")+'</form>');
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
      const node=$("#feedback"), free=Fleet.skillId()==="retry"&&!retryUsed;
      if(free)retryUsed=true;
      const hint=Math.min(free?tries[number]:tries[number]++,task.hints.length-1);
      node.textContent=(free?"再試一次 · 這次不算答錯。":"")+"提示 "+(hint+1)+" · "+task.hints[hint];
      saveProgress();fx("wrong");
      node.hidden=false;node.focus();return;
    }
    fx("gem");
    if(number===0)records=[lesson.map.record];
    if(number===1)records.push(...Object.values(lesson.npc).map(npc=>npc.record));
    stage+=1;route=[];saveProgress();updateHUD();
    open("找回第 "+stage+" 枚碎片","記憶碎片 "+stage+" / 3",para(task.success)+coinLine(Fleet.gem(currentId(),stage-1))+
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
    finishLines=coinLine(Fleet.finish(currentId()),"通關獎勵")+coinLine(tries.reduce((a,b)=>a+b,0)===0?Fleet.perfect(currentId()):0,"一次過");
    saveProgress(true);
    showFinish();
  }
  function showFinish(quiet=false){
    if(!quiet)fx("win");
    mode("end");$("#repair").hidden=true;
    open("城鎮記憶回來了！","三枚碎片已集齊",
      finishLines+actions(...(course?[action(Fleet.bossCleared(course.id)?"再戰單元 Boss（已擊敗 ✓）":"⚔️ 挑戰單元 Boss","boss","quiet")]:[]),action("前往碼頭搭船","dock"),action("回首頁","home","quiet"))+
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
      (message?para(message):"")+(aboard?'<p class="veh-current">目前載具：'+Fleet.current().icon+" "+esc(Fleet.current().name)+'</p><label>目的單元 <select id="port-choice">'+options+'</select></label>':"")+
      actions(aboard?action("開始掌舵","sail"):action("登船","board"),...(aboard?[action("船塢・更換載具","garage","quiet")]:[]),action("回首頁","home","quiet")),{closable:false});
    world.ferry(body.querySelector("canvas"),0,aboard,"699b80",Fleet.current().id);
  }
  let sailRun=null;
  function routeInfo(route,x,z){
    let best={dist:1e9,along:0},acc=0;
    for(let i=1;i<route.length;i++){
      const [ax,az]=route[i-1],[bx,bz]=route[i],vx=bx-ax,vz=bz-az,len=Math.hypot(vx,vz);
      const t=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/(len*len)));
      const dist=Math.hypot(x-ax-t*vx,z-az-t*vz);
      if(dist<best.dist)best={dist,along:acc+t*len};
      acc+=len;
    }
    return best;
  }
  function leaveSea(){
    sailRun=null;Object.assign(state,{vehicle:null,pirates:[],ball:null,boom:0,speed:0,seaCoins:[],shield:false});
    world.configure(course?.scene??"harbor",lesson.landmarks);
    mode("end");
  }
  function sail(next){
    if(!next)return;
    const v=Fleet.current(), bend=units.indexOf(next)%2===0?1:-1;
    const route=[[-60,0],[-32,32*bend],[4,-26*bend],[40,-12*bend],[72,0]];
    let total=0;for(let i=1;i<route.length;i++)total+=Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]);
    close();keys.clear();touch.clear();
    world.configureSea({route});
    Object.assign(state,{x:-51,z:0,dir:Math.PI/2,phase:0,vehicle:v.id,speed:0,pirates:[],ball:null,boom:0,dash:false,seaCoins:makeSeaCoins(route,total,next.id),shield:Fleet.skillId()==="shield"});
    const maxHp=Fleet.stats().hp;
    stam=Fleet.stats().sta;winded=false;
    sailRun={next,v,route,total,danger:0,hit:false,hitT:0,progress:0,status:"",hp:maxHp,maxHp,
      quiz:window.Quiz.forUnit(course),originName:course?.unit??"港灣市集",originId:course?.id??"sample",ambushed:[false,false],alarm:0,grace:0,battle:null};
    mode("sail");
    set("#sail-vehicle",v.icon+" "+v.name);set("#sail-title","前往"+next.chapter);
    set("#sail-status","方向鍵或 WASD 駕駛，按住 Shift 衝刺。路上有金幣、寶箱，也可能遇到海盜！"+(state.shield?" 🛡️ 守護光盾已啟動。":""));
    $("#sail-fill").style.width="0%";
    $("#stage").focus({preventScroll:true});
  }
  // ---- 戰鬥（海盜／單元 Boss 共用）：回答剛通關單元的題目來攻擊 ----
  let fight=null;
  const BOSS_LOOK=["pirate","knight","star","gold","scholar","wind"];
  const newFight=options=>({used:new Set(),q:null,answered:false,eliminated:new Set(),free:Fleet.skillId()==="retry",shield:false,...options});
  const attackPower=()=>Fleet.stats().atk*(fight?.kind==="boss"?2:1);
  function takeShield(){
    if(fight.kind==="sea"){if(state.shield){state.shield=false;return true;}return false;}
    if(fight.shield){fight.shield=false;return true;}
    return false;
  }
  function startBattle(){
    const r=sailRun;
    if(!r||r.battle)return;
    r.alarm=0;
    if(!r.quiz.length){r.grace=8;state.pirates=[];return;}
    keys.clear();touch.clear();sprintHeld=false;touchSprint=false;state.speed=0;
    if(!state.pirates.length)state.pirates=[{x:state.x+Math.sin(state.dir)*12+Math.cos(state.dir)*6,z:state.z+Math.cos(state.dir)*12-Math.sin(state.dir)*6,dir:0}];
    fx("hit");
    fight=newFight({kind:"sea",title:"海盜來襲！",enemy:{name:"海盜",icon:"🏴‍☠️",hp:Fleet.pirate.hp,max:Fleet.pirate.hp,dmg:Fleet.pirate.damage},
      hp:r.hp,maxHp:r.maxHp,quiz:r.quiz,originName:r.originName,originId:r.originId,guard:r.v.guard});
    r.battle=fight;
    nextQuestion();
  }
  function startBoss(){
    if(!course)return;
    const stats=Fleet.stats(),index=units.indexOf(course);
    keys.clear();touch.clear();sprintHeld=false;touchSprint=false;
    fx("hit");
    fight=newFight({kind:"boss",title:"單元 Boss 登場！",enemy:{name:"海盜王・"+course.chapter,icon:"👑",hp:100,max:100,dmg:35},
      hp:stats.hp,maxHp:stats.hp,quiz:window.Quiz.forUnit(course),originName:course.unit,originId:course.id,guard:1,
      boss:BOSS_LOOK[index%BOSS_LOOK.length],shield:Fleet.skillId()==="shield"});
    nextQuestion();
  }
  function nextQuestion(){
    const pool=fight.quiz;
    let free=pool.map((_,i)=>i).filter(i=>!fight.used.has(i));
    if(!free.length){fight.used.clear();free=pool.map((_,i)=>i);}
    const pick=free[Math.floor(Math.random()*free.length)];
    fight.used.add(pick);fight.q=pool[pick];fight.answered=false;fight.eliminated=new Set();
    renderFight();
  }
  function fightBars(){
    const f=fight;
    return '<div class="battle-bars"><div class="bar-row"><span>'+f.enemy.icon+" "+(f.kind==="boss"?"Boss":"海盜")+'</span><div class="hpbar enemy"><i style="width:'+Math.round(f.enemy.hp/f.enemy.max*100)+'%"></i></div><b>'+f.enemy.hp+" / "+f.enemy.max+"</b></div>"+
      '<div class="bar-row"><span>❤️ 你</span><div class="hpbar"><i style="width:'+Math.round(f.hp/f.maxHp*100)+'%"></i></div><b>'+f.hp+" / "+f.maxHp+"</b></div></div>";
  }
  function renderFight(resultHtml=""){
    const f=fight,q=f.q;
    const star=Fleet.skillId()==="star"?action("✦ 星象提示（剩 "+starLeft+" 次）","battle-star","quiet"):"";
    const art=f.kind==="boss"?'<canvas class="boss-art" width="240" height="200" aria-label="'+esc(f.enemy.name)+'"></canvas><p class="boss-name">'+esc(f.enemy.name)+"</p>":"";
    const view=resultHtml||(
      '<details class="battle-clue"><summary>📜 回看線索</summary><p class="dialog-text">'+esc(q.clue||"想想這個單元學到的內容。")+"</p></details>"+
      '<p class="battle-q">'+esc(q.q)+"</p>"+
      '<div class="battle-options">'+q.options.map((option,i)=>'<button type="button" class="battle-opt" data-action="ans-'+i+'"'+(f.eliminated.has(i)?" disabled":"")+">"+esc(option)+"</button>").join("")+"</div>"+
      '<div class="dialog-actions">'+star+"</div>");
    open(f.title,(f.kind==="boss"?"每次答對造成 ":"答對就攻擊（")+attackPower()+" 傷害"+(f.kind==="boss"?"":"）")+" · 回答「"+f.originName+"」",art+fightBars()+view,{closable:false});
    if(f.kind==="boss")world.bossPreview(body.querySelector(".boss-art"),f.boss);
  }
  function answerFight(index){
    const f=fight;
    if(!f||f.answered)return;
    f.answered=true;
    const q=f.q,ok=index===q.answer;
    const correct='<p class="dialog-text">正確答案：<strong>'+esc(q.options[q.answer])+"</strong></p>"+(q.explain?'<p class="dialog-text small">'+esc(q.explain)+"</p>":"");
    if(ok){
      const damage=attackPower();
      f.enemy.hp=Math.max(0,f.enemy.hp-damage);
      const coins=Fleet.addCoins(Fleet.reward.battleHit);
      fx("gem");
      if(f.enemy.hp<=0){fightVictory(damage,correct);return;}
      renderFight('<p class="battle-result ok">✅ 答對了！你揮出一擊，造成 '+damage+" 點傷害！ 🪙 +"+coins+"</p>"+correct+actions(action("繼續戰鬥","battle-next")));
      return;
    }
    // 答錯：記進錯題本，並被攻擊
    Fleet.addMistake({u:f.originId,q:q.q,a:q.options[q.answer],e:q.explain,c:q.clue,o:q.options});
    let damage=Math.round(f.enemy.dmg*f.guard),note="";
    if(takeShield()){damage=0;note="🛡️ 守護光盾擋下了這次攻擊！";fx("skill");}
    else if(f.free){f.free=false;damage=0;note="🎓 再試一次：這次不會受傷。";fx("skill");}
    else fx("hit");
    f.hp=Math.max(0,f.hp-damage);
    if(f.kind==="sea")sailRun.hp=f.hp;
    const saved="<p class=\"dialog-text small\">📕 這題已收進錯題本，之後可以到「錯題本」複習。</p>";
    if(f.hp<=0){
      renderFight('<p class="battle-result bad">💫 你的生命值歸零，被擊倒了！</p>'+correct+saved+
        (f.kind==="sea"?'<p class="dialog-text">別氣餒，回碼頭整備後再出發。</p>'+actions(action("回碼頭整備","battle-retreat")):
          '<p class="dialog-text">換上更好的裝備再來挑戰吧！</p>'+actions(action("返回通關畫面","boss-back","quiet"),action("再挑戰一次","boss"))));
      return;
    }
    renderFight('<p class="battle-result bad">❌ 答錯了…'+(f.kind==="boss"?"Boss":"海盜")+"反擊！"+(damage?"你受到 "+damage+" 點傷害。":"")+(note?"<br>"+note:"")+"</p>"+correct+saved+actions(action("繼續戰鬥","battle-next")));
  }
  function fightVictory(damage,correct){
    const f=fight;
    fx("win");
    let html="";
    if(f.kind==="boss"){
      const result=Fleet.bossClear(f.originId);
      html+='<p class="coin-gain">🪙 +'+result.coins+"（"+(result.first?"首次擊敗獎勵":"再次挑戰獎勵")+"）</p>";
      if(result.loot?.item){
        const g=result.loot.item;
        html+='<p class="loot">'+g.icon+" 獲得傳說裝備「"+esc(g.name)+"」！（"+Fleet.gear.slots[g.slot].label+" +"+g.value+"）"+(Fleet.get().gear.equipped[g.slot]===g.id?"已自動穿上。":"已放進背包。")+"</p>";
      }else if(result.loot?.bonus)html+='<p class="loot">傳說裝備你都集齊了！額外獎勵 🪙 +'+result.loot.bonus+"</p>";
      renderFight('<p class="battle-result ok">🎉 答對了！造成 '+damage+" 點傷害，Boss 倒下了！</p>"+correct+html+actions(action("返回通關畫面","boss-back")));
      return;
    }
    const r=sailRun;
    Fleet.recordWin();
    const coins=Fleet.addCoins(Fleet.reward.battleWin);
    const loot=Fleet.rollLoot();
    r.hp=Math.min(r.maxHp,f.hp+Math.round(r.maxHp*.2));
    html+='<p class="coin-gain">🪙 +'+coins+" 金幣（擊敗獎勵）</p>";
    if(loot){
      const g=loot.item,slot=Fleet.gear.slots[g.slot];
      if(loot.duplicate)html+='<p class="loot">'+g.icon+" 撿到「"+esc(g.name)+"」，但你已經有了，拆成 🧩 碎片 ×"+loot.shards+"（可用來強化、合成裝備）</p>";
      else html+='<p class="loot">'+g.icon+" 獲得裝備「"+esc(g.name)+"」！（"+Fleet.gear.tiers[g.tier]+"・"+slot.label+" +"+g.value+"）"+
        (Fleet.get().gear.equipped[g.slot]===g.id?"已自動穿上。":"已放進背包，可到「角色換裝」穿上。")+"</p>";
    }
    renderFight('<p class="battle-result ok">✅ 答對了！造成 '+damage+" 點傷害，海盜被擊敗了！</p>"+correct+html+'<p class="dialog-text small">休息一下，生命值恢復了一些。</p>'+actions(action("繼續航行","battle-end")));
  }
  function endBattle(){
    close();
    const r=sailRun;
    fight=null;
    if(!r)return;
    r.battle=null;r.danger=0;r.grace=8;state.pirates=[];
    notice("繼續航行！前方海面暫時平靜。");
  }
  function sailStep(dt){
    const r=sailRun;if(!r)return;
    dt=Math.min(dt,.05);
    if(r.battle){
      for(const p of state.pirates){p.dir=Math.atan2(state.x-p.x,state.z-p.z);}
      state.speed=0;
      return;
    }
    if(r.hit){
      r.hitT+=dt;
      const p=state.pirates[0];
      if(r.hitT<.65&&p){const t=r.hitT/.65;state.ball={x:p.x+(state.x-p.x)*t,y:.9+Math.sin(t*Math.PI)*2.2,z:p.z+(state.z-p.z)*t};}
      else{state.ball=null;state.boom=Math.min(1,(r.hitT-.65)/.9);}
      state.speed*=.92;
      if(r.hitT>2.1){leaveSea();ferryScreen("dock","你已在原本的島嶼重生，可以重新登船。");}
      return;
    }
    const held=[...touch.values()],pressed=name=>Number(keys.has(name)||held.includes(name));
    const dx=pressed("right")-pressed("left"),dz=pressed("down")-pressed("up");
    const vx=.966*dx+.259*dz,vz=-.259*dx+.966*dz,input=dx||dz;
    if(input){
      const diff=Math.atan2(Math.sin(Math.atan2(vx,vz)-state.dir),Math.cos(Math.atan2(vx,vz)-state.dir));
      state.dir+=Math.sign(diff)*Math.min(Math.abs(diff),6*dt);
    }
    const sprint=sprintFactor(dt,Boolean(input),1.5);
    state.speed+=((input?r.v.speed*sprint:0)-state.speed)*(1-Math.exp(-2.5*dt));
    state.x+=Math.sin(state.dir)*state.speed*dt;state.z+=Math.cos(state.dir)*state.speed*dt;
    const info=routeInfo(r.route,state.x,state.z);
    r.progress=Math.max(r.progress,info.along/r.total);
    const fill=Math.round(Math.min(1,r.progress)*100)+"%";
    if($("#sail-fill").style.width!==fill)$("#sail-fill").style.width=fill;
    const skill=Fleet.skillId();
    for(const c of state.seaCoins){
      if(c.taken)continue;
      let d=Math.hypot(c.x-state.x,c.z-state.z);
      if(skill==="captain"&&d<11&&d>0){
        const pull=Math.min(d,14*dt);c.x+=(state.x-c.x)/d*pull;c.z+=(state.z-c.z)/d*pull;d=Math.hypot(c.x-state.x,c.z-state.z);
      }
      if(d<(skill==="curious"?4.5:3)){
        c.taken=true;
        const gain=Fleet.sea(r.next.id,c.i,c.chest);
        if(gain){fx("coin");notice((c.chest?"🧰 找到寶箱！ 🪙 +":"🪙 +")+gain);}
      }
    }
    const goal=r.route[r.route.length-1];
    if(Math.hypot(state.x-goal[0],state.z-goal[1])<11){
      const next=r.next;leaveSea();fx("win");landAtPort(next);return;
    }
    let label="沿著金色虛線前進，朝終點旗靠港。";
    [.3,.68].forEach((mark,i)=>{
      if(r.ambushed[i]||r.progress<mark)return;
      r.ambushed[i]=true;
      const ahead=posOnRoute(r.route,r.total*Math.min(.97,mark+.08));
      state.pirates=[{x:ahead.x+ahead.nx*5,z:ahead.z+ahead.nz*5,dir:0}];
      r.alarm=1.4;notice("🏴‍☠️ 前方有巡邏海盜！準備迎戰！");fx("hit");
    });
    if(r.alarm>0){r.alarm-=dt;label="海盜逼近中！";if(r.alarm<=0)startBattle();}
    if(r.grace>0)r.grace-=dt;
    if(info.dist>8.5&&r.grace<=0&&!r.alarm){
      if(r.v.immune)label="海怪游過，海盜不敢靠近！";
      else{
        if(!state.pirates.length){
          state.pirates=[{x:state.x-Math.sin(state.dir)*6+Math.cos(state.dir)*14,z:state.z-Math.cos(state.dir)*6-Math.sin(state.dir)*14,dir:0}];
        }
        r.danger+=dt;label="偏離航線！海盜正在靠近，快回到金色虛線旁。";
        if(r.danger>=r.v.tolerance*(skill==="captain"?2:1))startBattle();
      }
    }else if(!r.alarm){
      r.danger=Math.max(0,r.danger-dt*2.5);
      if(!r.danger&&state.pirates.length)state.pirates=[];
    }
    for(const p of state.pirates){
      const ex=state.x-p.x,ez=state.z-p.z,d=Math.hypot(ex,ez);
      p.dir=Math.atan2(ex,ez);
      if(d>9){const sp=Math.max(4,state.speed*1.2);p.x+=ex/d*sp*dt;p.z+=ez/d*sp*dt;}
    }
    if(label!==r.status){r.status=label;set("#sail-status",label);}
  }
  let garageFrom="",garageAnim=0;
  function garage(from){
    if(from!==undefined)garageFrom=from;
    const w=Fleet.get(), bar=n=>"■".repeat(n)+"□".repeat(5-n);
    const cards=Fleet.vehicles.map(v=>{
      const owned=Fleet.owns(v.id),selected=w.selected===v.id;
      const button=selected?'<span class="veh-tag">使用中 ✓</span>':owned?action("選用","veh-use-"+v.id,"quiet-light"):
        action("🪙 "+v.price+" 購買","veh-buy-"+v.id,Fleet.canAfford(v.id)?"primary":"quiet");
      return '<article class="veh-card'+(selected?" on":"")+'"><canvas width="200" height="130" data-veh="'+v.id+'" aria-label="'+esc(v.name)+'模型"></canvas>'+
        '<h3>'+v.icon+" "+esc(v.name)+'</h3><p>'+esc(v.perk)+'</p><p class="veh-stats">速度 '+bar(v.stats[0])+'<br>安全 '+bar(v.stats[1])+'</p>'+button+'</article>';
    }).join("");
    open("船塢","🪙 你有 "+w.coins+" 金幣",'<div class="veh-grid">'+cards+'</div>'+
      '<p class="dialog-text small">每枚記憶碎片 +'+Fleet.reward.gem+"、每關通關 +"+Fleet.reward.finish+"（每關各只領一次）。</p>"+
      '<p id="veh-msg" class="cloud-msg" role="status"></p>'+
      actions(garageFrom==="board"?action("返回登船","board"):action("關閉","close")));
    const canvases=[...body.querySelectorAll("canvas[data-veh]")];
    cancelAnimationFrame(garageAnim);
    const loop=t=>{
      if(!canvases[0]?.isConnected)return;
      for(const c of canvases)world.vehiclePreview(c,c.dataset.veh,.6+Math.sin(t/1800)*.5,t/1000);
      garageAnim=requestAnimationFrame(loop);
    };
    garageAnim=requestAnimationFrame(loop);
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
    if(command==="garage")garage("board");
    if(command?.startsWith("veh-use-")){Fleet.select(command.slice(8));fx("tap");garage();}
    if(command?.startsWith("veh-buy-")){
      const id=command.slice(8),v=Fleet.vehicles.find(item=>item.id===id);
      if(Fleet.buy(id)){fx("gem");garage();}
      else set("#veh-msg","還差 "+(v.price-Fleet.get().coins)+" 金幣，再通關幾關就買得起了！");
    }
    if(command==="star-hint"){
      const node=$("#feedback"),task=lesson.tasks[stage],button=event.target.closest("[data-action]");
      if(starLeft<=0)node.textContent="星象之力這一關已經用完了。";
      else{
        starLeft--;
        const text=task.hint??task.hints?.[Math.min(1,task.hints.length-1)]??"";
        node.textContent="✦ 星象提示 · "+text;
        button.textContent="✦ 星象提示（剩 "+starLeft+" 次）";fx("skill");
      }
      node.hidden=false;
    }
    if(command?.startsWith("ans-"))answerFight(Number(command.slice(4)));
    if(command==="battle-next"&&fight)nextQuestion();
    if(command==="battle-end")endBattle();
    if(command==="battle-retreat"){fight=null;leaveSea();ferryScreen("dock","你被海盜打倒了，回到碼頭整備。生命值已恢復，可以再次登船。");}
    if(command==="boss")startBoss();
    if(command==="boss-back"){fight=null;showFinish(true);}
    if(command==="battle-star"){
      if(fight&&!fight.answered){
        const wrong=fight.q.options.map((_,i)=>i).filter(i=>i!==fight.q.answer&&!fight.eliminated.has(i));
        if(starLeft<=0)notice("星象之力已經用完了。");
        else if(wrong.length<=1)notice("沒有可以再排除的選項了。");
        else{fight.eliminated.add(wrong[Math.floor(Math.random()*wrong.length)]);starLeft--;fx("skill");renderFight();}
      }
    }
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
    sailRun=null;Object.assign(state,{vehicle:null,pirates:[],ball:null,boom:0,speed:0,seaCoins:[],shield:false,coins:[]});
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
  $("#coins").addEventListener("click",()=>garage(""));
  $("#skill-btn").addEventListener("click",useSkill);
  const sprintButton=$("#sprint-btn");
  sprintButton.addEventListener("pointerdown",event=>{event.preventDefault();sprintButton.setPointerCapture(event.pointerId);touchSprint=true;});
  for(const name of ["pointerup","pointercancel","lostpointercapture"])sprintButton.addEventListener(name,()=>{touchSprint=false;});
  $("#sail-abort").addEventListener("click",()=>{leaveSea();ferryScreen("dock");});
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
    para("按住 Shift（或畫面上的「衝刺」鈕）可以衝刺，會消耗體力。開船時偏離航線或遇到巡邏海盜，要回答剛通關單元的問題來反擊；答對攻擊、答錯被砲擊扣血，生命值歸零才會回碼頭。擊敗海盜可以得到金幣和裝備。")+
    para("每關藏著 3 枚閃光金幣，走過去就能撿；每天登入、一次過、海上寶箱也能賺金幣。到「角色換裝」買專屬服裝，每套都有獨特技能。")+
    (!lesson.fictional&&lesson.source?para(lesson.source):"")+actions(action("關閉說明","close"))));
  window.addEventListener("keydown",event=>{
    if((state.mode!=="play"&&state.mode!=="sail")||dialog.open||$("#wardrobe").open||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.key==="Shift")sprintHeld=true;
    if(event.key.toLowerCase()==="q"&&!event.repeat)useSkill();
    const key=event.key.toLowerCase();
    if(key in movement){event.preventDefault();keys.add(movement[key]);}
    if(key==="e"&&!event.repeat){event.preventDefault();interact();}
  });
  window.addEventListener("keyup",event=>{keys.delete(movement[event.key.toLowerCase()]);if(event.key==="Shift")sprintHeld=false;});
  window.addEventListener("blur",()=>{keys.clear();touch.clear();sprintHeld=false;touchSprint=false;});
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
    const sprint=sprintFactor(dt,Boolean(dx||dz||route.length));
    const dashing=performance.now()<dashUntil;
    const speed=5.3*(dashing?1.9:1)*sprint;state.dash=dashing||sprint>1;
    if(route.length){
      let remaining=speed*dt;
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
      const step=speed*dt/(Math.hypot(vx,vz)*slices);
      state.dir=Math.atan2(vx,vz);
      for(let i=0;i<slices;i++){
        if(world.walkable(state.x+vx*step,state.z))state.x+=vx*step;
        if(world.walkable(state.x,state.z+vz*step))state.z+=vz*step;
      }
      state.phase+=dt*14;
    }else state.phase=0;
    updateNearby();
    collectScene();
  }
  function frame(time){
    const dt=Math.min(1,(time-(previousTime||time))/1000);
    previousTime=time;
    if(state.mode==="play"&&!dialog.open&&!$("#wardrobe").open)move(dt);
    if(state.mode==="sail"&&!dialog.open&&!$("#wardrobe").open)sailStep(dt);
    if(state.mode==="repair"){
      state.repair=Math.min(3,(time-repairStart)/1000);
      if(state.repair>=3)finish();
    }
    const skillButton=$("#skill-btn"),dashing=Fleet.skillId()==="dash";
    skillButton.hidden=!dashing||state.mode!=="play";
    if(dashing&&!skillButton.hidden){
      const wait=Math.ceil((dashReady-time)/1000);
      const label=time<dashUntil?"🌪️ 衝刺中！":wait>0?"疾風步 "+wait+" 秒":"🌪️ 疾風步 · Q";
      if(skillButton.textContent!==label){skillButton.textContent=label;skillButton.disabled=wait>0&&time>=dashUntil;}
    }
    paintBars();
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
  const dailyReward=Fleet.daily();
  if(dailyReward)setTimeout(()=>{fx("coin");notice("📅 每日登入第 "+dailyReward.streak+" 天 · 🪙 +"+dailyReward.coins);},900);
  const dueMistakes=Fleet.mistakes().length;
  if(dueMistakes)setTimeout(()=>notice("📕 錯題本有 "+dueMistakes+" 題等你複習！"),dailyReward?4200:1200);
  refreshSkill();
  const requested=new URLSearchParams(location.search).get("unit");
  if(requested==="sample"||units.some(unit=>unit.id===requested))lessonEntry(requested);
  requestAnimationFrame(frame);
})();
