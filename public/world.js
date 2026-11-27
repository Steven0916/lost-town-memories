(() => {
  let canvas = document.querySelector("#world");
  const gl = canvas.getContext("webgl", {alpha:true, antialias:true});
  const harborLand = [[-15,-11],[-12,-14],[4,-15],[14,-13],[18,-8],[19,3],[14,10],[7,13],[-7,12],[-15,8]];
  let land=harborLand, scene="harbor";
  const spawn = {x:0,z:6.5};
  const colors = {};
  let vertices = [], angle = 0, shift = [0,0,0];
  const blockers = [];
  function rgb(hex, shade) {
    const base = colors[hex] ??= hex.match(/../g).map(value => parseInt(value,16)/255);
    return base.map(value => Math.min(1, value * shade));
  }
  let sc = 1, sy = 0, clock = 0;
  function scaled(k, pivotY, draw) { const a = sc, b = sy; sc = k; sy = pivotY; draw(); sc = a; sy = b; }
  function transform([x,y,z]) {
    if (sc !== 1) { x *= sc; z *= sc; y = sy + (y - sy) * sc; }
    const c = Math.cos(angle), s = Math.sin(angle);
    return [shift[0]+x*c+z*s,shift[1]+y,shift[2]+z*c-x*s];
  }
  function face(points, color, shade = 1) {
    const tint = rgb(color, shade);
    for(let i=1;i<points.length-1;i++){
      for(const point of [points[0],points[i],points[i+1]]) vertices.push(...transform(point),...tint);
    }
  }
  function at(x,y,z,direction,draw){
    shift=[x,y,z];angle=direction;draw();shift=[0,0,0];angle=0;
  }
  function box(x,y,z,w,h,d,color) {
    const a=x-w/2,b=x+w/2,c=y,e=y+h,f=z-d/2,g=z+d/2;
    face([[a,c,f],[b,c,f],[b,e,f],[a,e,f]],color,.77);
    face([[a,c,g],[b,c,g],[b,e,g],[a,e,g]],color,.93);
    face([[a,c,f],[a,c,g],[a,e,g],[a,e,f]],color,.83);
    face([[b,c,f],[b,c,g],[b,e,g],[b,e,f]],color,.68);
    face([[a,e,f],[b,e,f],[b,e,g],[a,e,g]],color,1.07);
    face([[a,c,f],[b,c,f],[b,c,g],[a,c,g]],color,.65);
  }
  function prism(x,y,z,r,h,color,sides=8,top=r) {
    const lower=[], upper=[];
    for(let i=0;i<sides;i++){
      const a=i*Math.PI*2/sides;
      lower.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);
      upper.push([x+Math.cos(a)*top,y+h,z+Math.sin(a)*top]);
    }
    for(let i=0;i<sides;i++){
      const k=(i+1)%sides;
      face([lower[i],lower[k],upper[k],upper[i]],color,.76+.24*(1+Math.sin(i*6.28/sides))/2);
    }
    face(upper,color,1.10);face([...lower].reverse(),color,.71);
  }
  function crystal(x,y,z,r,color){
    const p=[[x+r,y,z],[x,y,z+r],[x-r,y,z],[x,y,z-r]];
    for(let i=0;i<4;i++){
      face([p[i],p[(i+1)%4],[x,y+r*1.55,z]],color,1.13-i*.09);
      face([p[i],p[(i+1)%4],[x,y-r*1.55,z]],color,.88-i*.09);
    }
  }
  function path(points,width,tint,height=.028) {
    for(let i=1;i<points.length;i++){
      const [x,z]=points[i-1], [a,b]=points[i], dx=a-x,dz=b-z,d=Math.hypot(dx,dz);
      const nx=dz*width/2/d,nz=-dx*width/2/d;
      face([[x+nx,height,z+nz],[a+nx,height,b+nz],[a-nx,height,b-nz],[x-nx,height,z-nz]],tint);
      const disc=[];
      for(let k=0;k<12;k++){const t=k*Math.PI*2/12;disc.push([a+Math.cos(t)*width/2,height,b+Math.sin(t)*width/2]);}
      face(disc,tint,1);
    }
  }
  function house(x,z,rotation,w,d,tone,roof,h=2.15) {
    blockers.push({x,z,r:Math.min(w,d)*.43});
    at(x,0,z,rotation,()=>{
      box(0,0,0,w+.16,.24,d+.16,"a49a75");
      box(0,.24,0,w,h,d,tone);
      const a=w*.59,b=d*.58,y=.19+h,peak=y+w*.36;
      face([[-a,y,-b],[0,peak,-b],[0,peak,b],[-a,y,b]],roof,1.10);
      face([[a,y,-b],[0,peak,-b],[0,peak,b],[a,y,b]],roof,.79);
      face([[-a,y,b],[a,y,b],[0,peak,b]],roof,.93);
      face([[-a,y,-b],[a,y,-b],[0,peak,-b]],roof,.72);
      // Narrow raised seams follow the pitch of both roof faces.
      for(let z=-b+.2;z<b;z+=.44){
        for(const side of [-1,1])face([[side*a,y+.02,z],[0,peak+.02,z],[0,peak+.02,z+.045],[side*a,y+.02,z+.045]],roof,.72);
      }
      box(-.29,.09,d/2+.24,.98,.18,.48,"968776");
      box(w*.29,.85,d/2+.09,.79,.09,.19,"b5a186");
      box(-.29,.24,d/2+.028,.69,1.24,.09,"644a40");
      box(w*.29,.91,d/2+.04,.61,.58,.10,"416174");
      box(w*.29,1.15,d/2+.105,.64,.06,.04,"fff1c4");
      box(w*.29,.89,d/2+.105,.055,.61,.04,"fff1c4");
      box(w*.29-.25,y-.17,-d*.22,.34,1.04,.38,"d3ae88");
      box(w*.29-.25,y+.80,-d*.22,.46,.14,.49,"8b6553");
    });
  }
  function tree(x,z,scale=1,tint="4b9c6d") {
    blockers.push({x,z,r:.38*scale});
    at(x,0,z,.4,()=>{
      prism(0,0,0,.15*scale,1.65*scale,"866a41",5);
      prism(-.43*scale,.85*scale,.12*scale,.59*scale,.85*scale,tint,7,.23*scale);
      prism(.49*scale,1.18*scale,-.1*scale,.63*scale,1.02*scale,tint,7,.19*scale);
      prism(0,.73*scale,0,.8*scale,1.19*scale,tint,6,.39*scale);
      prism(.13*scale,1.52*scale,.10*scale,1.03*scale,1.43*scale,tint,7,.12*scale);
    });
  }
  function stall(x,z,rotation,tint){
    blockers.push({x,z,r:.85});
    at(x,0,z,rotation,()=>{
      box(0,0,0,2.3,.13,1.72,"b99a61");
      box(0,.18,.36,2.12,.73,.60,"aa734a");
      for(const i of [-1,1]) for(const j of [-1,1]) box(i,.12,j*.66,.09,1.86,.09,"624d39");
      for(let i=0;i<7;i++){
        const x=-1.23+i*.35,color=i%2?"fff1c5":tint;
        face([[x,1.87,.88],[x+.35,1.87,.88],[x+.35,2.30,0],[x,2.30,0]],color);
        face([[x,2.30,0],[x+.35,2.30,0],[x+.35,1.87,-.88],[x,1.87,-.88]],color,.84);
        box(x+.175,1.72,.87,.35,.15,.06,color);
      }
      for(let i=0;i<4;i++) prism(-.74+i*.46,.9,.35,.16,.16,i%2?"e7ad52":"c97043",6,.1);
    });
  }
  function lamp(x,z){
    prism(x,.04,z,.08,1.42,"4e6659",6);
    box(x,1.44,z,.23,.26,.23,"ffe1a2");
    prism(x,1.70,z,.22,.17,"466d60",4,.03);
  }
  function boat(x,z,rotation,roof){
    at(x,-.39,z,rotation,()=>{
      const tip=[[-.47,0,-1.38],[.47,0,-1.38],[.68,0,.65],[0,0,1.72],[-.68,0,.65]];
      const deck=tip.map(([x,,z])=>[x*1.16,.48,z*1.05]);
      for(let i=0;i<tip.length;i++){
        const j=(i+1)%tip.length;
        face([tip[i],tip[j],deck[j],deck[i]],"926649",.76+i*.05);
      }
      face(deck,"d1ac73");
      prism(0,.45,0,.045,2.0,"795b42",5);
      face([[0,.78,-.04],[0,.78,-1.2],[0,2.39,-.04]],roof);
      box(.28,.48,.37,.23,.2,.41,"ead8a1");
    });
  }

  // ---- 專屬服裝外觀 ----
  const costumePalette={
    star:{coat:"3b3f8f",pants:"2b2f5f",shoes:"6a5acd"},
    wind:{coat:"2f9c95",pants:"e8e2c8",shoes:"f4f1e6"},
    gold:{coat:"7a2e3a",pants:"2e2a2a",shoes:"3a2a1a"},
    pirate:{coat:"8c2f2f",pants:"2f3340",shoes:"3b2a1a"},
    scholar:{coat:"e4dcc2",pants:"6c6a58",shoes:"5a4632"},
    knight:{coat:"9aa6b1",pants:"6e7a85",shoes:"5a626b"}
  };
  function costumeHead(cs){
    switch(cs){
      case "star":
        prism(0,1.4,0,.4,.08,"3b3f8f",8);prism(0,1.47,0,.3,.78,"3b3f8f",8,.03);
        prism(0,1.5,0,.31,.08,"ffd981",8);crystal(0,2.32,0,.1,"ffe08a");break;
      case "wind":
        box(0,1.42,-.02,.48,.1,.46,"2b6f6a");box(0,1.31,0,.48,.07,.46,"fff2c4");box(.27,1.38,-.12,.05,.3,.05,"f5f0e0");break;
      case "gold":
        prism(0,1.4,0,.3,.07,"2a2326",8);prism(0,1.47,0,.22,.55,"2a2326",8,.2);prism(0,1.5,0,.225,.1,"f0cd74",8);break;
      case "pirate":
        prism(0,1.42,0,.52,.09,"26262e",6,.46);prism(0,1.5,0,.3,.22,"26262e",6,.25);prism(0,1.415,0,.525,.03,"e0b84a",6);
        box(0,1.5,.27,.1,.1,.03,"f5f2e6");box(.11,1.12,.262,.14,.14,.02,"111111");box(0,1.27,.255,.5,.03,.02,"111111");break;
      case "scholar":
        box(0,1.42,0,.4,.09,.4,"232f55");box(0,1.5,0,.64,.05,.64,"232f55");box(.33,1.32,0,.04,.2,.04,"ffd981");break;
      case "knight":
        box(0,1.0,0,.52,.52,.5,"aab4be");box(0,1.14,.255,.4,.1,.02,"20262b");
        prism(0,1.5,0,.35,.14,"aab4be",8,.2);box(0,1.62,-.05,.08,.3,.32,"d9534f");break;
    }
  }
  function costumeBody(cs,sway){
    switch(cs){
      case "star":
        prism(0,.3,0,.46,.5,"3b3f8f",8,.34);
        for(const [x,y] of [[-.18,.62],[.2,.45],[-.05,.3],[.25,.7]])box(x,y,.235,.07,.07,.02,"ffd981");
        crystal(.47,.66,.14,.1,"9be7ff");break;
      case "wind":
        face([[-.28,.95,-.23],[.28,.95,-.23],[.38,.1,-.6+sway*.4],[-.38,.1,-.6+sway*.4]],"7fe0d6",.95);
        face([[-.28,.95,-.23],[-.38,.1,-.6+sway*.4],[.38,.1,-.6+sway*.4],[.28,.95,-.23]],"4fb8ae",.8);
        for(const side of [-1,1])box(side*.3,.07,-.02,.04,.18,.2,"ffffff");break;
      case "gold":
        box(0,.83,0,.62,.15,.46,"f0cd74");box(0,.55,.228,.06,.06,.02,"f0cd74");box(0,.42,.228,.06,.06,.02,"f0cd74");
        box(-.3,.34,.26,.2,.2,.16,"f0cd74");box(-.3,.46,.26,.12,.05,.1,"b8903a");
        box(.5,.05,.12,.05,.95,.05,"f0cd74");box(.5,1.0,.12,.12,.1,.12,"ffe08a");break;
      case "pirate":
        box(0,.83,0,.62,.13,.46,"26262e");box(0,.83,.235,.1,.1,.02,"e0b84a");
        for(const y of [.62,.5,.38])box(0,y,.228,.05,.05,.02,"e0b84a");
        box(-.46,.2,-.12,.06,.06,.6,"c8ced4");box(-.46,.2,.2,.14,.05,.1,"e0b84a");break;
      case "scholar":
        prism(0,.3,0,.46,.55,"e4dcc2",8,.32);box(0,.8,0,.62,.1,.46,"3d5aa8");
        box(.42,.46,.24,.2,.27,.07,"8a4b3a");box(.42,.46,.285,.16,.23,.02,"fff7de");break;
      case "knight":
        box(0,.45,.225,.5,.42,.03,"dfe5ea");box(0,.55,.245,.12,.12,.02,"d9534f");
        for(const side of [-1,1])box(side*.4,.78,0,.22,.14,.26,"c3ccd4");
        box(-.52,.5,.22,.08,.5,.4,"4a6fa5");box(-.57,.5,.22,.02,.2,.12,"ffd981");break;
    }
  }
  const shadeHex=(hex,k)=>String(hex).match(/../g).map(v=>Math.min(255,Math.round(parseInt(v,16)*k)).toString(16).padStart(2,"0")).join("");
  const npcSkins=["efbf92","e3a97c","f4cfa7","c98d62"], npcHair=["503b35","2b2420","7a4b2a","b27a43","3a2f45"];
  function person(x,z,dir,coat,hat,phase=0,player=false,elevation=0){
    const look=player ? (window.travelOutfit||{}) : {};
    const seed=parseInt(String(coat).slice(0,4),16)||0;
    const skin=player?(look.skin||"efbf92"):npcSkins[seed%4], hair=player?(look.hair||"503b35"):npcHair[(seed>>2)%5];
    const cs=player&&costumePalette[look.costume]?look.costume:null, pal=cs?costumePalette[cs]:null;
    coat=pal?pal.coat:(look.coat || coat);
    const pants=pal?pal.pants:(look.pants || "45494f");
    let shoes=pal?pal.shoes:(look.shoes || "5f4738");
    const wp=player?(look.weapon|0):0, ar=player?(look.armor|0):0, bt=player&&!cs?(look.boots|0):0;
    if(bt)shoes=["","6b4a2f","e8e2c8","8fd0ff"][bt];
    const skinDark=shadeHex(skin,.9), hasHat=cs?true:(!player||look.hat!=="bare");
    const idle=phase?0:Math.sin(clock*2.2+x*.7+z*.9)*.012;
    const blink=((clock+seed*.37+x*.5)%3.6)<.13;
    at(x,elevation+(phase?Math.abs(Math.sin(phase))*.05:idle),z,dir,()=>{
      if(!elevation)prism(0,.035,0,.43,.012,"5c8267",12);
      const sway=Math.sin(phase)*.18;
      // 腿、褲口、鞋
      for(const s of [-1,1]){
        const off=-s*sway;
        box(s*.15,.04,off,.2,.43,.23,pants);
        box(s*.15,.04,off,.215,.08,.245,shadeHex(pants,.78));
        box(s*.15,.02,.043+off,.22,.12,.31,shoes);
        box(s*.15,.02,.17+off,.2,.07,.07,shadeHex(shoes,1.25));
        box(s*.15,0,.043+off,.23,.03,.32,"2a2220");
        if(bt){box(s*.15,.1,off,.235,.13,.26,shadeHex(shoes,.92));if(bt>=3)box(s*.28,.08,off-.02,.04,.2,.22,"ffffff");}
      }
      // 軀幹：下擺、主體、腰帶、領口、鈕扣
      box(0,.4,0,.63,.1,.47,shadeHex(coat,.82));
      box(0,.43,0,.59,.6,.43,coat);
      box(0,.52,0,.60,.08,.44,"775b45");
      box(0,.53,.228,.10,.055,.025,"c9a563");
      box(0,.98,.08,.36,.06,.3,"f4ecd2");
      for(const y of [.64,.76,.88])box(0,y,.222,.045,.045,.015,"e9d9a8");
      if(ar){
        const col=["","8a5a34","aab4be","3aa57f"][ar];
        box(0,.46,.222,.5,.4,.03,col);
        for(const s of [-1,1])box(s*.4,.82,0,.2,.12,.28,col);
        if(ar>=2)box(0,.58,.24,.3,.04,.01,ar>=3?"ffd981":"dfe5ea");
        if(ar>=3)for(const s of [-1,1])prism(s*.4,.94,0,.05,.16,"ffd981",4,.01);
      }
      if(wp){
        const hz=sway*.6,blade=["","b98a52","cfd5da","9be7ff"][wp];
        box(.52,.5,hz+.06,.05,.78,.04,blade);
        box(.52,.46,hz+.06,.2,.04,.07,"c9a563");
        box(.52,.36,hz+.06,.05,.12,.05,"6b4a2f");
        if(wp>=3)crystal(.52,1.36,hz+.06,.08,"bff3ff");
      }
      if(!cs&&player&&look.gear==="pack"){
        face([[-.27,1.0,.219],[-.15,1.0,.219],[.3,.56,.219],[.18,.56,.219]],"7a5a3c");
        box(.24,.58,.222,.075,.075,.015,"c9a563");
      }
      // 手臂、袖口、手（手做成圓潤的拳頭）
      for(const s of [-1,1]){
        const z0=s*sway*.6;
        box(s*.36,.54,z0,.16,.46,.17,coat);
        box(s*.36,.5,z0,.16,.04,.17,"efe3c4");
        box(s*.36,.4,z0,.15,.13,.16,shadeHex(skin,.97));
        box(s*.36,.37,z0+.005,.12,.05,.13,skinDark);
      }
      box(0,.93,0,.2,.1,.2,skinDark);
      // 頭部整體放大，做成可愛的大頭比例（頭飾、頭髮、五官一起縮放）
      scaled(1.22,1.0,()=>{
        if(cs!=="knight"){
          box(0,1.0,0,.46,.44,.44,skin);
          box(0,.985,.01,.4,.04,.4,skinDark);
          for(const s of [-1,1])box(s*.245,1.1,0,.05,.12,.1,skinDark);
        }
        if(cs!=="knight"){
          box(0,1.0,-.2,.48,.47,.08,hair);
          for(const s of [-1,1]){box(s*.235,1.18,-.02,.04,.26,.4,hair);box(s*.17,1.31,.215,.1,.12,.03,hair);}
          box(-.04,1.34,.215,.2,.1,.03,hair);
          box(.1,1.37,.217,.1,.07,.03,hair);
          if(!hasHat){box(0,1.42,-.02,.48,.08,.46,hair);box(.06,1.49,.05,.05,.13,.05,hair);box(-.12,1.49,0,.08,.06,.08,hair);}
          // 五官
          for(const s of [-1,1]){
            if(blink){box(s*.11,1.17,.226,.1,.025,.02,"2b2f33");}
            else{
              box(s*.11,1.14,.222,.105,.12,.02,"ffffff");
              box(s*.11,1.14,.232,.065,.1,.02,"4a5e82");
              box(s*.11,1.15,.242,.036,.07,.015,"15181b");
              box(s*.093,1.2,.25,.024,.024,.01,"ffffff");
            }
            box(s*.11,1.285,.226,.11,.025,.015,hair);
            box(s*.165,1.07,.226,.08,.045,.01,"f2a58f");
          }
          box(0,1.08,.228,.05,.06,.04,shadeHex(skin,.93));
          box(0,1.03,.226,.07,.022,.015,"a5524a");
          for(const s of [-1,1])box(s*.05,1.045,.226,.025,.022,.015,"a5524a");
        }
        if(cs)costumeHead(cs);
        else if(look.hat==="hood"){
          prism(0,1.39,0,.34,.52,"695387",6,.035);
        }else if(look.hat==="bare"){
          // 不戴帽子：露出髮型
        }else{
          prism(0,1.37,0,.36,.065,hat,8);
          prism(0,1.42,0,.26,.19,hat,8,.18);
        }
      });
      if(!cs&&look.coat==="367b67")box(0,.83,0,.62,.15,.46,"f0cd74");
      if(!cs&&look.coat==="a74f55")prism(0,.35,0,.44,.47,coat,8,.31);
      if(cs)costumeBody(cs,sway);
      if(!cs&&look.gear==="lamp"){
        box(.40,.29,.07,.18,.20,.18,"ffce66");
        box(.40,.49,.07,.22,.05,.22,"80543b");
        box(.40,.52,.07,.035,.12,.035,"80543b");
      }
      if(!cs&&player && look.gear==="pack"){box(0,.53,-.29,.38,.37,.19,"b47840");box(0,.79,-.398,.34,.11,.05,"edbd70");}
    });
  }
  let points=window.LESSON.landmarks;
  const terrain=()=>{
    face([[-240,-.42,-240],[240,-.42,-240],[240,-.42,240],[-240,-.42,240]],"62bfc4");
    let seed=42;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<300;i++){
      const x=rand()*125-61,z=rand()*95-45,l=rand()*2.6+.37;
      face([[x,-.412,z],[x+l,-.412,z+.11],[x+l+.23,-.412,z+.16],[x+.37,-.412,z+.18]],i%3?"7acdd0":"9adad8");
    }
    const grass=["a9c67d","a1c47b","a9c580","9fbe71","adca82"];
    land.forEach(([x,z],i)=>{
      const [a,b]=land[(i+1)%land.length];
      face([[x,0,z],[a,0,b],[a*1.026,-.68,b*1.026],[x*1.026,-.68,z*1.026]],i%3?"a1a47a":"b1af7a");
      face([[0,0,0],[x,0,z],[a,0,b]],grass[i%grass.length]);
    });
    path([[-14,4],[-9,2],[-5,1],[0,1],[4,-2],[7,-4],[10,-5],[14,-8]],2.75,"e1c492");
    path([[0,8],[0,1],[1,-5],[0,-10]],2.35,"ead2a0",.032);
    path([[6,7],[7,1],[7,-4]],1.9,"e4cb95",.036);
    prism(0,.035,6.5,3.15,.026,"e8d0a0",9);
    prism(0,.040,7.95,.74,.25,"b99d78",8);
    prism(0,.29,7.95,.51,.10,"e3c597",8);
    const council=points.find(p=>p.id==="council");
    prism(council.x,.04,council.z,2.25,.06,"d3ba8a",8);
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      prism(council.x+Math.sin(a)*1.88,.11,council.z+Math.cos(a)*1.88,.19,.27,"b3a079",6);
    }
    for(let i=0;i<23;i++){
      const x=-19+i*.27;
      box(x,-.06,4,.232,.16,2.0,i%3?"bc925c":"cba36c");
      if(i%4===0)for(const z of [3.04,4.96])box(x,-.45,z,.15,.85,.15,"80654f");
    }
    for(let i=0;i<4;i++){box(-14.04+(i%2)*.48,.09,5.8+Math.floor(i/2)*.55,.41,.36,.46,"bd8652");}
    boat(-18.3,1.82,.32,"fff0c8");boat(-16.5,6.7,-.5,"e98d69");boat(-22,-2,-.7,"f2e7a8");
    house(-11,-6,.1,3.05,2.95,"efc391","b85d52");house(-6.4,-8.8,-.34,3.6,3.1,"ead69a","517f80");
    house(-9.8,7.9,-.17,3.5,2.8,"eed29d","cb7553");house(4.4,8.05,.25,3.4,2.5,"eab995","a35e53");
    house(11.7,3.6,.45,3.6,3,"eed5a5","6b8e8b");house(13.4,-9,.28,3.2,2.75,"ecc58a","b56c52",2.25);
    house(7.5,-9.5,-.36,3.75,2.9,"f0d39e","be7754");house(2.1,-10,-.15,3.65,3.4,"efdbac","9b5f66",2.65);
    stall(2.25,-4.8,-.11,"dc7d65");stall(5.0,-3.1,.18,"4f8c90");stall(-2.6,-3.4,-.32,"dcab51");
    for(const [x,z,s] of [[-13,-9,1.17],[-13,-3,.75],[-4,-11,1.1],[-1,-12,1.1],[4,-13,1.16],[8,-13,1],[10.5,-11,1.3],[16,-9,1.15],[17,-5,1.1],[16,-1,1.17],[15,4,.9],[10,8,1.3],[8,10,.9],[-5,9,.9],[-12,6.6,.73],[-5,-4,.6],[-9,-1,.53],[12,7,.8],[-13,0,.55],[-6,6,.72]]) tree(x,z,s,z%2?"588f69":"659d69");
    for(const [x,z] of [[-13,2],[-9,3.5],[-2,2],[2,5],[6,-5.7],[10,-2.8],[13,-6.5]])lamp(x,z);
    for(let i=0;i<90;i++){
      const x=rand()*31-14,z=rand()*23-12;
      if(!inside(x,z)||Math.abs(x)<2||Math.abs(z)<2)continue;
      const c=i%3?"eaf0ba":"edb571";
      prism(x,.018,z,.08,.15,c,5,.02);
    }
    const map=points.find(p=>p.id==="map");
    at(map.x-.12,0,map.z-.4,.1,()=>{
      for(const x of [-.71,.71]) box(x,0,0,.11,1.52,.12,"825e45");
      box(0,.71,0,1.49,.84,.19,"795840");
      box(0,.81,.12,1.30,.62,.04,"ffedb8");
      box(-.28,1.04,.147,.41,.14,.018,"8bb9a8");
      box(.29,1.22,.147,.38,.12,.018,"cca875");
      box(0,1.30,.148,1.22,.056,.018,"d2b07e");
      box(0,1.54,0,1.64,.14,.44,"a76551");
    });
  };
  const layouts={
    market:{shape:[[-15,-9],[-9,-13],[10,-13],[16,-7],[16,8],[7,12],[-9,11],[-16,6]],land:"d4aa78",edge:"bb8c64",sky:"9bbeb5",path:"f2d5a5"},
    industry:{shape:[[-16,-11],[15,-11],[18,-7],[18,7],[12,11],[-14,11],[-17,7]],land:"9c9078",edge:"756d60",sky:"ab9e89",path:"c7b69a"},
    lab:{shape:[[-10,-13],[10,-13],[17,-6],[17,6],[10,12],[-10,12],[-17,6],[-17,-6]],land:"788dba",edge:"506583",sky:"597d9c",path:"b4dce3"},
    civic:{shape:[[-12,-12],[13,-12],[17,-5],[15,9],[10,12],[-10,12],[-16,5],[-16,-6]],land:"adc19a",edge:"829c7e",sky:"a5cdce",path:"e4d5b0"},
    culture:{shape:[[-15,-9],[-9,-13],[7,-13],[16,-8],[18,3],[13,11],[-9,11],[-16,6]],land:"aeaf85",edge:"988c6e",sky:"d6a59c",path:"efc698"},
    debate:{shape:[[-7,-14],[7,-14],[16,-8],[16,8],[8,12],[-8,12],[-16,8],[-16,-8]],land:"9f8fba",edge:"726681",sky:"a69cbb",path:"e8cdbf"},
    trade:{shape:[[-16,-10],[11,-11],[17,-6],[18,3],[11,10],[-4,12],[-15,8]],land:"c5b78b",edge:"ad9975",sky:"6cb9c7",path:"ebd1a6"},
    aid:{shape:[[-16,-8],[-6,-13],[11,-12],[17,-8],[17,7],[11,12],[-11,11],[-17,5]],land:"93b5a1",edge:"6a9d8b",sky:"8cbdcd",path:"dcd9bf"},
    nature:{shape:[[-16,-7],[-10,-12],[3,-14],[12,-11],[18,-3],[17,6],[8,12],[-7,12],[-15,8]],land:"769c69",edge:"5b8665",sky:"67afb2",path:"d6c09b"},
    action:{shape:[[-14,-10],[-6,-13],[12,-11],[17,-4],[15,8],[8,12],[-9,12],[-16,5]],land:"c5b08a",edge:"9e9376",sky:"a9cbb6",path:"ebd1a0"}
  };
  const cornerColors=["71b590","eac36c","8cadd6","d899ae"];
  function column(x,z,h,tint){
    box(x,0,z,.78,.18,.78,tint);
    box(x,.18,z,.43,h,.43,tint);
    box(x,h+.18,z,.75,.17,.75,tint);
  }
  function crate(x,z,tint){
    box(x,.025,z,1.54,.94,1.03,tint);
    box(x,.87,z,1.61,.12,1.09,"e5c389");
    for(const dx of [-.49,.49])box(x+dx,.05,z+.53,.16,.80,.05,"b79a6c");
  }
  function tower(x,z,tint) {
    prism(x,.02,z,.9,.30,tint,8);
    prism(x,.32,z,.41,2.40,tint,6,.29);
    prism(x,2.75,z,.74,.37,"aadfe1",8,.38);
    crystal(x,3.37,z,.40,"9ee5dc");
  }
  function pavilion(x,z,tint){
    box(x,.03,z,4.1,.28,2.65,"d4c1a3");
    for(const dx of [-1.64,-.53,.53,1.64])column(x+dx,z+.51,1.6,"eddfb9");
    box(x,1.98,z,4.10,.29,2.53,tint);
    at(x,0,z,0,()=>face([[-2.05,2.27,1.27],[2.05,2.27,1.27],[0,3.10,1.27]],tint));
  }
  function damagedWorkshop(x,z){
    at(x,0,z,0,()=>{
      box(0,.02,0,4.9,.18,3.5,"756b5d");
      // Stepped courses leave a jagged opening in the brick shell.
      for(let col=0;col<10;col++){
        const rows=[8,8,6,5,2,2,3,5,7,8][col];
        for(let row=0;row<rows;row++){
          const tint=row===rows-1?"534b43":["a4735d","956950","866554"][(col+row)%3];
          box(-2.18+col*.48,.2+row*.27,.78,.47,.256,.37,tint);
        }
      }
      box(-2.15,.19,-.52,.34,2.05,2.45,"837264");
      for(let i=0;i<14;i++){
        const dx=Math.sin(i*2.3)*1.48,dz=Math.cos(i*1.7)*.48;
        prism(dx,.2,1.07+dz,.19+i%3*.08,.12+i%4*.055,i%2?"896552":"706d65",5,.12);
      }
      for(const dx of [-1.84,.02,1.8])box(dx,.2,-.72,.105,3,.105,"847257");
      for(const h of [1.28,2.61])box(0,h,-.72,4.15,.11,.49,"ad9671");
      for(let i=0;i<6;i++)box(1.47,.2+i*.34,-.42,.48,.075,.09,"bd9e71");
      for(const dx of [1.22,1.72])box(dx,.19,-.42,.075,2.12,.09,"8c7455");
    });
    blockers.push({x,z,r:1.75});
  }
  const stillAir=window.matchMedia("(prefers-reduced-motion: reduce)");
  function chimneySmoke(time){
    const t=stillAir.matches?0:time*.14;
    for(let i=0;i<8;i++){
      const age=(i/8+t)%1;
      const x=-1.32+age*2.05,z=-9.65-age*.38,r=.12+age*.45;
      prism(x,4.57+age*3.8,z,r,r*.94,["837c73","979085","aba396","c0b7aa"][Math.floor(age*4)],8,r*.81);
    }
  }

  // ---- 載具：帆船、戰鬥機、海怪（模型朝 +z 前進）----
  function tube(x,y,z0,z1,r0,r1,color,sides=8){
    for(let i=0;i<sides;i++){
      const a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides;
      const p=(ang,r,z)=>[x+Math.cos(ang)*r,y+Math.sin(ang)*r,z];
      face([p(a,r0,z0),p(b,r0,z0),p(b,r1,z1),p(a,r1,z1)],color,.68+.45*(1+Math.sin(a+.8))/2);
    }
  }
  function vehicle(kind,x,z,dir,time=0){
    if(kind==="jet"){
      prism(x,-.385,z,1.35,.01,"1f7184",10);
      at(x,.95+Math.sin(time*2.4)*.1,z,dir,()=>{
        tube(0,0,-1.7,.9,.38,.31,"b9c4cc");
        tube(0,0,.9,2.4,.31,.04,"dfe6ea");
        box(0,.3,.35,.34,.24,.95,"4aa3df");
        for(const s of [-1,1]){
          face([[s*.25,.03,.7],[s*2.2,.0,-.95],[s*2.2,.0,-1.5],[s*.25,.03,-1.35]],"8f9ca7");
          face([[s*.25,-.05,.7],[s*2.2,-.07,-.95],[s*2.2,-.07,-1.5],[s*.25,-.05,-1.35]],"67757f");
          box(s*2.2,-.1,-1.2,.12,.22,.65,"d9534f");
          face([[s*.2,.05,-1.3],[s*.95,.05,-1.9],[s*.95,.05,-2.05],[s*.2,.05,-1.75]],"8f9ca7");
        }
        box(0,.7,-1.75,.08,.95,.55,"d9534f");
        box(0,.12,.95,.62,.05,.08,"d9534f");
        const f=.6+.3*Math.sin(time*38);
        tube(0,0,-1.7,-1.7-f*1.4,.24,.02,"ffb347",6);
        tube(0,0,-1.7,-1.7-f*.8,.13,.02,"fff2b0",6);
      });
      return;
    }
    if(kind==="kraken"){
      const rise=.1*Math.sin(time*2.1);
      at(x,-.42,z,dir,()=>{
        prism(0,0,0,1.3,.5,"68499a",12,1.1);
        prism(0,.5+rise,0,1.1,.7,"7d5cb0",12,.84);
        prism(0,1.2+rise,0,.84,.62,"8d6dc3",12,.36);
        prism(0,1.82+rise,0,.36,.3,"a487d8",8,.05);
        for(let i=0;i<6;i++){const a=i*1.1+.4;box(Math.cos(a)*.7,1.0+rise,-Math.abs(Math.sin(a))*.7,.17,.1,.17,"c9b0ef");}
        for(const s of [-1,1]){
          box(s*.42,.98+rise,.8,.38,.38,.26,"fff3c2");
          box(s*.42,.98+rise,.94,.17,.22,.1,"2a1b3d");
          box(s*.42,1.26+rise,.8,.44,.09,.28,"553b7b");
          prism(s*.3,1.95+rise,-.05,.1,.5,"b99bea",5,.02);
        }
        box(0,.58+rise,.95,.62,.16,.1,"2a1b3d");
        for(let i=-2;i<=2;i++)box(i*.12,.67+rise,1.0,.07,.1,.05,"fff6e0");
        for(let t=0;t<7;t++){
          const a=1.0+t*.69, dx=Math.sin(a), dz=Math.cos(a);
          for(let j=0;j<6;j++){
            const r=1.0+j*.3, sway=Math.sin(time*2.6-j*.7+t*1.3)*.28*(j/5+.2);
            const y=.1+Math.max(0,Math.sin(j*.62+t+time*1.8))*.35*(j/5+.3);
            prism(dx*r-dz*sway,y,dz*r+dx*sway,.22-.028*j,.2,j%2?"7d5cb0":"8d6dc3",6,.17-.026*j);
          }
        }
      });
      return;
    }
    boat(x,z,dir,"fce7a8");
  }
  let sea=null;
  function seaTerrain(){
    const route=sea.route, start=route[0], goal=route[route.length-1];
    face([[-420,-.42,-420],[420,-.42,-420],[420,-.42,420],[-420,-.42,420]],"2f93a8");
    path(route,17,"4cb2c0",-.40);
    for(let i=1;i<route.length;i++){
      const [x0,z0]=route[i-1],[x1,z1]=route[i],n=Math.max(1,Math.round(Math.hypot(x1-x0,z1-z0)/3.2));
      for(let k=0;k<n;k++)box(x0+(x1-x0)*k/n,-.38,z0+(z1-z0)*k/n,.55,.03,.55,"ffe099");
    }
    let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const nearRoute=(x,z)=>{let best=1e9;for(let i=1;i<route.length;i++){const [ax,az]=route[i-1],[bx,bz]=route[i],vx=bx-ax,vz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz)));best=Math.min(best,Math.hypot(x-ax-t*vx,z-az-t*vz));}return best;};
    for(let i=0;i<46;i++){
      const x=-110+rnd()*250,z=-70+rnd()*140;
      if(nearRoute(x,z)<14)continue;
      const r=1+rnd()*2.4;
      prism(x,-.8,z,r+.5,.7,"e9d19b",9);
      prism(x,-.15,z,r,.35,i%3?"7fa57b":"6e7a80",9,r*.7);
      if(i%3===1)tree(x,z,.8+rnd()*.5,"4b9c6d");
    }
    for(const [cx,cz,flag] of [[start[0],start[1],false],[goal[0],goal[1],true]]){
      prism(cx,-.95,cz,12,.9,"e9d19b",14);
      prism(cx,-.2,cz,10,.4,"89aa76",14,9);
      for(let i=0;i<5;i++){const a=i*1.25+(flag?.6:0);tree(cx+Math.cos(a)*6.2,cz+Math.sin(a)*6.2,1+.2*(i%3),"4b9c6d");}
      house(cx+Math.cos(2.2)*3,cz+Math.sin(2.2)*3-1,0,3.2,2.6,flag?"ebcaa0":"d6c28e",flag?"5d8094":"b5594f",1.7);
      lamp(cx+3.6,cz+3.4);
      box(cx+8.4*(flag?-1:1),-.12,cz,3.2,.2,1.1,"ac784e");
      if(flag){
        box(cx+2,.2,cz-4.5,.14,4.2,.14,"624d39");
        face([[cx+2.07,3.9,cz-4.5],[cx+4.2,3.4,cz-4.5],[cx+2.07,2.9,cz-4.5]],"e6574f");
      }
    }
  }
  function seaDynamic(state,time){
    const d=state.dir,sx=Math.sin(d),sz=Math.cos(d),kind=state.vehicle||"sail";
    if((state.speed||0)>.8&&kind!=="jet")for(let i=0;i<7;i++){
      const back=1.2+i*.85,spread=.35+i*.1;
      prism(state.x-sx*back,-.395,state.z-sz*back,spread,.012,i%2?"e4f5f4":"bfe7e6",8);
    }
    if(kind==="jet"&&(state.speed||0)>.8)for(let i=0;i<5;i++){
      const back=3+i*1.1;
      prism(state.x-sx*back,-.395,state.z-sz*back,.5+i*.18,.012,"dff3f2",8);
    }
    if(!(state.boom>.15)){
      vehicle(kind,state.x,state.z,d,time);
      if(kind==="sail")person(state.x-sx*.15,state.z-sz*.15,d,"556ea2","333f65",0,true,.12);
    }
    for(const p of state.pirates||[])boat(p.x,p.z,p.dir,"2b2b35");
    if(state.ball)prism(state.ball.x,state.ball.y,state.ball.z,.28,.28,"22232c",8);
    if(state.boom>0)at(state.x,0,state.z,time*4,()=>crystal(0,.7,0,.35+state.boom*1.1,state.boom<.5?"ffb347":"ff7a45"));
    for(const c of state.seaCoins||[])if(!c.taken){
      if(c.chest)at(c.x,0,c.z,time*.6,()=>{
        box(0,-.4,0,1.4,.7,.9,"8a5a34");box(0,.1,0,1.45,.25,.95,"b67a42");box(0,-.05,.48,.25,.3,.06,"ffd24a");
        crystal(0,1.2+Math.sin(time*3+c.i)*.15,0,.22,"ffe08a");
      });
      else at(c.x,0,c.z,time*2.4,()=>{const y=.6+Math.sin(time*3+c.i)*.15;tube(0,y,-.05,.05,.55,.55,"ffd24a",12);tube(0,y,.05,.07,.38,.38,"ffb92e",12);});
    }
    if(state.shield&&!(state.boom>0))at(state.x,0,state.z,time*1.5,()=>{
      prism(0,-.38,0,2.3,.02,"9be7ff",12);
      for(const [a,b] of [[2.3,0],[-2.3,0],[0,2.3],[0,-2.3]])crystal(a,.8,b,.14,"bff3ff");
    });
    const g=sea.route[sea.route.length-1];
    at(g[0],0,g[1],time*.9,()=>crystal(0,3.2+Math.sin(time*2.6)*.2,0,.5,"ffd871"));
  }
  function configureSea(info){sea=info;configure("sea",[]);}
  // 單元 Boss：放大的「海盜王」，外觀隨單元換服裝，周圍環繞火焰水晶
  function bossPreview(canvas,costume){
    const previous=window.travelOutfit,saved=vertices;
    window.travelOutfit={costume,hair:"25201e",skin:"d9a074",weapon:3,armor:3,boots:3};
    vertices=[];
    try{scaled(1.35,0,()=>person(0,0,.55,"7a2e3a","26262e",0,true));}finally{window.travelOutfit=previous;}
    for(let i=0;i<6;i++){const a=i*1.047;crystal(Math.cos(a)*1.9,.9+(i%3)*.5,Math.sin(a)*1.1,.14,i%2?"ff7a45":"ffb347");}
    paintModel(canvas,saved,canvas.width*.5,canvas.height*.9,canvas.height*.29);
  }
  function vehiclePreview(canvas,kind,angle,time=0){
    const saved=vertices;vertices=[];
    vehicle(kind,0,0,angle,time);
    paintModel(canvas,saved,canvas.width*.5,canvas.height*(kind==="jet"?.74:.7),kind==="jet"?34:kind==="kraken"?44:54);
  }
  function setPieces(name){
    switch(name){
      case "market":
        for(const [x,z,c] of [[-11,-7,"bf766a"],[-6,-7,"e7b95e"],[0,-8,"71aaa1"],[6,-7,"bf766a"],[11,-6,"b178ab"],[-12,4,"d7a657"],[11,7,"6e9d8b"]])stall(x,z,0,c);
        for(const [x,z] of [[-10,-3],[8,3],[-6,8]])crate(x,z,"bc9162");
        break;
      case "industry":
        damagedWorkshop(-11,-6);
        for(const [x,z,c] of [[-3,-9,"819ca5"],[7,-8,"7885a0"],[12,4,"a9826d"]]){
          box(x,.02,z,4.7,2.40,3.32,"d4c3a6");box(x,2.42,z,4.95,.32,3.48,c);
          for(const dx of [-1.3,0,1.3])box(x+dx,1.0,z+1.7,.75,.62,.11,"55727b");
          for(const dx of [-1.3,0,1.3]){
            box(x+dx,1.01,z+1.77,.065,.59,.05,"b2a79a");
            box(x+dx,.93,z+1.75,.90,.08,.21,"8b7e6b");
          }
          box(x,2.3,z,4.83,.1,3.4,"9b8d78");
          prism(x+1.68,2.72,z-.65,.35,1.86,"ac8778",7,.30);
          blockers.push({x,z,r:1.75});
        }
        for(let x=-12;x<12;x+=.65)box(x,.034,8,.18,.08,1.8,"977a66");
        for(const z of [7.42,8.58])box(0,.11,z,24,.08,.11,"5c6666");
        break;
      case "lab":
        for(const [x,z,c] of [[-10,-4,"92cad3"],[-4,-9,"92cad3"],[4,-8,"95b2ef"],[11,-3,"82c7b5"],[11,5,"a7b6f1"]])tower(x,z,c);
        for(const x of [-6,.5,7]){
          box(x,.04,4,.25,.72,.25,"465b76");
          at(x,0,4,0,()=>face([[-1.45,.75,1],[1.45,.75,1],[1.45,1.60,-1],[-1.45,1.60,-1]],"4b68a0"));
        }
        break;
      case "civic":
        pavilion(0,-8,"7c709f");pavilion(-11,-4,"657d85");pavilion(11,-2,"987984");
        for(const [x,z] of [[-9,4],[9,4],[-5,8],[5,8]]){tree(x,z,.96);box(x,.11,z+1.3,1.6,.28,.32,"a27c63");}
        break;
      case "culture":
        for(const [x,z,c] of [[-11,-6,"aa5659"],[-6,-8,"448e8b"],[-1,-7,"b47c6c"],[5,-8,"755f89"],[10,-6,"a96663"]])house(x,z,0,3.5,3.1,"f6dbaa",c,2.4);
        for(const [x,z,c] of [[-11,4,"d47d69"],[9,6,"7f8ba4"],[5,1,"d9ac67"]])stall(x,z,0,c);
        for(let x=-12;x<=12;x+=3){
          column(x,7,.95,"a17061");
          prism(x,1.3,7,.31,.40,"eaa772",7);
        }
        break;
      case "debate":
        pavilion(0,-10,"a382a8");
        points.filter(p=>p.corner).forEach((p,i)=>{
          prism(p.x,.046,p.z,1.95,.11,cornerColors[i],4);
          column(p.x-1.4,p.z-.7,.95,cornerColors[i]);
          column(p.x+1.4,p.z-.7,.95,cornerColors[i]);
        });
        for(const [x,z] of [[-13,-5],[13,-5],[-12,6],[12,6]])column(x,z,1.4,"efd6b7");
        break;
      case "trade":
        for(let i=0;i<18;i++)box(-15+i*.51,.02,4,.47,.19,3.4,i%2?"b2936e":"d2ac7c");
        for(const [x,z,c] of [[-12,.5,"bd745e"],[-9,-4,"4d91a0"],[-6,-7,"e1a96b"],[5,-9,"7d97a8"],[12,-3,"bd745e"],[11,5,"659893"]])crate(x,z,c);
        boat(-17,1,.3,"eedaae");boat(-18,6,-.55,"e1976c");boat(-11,10,-.7,"fff0c8");
        house(1,-9,0,4.9,3.4,"ebcaa0","5d8094");
        break;
      case "aid":
        for(const [x,z,c] of [[-11,-6,"5d9c9b"],[-3,-8,"748db8"],[6,-8,"de9e7d"],[12,4,"79a7a0"]]){
          stall(x,z,0,c);
          crate(x-1.75,z-.24,c);
          column(x+1.55,z,1.40,"d7e3c6");
        }
        for(const [x,z] of [[-8,7],[4,8],[10,-2]])lamp(x,z);
        break;
      case "nature":
        path([[-14,-7],[-7,-7],[-3,-4],[1,-3],[5,-1],[11,2],[16,4]],2.7,"6faeb8",.036);
        for(const [x,z,sz] of [[-12,-4,1.2],[-9,-8,1.1],[-4,-9,1.4],[3,-10,1.25],[8,-8,1.2],[11,-5,.9],[12,2,1],[-9,5,.8],[-6,8,.95],[8,8,1],[13,8,1.1]])tree(x,z,sz,"508966");
        for(let i=0;i<10;i++){
          const x=-5+i*.58,z=-1.2+i*.26;
          prism(x,.047,z,.11,.39,"84935a",4,.03);
        }
        for(const [x,z] of [[-9,-2],[9,3]]){box(x,.02,z,2.60,.20,1.9,"9d8063");lamp(x,z-.78);}
        break;
      case "action":
        for(const [x,z,c] of [[-11,-6,"b48569"],[-4,-9,"7f8f73"],[5,-8,"b98258"],[11,3,"988a68"]])stall(x,z,0,c);
        for(const [x,z,c] of [[-8,5,"76a587"],[-5,6,"a7a465"],[8,5,"6f9cae"]]){
          box(x,.03,z,.82,.72,.7,c);box(x,.76,z,.93,.14,.82,"e2cb9d");
        }
        for(const [x,z] of [[-9,-9],[9,-8],[-12,6],[12,7]])tree(x,z,.94,"77976c");
        break;
    }
  }
  function unitTerrain(){
    const layout=layouts[scene];
    face([[-240,-.42,-240],[240,-.42,-240],[240,-.42,240],[-240,-.42,240]],layout.sky);
    for(const [i,[x,z]] of land.entries()){
      const [a,b]=land[(i+1)%land.length];
      face([[x,0,z],[a,0,b],[a*1.035,-.74,b*1.035],[x*1.035,-.74,z*1.035]],layout.edge);
      face([[0,0,0],[x,0,z],[a,0,b]],layout.land,.94+i%3*.034);
    }
    const stations=points.filter(p=>!p.corner);
    path([[0,8.5],[0,2],...stations.map(p=>[p.x,p.z])],2.32,layout.path);
    prism(0,.04,6.5,2.25,.04,layout.path,8);
    prism(0,.04,7.95,.78,.26,layout.edge,8);
    prism(0,.30,7.95,.49,.11,layout.path,8);
    stations.forEach((p,i)=>{
      prism(p.x,.037,p.z,1.2,.045,layout.path,8);
      at(p.x-.85,0,p.z-.45,.05,()=>{
        box(0,0,0,.19,1.53,.19,layout.edge);
        box(0,.90,0,.96,.56,.14,layout.edge);
        box(0,1.04,.087,.75,.28,.045,"f6dfac");
      });
      if(i%2===0)lamp(p.x+.85,p.z+.45);
    });
    setPieces(scene);
    // Edge shrubs and paving mark the bounds while leaving the task routes clear.
    for(const [index,[x,z]] of land.entries()){
      const tint=index%2?"d6c687":"b5c38c";
      prism(x*.83,.027,z*.83,.46,.26,tint,6,.23);
      prism(x*.77+.5,.027,z*.79-.32,.24,.15,"e9d19b",5,.15);
    }
  }
  function configure(name,landmarks){
    scene=name;points=landmarks;land=layouts[name]?.shape??harborLand;
    const stage=document.querySelector("#stage");
    stage.style.background=name==="sea"?"linear-gradient(#bfe9ee,#4fa9b8)":layouts[name]?"radial-gradient(ellipse at 56% 22%, #eef0c7, #"+layouts[name].sky+" 42%, #366873)":"";
    blockers.length=0;vertices=[];
    if(name==="harbor")terrain();else if(name==="sea")seaTerrain();else unitTerrain();
    if(gpu){
      gpu.count=vertices.length/6;
      gl.bindBuffer(gl.ARRAY_BUFFER,gpu.staticBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    }else staticGeometry=new Float32Array(vertices.slice(36));
    vertices=[];cachedView="";
  }
  function inside(x,z){
    let contained=false;
    for(let i=0,j=land.length-1;i<land.length;j=i++){
      const [a,b]=land[i],[c,d]=land[j];
      if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a) contained=!contained;
    }
    return contained;
  }
  function walkable(x,z){
    return (inside(x,z)||(scene==="harbor"&&x>-18.8&&x<-14&&z>3.1&&z<4.9))&&blockers.every(p=>Math.hypot(x-p.x,z-p.z)>p.r);
  }
  function setup(){
    const program=gl.createProgram();
    const shaders=[
      [gl.VERTEX_SHADER,`attribute vec3 point;attribute vec3 color;varying vec3 tint;varying float height;uniform vec3 eye;uniform vec3 right;uniform vec3 up;uniform vec3 front;uniform vec2 scale;uniform vec2 offset;
        void main(){vec3 p=point-eye;float z=dot(p,front);gl_Position=vec4(dot(p,right)*scale.x+offset.x*z,dot(p,up)*scale.y+offset.y*z,1.0067*z-.8027,z);tint=color;height=point.y;}`],
      [gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 tint;varying float height;void main(){float lift=smoothstep(-.4,5.5,height);vec3 c=tint*(.93+.13*lift);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.12);c*=mix(vec3(.96,.99,1.04),vec3(1.05,1.0,.93),lift);gl_FragColor=vec4(min(c,vec3(1.)),1.0);}`]
    ];
    for(const [type,source] of shaders){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const attributes=["point","color"].map(name=>gl.getAttribLocation(program,name));
    const uniforms=Object.fromEntries(["eye","right","up","front","scale","offset"].map(name=>[name,gl.getUniformLocation(program,name)]));
    gl.enable(gl.DEPTH_TEST);
    const staticBuffer=gl.createBuffer(), dynamicBuffer=gl.createBuffer();

    function draw(buffer,size){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      attributes.forEach((location,i)=>{gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,i*12);});
      gl.drawArrays(gl.TRIANGLES,0,size);
    }
    return {staticBuffer,dynamicBuffer,uniforms,count:0,draw};
  }
  let gpu;
  try { if(gl)gpu=setup(); } catch(error) { console.error(error); }
  let software, staticGeometry;
  if(!gpu){
    if(gl){
      const replacement=canvas.cloneNode();
      canvas.replaceWith(replacement);
      canvas=replacement;
    }
    software=canvas.getContext("2d",{alpha:true});

  }
  const right=[.966,0,-.259],up=[-.170,.754,-.635],front=[-.195,-.656,-.729];
  let eye=[0,0,0], scale=[1,1], offset=[0,0], width=1,height=1;
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  function project(x,y,z){
    const p=[x-eye[0],y-eye[1],z-eye[2]],depth=dot(p,front);
    if(depth<=.4)return null;
    return [(dot(p,right)*scale[0]/depth+offset[0]+1)*width/2,(1-dot(p,up)*scale[1]/depth-offset[1])*height/2];
  }
  let cx=0,cz=0,cachedView="";
  let baseColor,baseDepth,frameImage,outputDepth;
  const littleEndian=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
  function rasterize(geometry,pixels,depths,w,h){
    for(let i=0;i<geometry.length;i+=18){
      const points=[];
      for(let j=i;j<i+18;j+=6){
        const p=[geometry[j]-eye[0],geometry[j+1]-eye[1],geometry[j+2]-eye[2]];
        const z=dot(p,front);
        if(z<=.4)break;
        points.push((dot(p,right)*scale[0]/z+offset[0]+1)*w/2,(1-dot(p,up)*scale[1]/z-offset[1])*h/2,1/z);
      }
      if(points.length!==9)continue;
      const [ax,ay,az,bx,by,bz,cx,cy,cz]=points;
      const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx)));
      const minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
      if(minX>maxX||minY>maxY)continue;
      const determinant=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      if(Math.abs(determinant)<.075)continue;
      const du=(by-cy)/determinant,dv=(cy-ay)/determinant,eu=(cx-bx)/determinant,ev=(ax-cx)/determinant;
      const r=Math.round(geometry[i+3]*255),g=Math.round(geometry[i+4]*255),b=Math.round(geometry[i+5]*255);
      const color=littleEndian?(255<<24)|(b<<16)|(g<<8)|r:(r<<24)|(g<<16)|(b<<8)|255;
      for(let y=minY;y<=maxY;y++){
        let u=du*(minX+.5-cx)+eu*(y+.5-cy);
        let v=dv*(minX+.5-cx)+ev*(y+.5-cy);
        let index=y*w+minX;
        for(let x=minX;x<=maxX;x++,index++,u+=du,v+=dv){
          if(u<-.00001||v<-.00001||u+v>1.00001)continue;
          const depth=cz+u*(az-cz)+v*(bz-cz);
          if(depth<=depths[index]+.000000003)continue;
          depths[index]=depth;pixels[index]=color;
        }
      }
    }
  }
  function drawSoftware(w,h){
    const dimensionsChanged=!frameImage||frameImage.width!==w||frameImage.height!==h;
    if(dimensionsChanged){
      frameImage=software.createImageData(w,h);
      baseColor=new Uint32Array(w*h);baseDepth=new Float32Array(w*h);outputDepth=new Float32Array(w*h);
    }
    const view=[eye[0].toFixed(3),eye[1].toFixed(3),eye[2].toFixed(3),...offset,w,h].join(",");
    if(dimensionsChanged||view!==cachedView){
      baseColor.fill(0);baseDepth.fill(0);
      rasterize(staticGeometry,baseColor,baseDepth,w,h);
      cachedView=view;
    }
    const output=new Uint32Array(frameImage.data.buffer);
    output.set(baseColor);outputDepth.set(baseDepth);
    rasterize(vertices,output,outputDepth,w,h);
    software.putImageData(frameImage,0,0);
  }
  function render(state,time,dt){
    clock=time;
    if(!gpu&&!software)return;
    width=canvas.clientWidth;height=canvas.clientHeight;
    if(!width||!height)return;
    const dpr=gpu?Math.min(devicePixelRatio,1.6):Math.min(1,960/width,610/height),w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const home=state.mode==="home", mobile=width<680;
    const overview=home||state.mode==="repair"||state.mode==="end";
    const seaMode=scene==="sea"&&!overview;
    const zoom=seaMode?(mobile?36:30):home?Math.max(40,45*height/width):overview?(mobile?50:41):mobile?29:24;
    const tx=seaMode?state.x:overview?0:state.x*.78,tz=seaMode?state.z:overview?1:state.z*.72;
    const follow=1-Math.exp(-8*dt);
    cx+=(tx-cx)*follow;cz+=(tz-cz)*follow;
    eye=[cx-front[0]*zoom,1-front[1]*zoom,cz-front[2]*zoom];
    scale=[2.2*height/width,2.2];
    offset=home?[.01,.10]:[0,-.02];
    if(gpu){
      gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      for(const [key,value] of Object.entries({eye,right,up,front,scale,offset})){
        if(value.length===3)gl.uniform3fv(gpu.uniforms[key],value);else gl.uniform2fv(gpu.uniforms[key],value);
      }
      gpu.draw(gpu.staticBuffer,gpu.count);
    }
    if(scene==="industry")chimneySmoke(time);
    for(const [index,p] of points.entries()){
      if(p.id==="sailor")person(p.x,p.z,.64,"388889","ecc581");
      if(p.id==="vendor")person(p.x,p.z,.09,"ce775b","a45662");
      if(scene!=="harbor"&&!p.corner)person(p.x,p.z,.22,["477990","b76268","64785b"][index%3],["ebc488","643f64","e5bc81"][index%3]);
      const active=state.active.includes(p.id),lit=state.repair>.35+index*.52&&!p.corner;
      if(active||lit){
        prism(p.x,.087,p.z,.65,.018,lit?"ffe6a0":"edd098",12);
        at(p.x,0,p.z,time*.9,()=>crystal(0,2.10+Math.sin(time*3)*.14,0,lit?.25:.15,lit?"fff4ac":"ffd871"));
      }
    }
    if(scene!=="sea")at(0,0,7.95,time*.45,()=>crystal(0,.98+Math.sin(time*2.6)*.11,0,state.repair>0?.36+state.repair*.12:.32,state.repair>0?"ffe996":"8fbfbb"));
    if(scene!=="sea"&&!stillAir.matches)for(let i=0;i<18;i++){
      const a=time*.16*(1+i%3*.35)+i*2.39,r=3+(i*1.73)%10;
      const fx=Math.cos(a)*r*1.15,fz=Math.sin(a)*r*.8+1,fy=.8+Math.sin(time*1.4+i*1.7)*.45+(i%4)*.38;
      at(fx,0,fz,time*.8+i,()=>crystal(0,fy,0,.05+.02*Math.sin(time*3+i),i%3?"fff0a8":"bff3e4"));
    }
    if(scene!=="sea"&&state.mode==="play"){
      for(const c of state.coins||[])if(!c.taken){
        prism(c.x,.04,c.z,.55,.02,"ffe9a6",10);
        at(c.x,0,c.z,time*2.2,()=>{const y=.8+Math.sin(time*3+c.i)*.12;tube(0,y,-.04,.04,.34,.34,"ffd24a",12);tube(0,y,.04,.06,.22,.22,"ffb92e",12);});
      }
      if(state.dash)for(let i=0;i<6;i++)prism(state.x-Math.sin(state.dir)*(.8+i*.45),.1+i*.06,state.z-Math.cos(state.dir)*(.8+i*.45),.2-i*.025,.02,"e8fbf8",6);
    }
    if(scene==="sea")seaDynamic(state,time);
    else if(!home)person(state.x,state.z,state.dir,"556ea2","333f65",state.phase,true);
    if(gpu){
      gl.bindBuffer(gl.ARRAY_BUFFER,gpu.dynamicBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
      gpu.draw(gpu.dynamicBuffer,vertices.length/6);
    }else drawSoftware(w,h);
    vertices=[];
  }
  configure("harbor",points);
  function preview(canvas,dir,costume){
    const saved=vertices, previous=window.travelOutfit, k=canvas.width/240;
    if(costume!==undefined)window.travelOutfit={...previous,costume};
    vertices=[];
    try{person(0,0,dir,"556ea2","333f65",0,true);}finally{window.travelOutfit=previous;}
    paintModel(canvas,saved,120*k,226*k,74*k);
  }
  function ferry(canvas,progress,aboard,tint,kind="sail"){
    const saved=vertices;
    vertices=[];
    const distance=progress*15, origin=-2-distance, destination=15-distance;
    function pier(x){
      box(x,-.05,.25,2.5,.20,.8,"ac784e");
      for(const offset of [-1.12,1.12])box(x+offset,-.5,.54,.12,.98,.12,"815d44");
    }
    pier(origin);pier(destination+2.2);
    for(const x of [origin-3,destination+4.4]){
      prism(x,-.75,-1.7,2.5,.85,"89aa76",9);
      for(let i=0;i<3;i++){
        const hx=x-1+i*.95,z=-1.9+(i%2)*.45;
        box(hx,.10,z,.8,.78,.75,"f1dba3");
        prism(hx,.88,z,.72,.59,tint,4,.04);
        box(hx,.1,z+.385,.2,.42,.03,"80553c");
      }
    }
    const special=aboard&&kind!=="sail";
    if(special)vehicle(kind,0,0,1.3,0);else boat(0,0,1.30,"fce7a8");
    if(!special)person(aboard?.68:-1.4,aboard?.18:.25,.42,"556ea2","333f65",0,true,aboard?.10:.15);
    paintModel(canvas,saved,canvas.width*.44,canvas.height*.68,55);
  }
  const paintCache={w:0,h:0,buf:null,z:null,tmp:null};
  function paintModel(canvas,saved,cx,cy,scale){
    const tri=vertices;vertices=saved;
    const SS=canvas.width<=320?3:2,w=canvas.width*SS,h=canvas.height*SS;
    if(paintCache.w!==w||paintCache.h!==h){
      paintCache.w=w;paintCache.h=h;paintCache.buf=new Uint32Array(w*h);paintCache.z=new Float32Array(w*h);
      paintCache.tmp=document.createElement("canvas");paintCache.tmp.width=w;paintCache.tmp.height=h;
    }
    const {buf,z:zbuf,tmp}=paintCache;
    buf.fill(0);zbuf.fill(-1e9);
    for(let i=0;i+17<tri.length;i+=18){
      const X=[],Y=[],Z=[];
      for(let j=0;j<3;j++){
        const o=i+j*6,x=tri[o],y=tri[o+1],zz=tri[o+2];
        X.push((cx+x*scale)*SS);Y.push((cy-y*scale+zz*scale*.265)*SS);Z.push(zz+y*.265);
      }
      const det=(Y[1]-Y[2])*(X[0]-X[2])+(X[2]-X[1])*(Y[0]-Y[2]);
      if(Math.abs(det)<1e-6)continue;
      const r=Math.round(tri[i+3]*255),g=Math.round(tri[i+4]*255),bl=Math.round(tri[i+5]*255);
      const color=littleEndian?((255<<24)|(bl<<16)|(g<<8)|r)>>>0:((r<<24)|(g<<16)|(bl<<8)|255)>>>0;
      const minX=Math.max(0,Math.floor(Math.min(X[0],X[1],X[2]))),maxX=Math.min(w-1,Math.ceil(Math.max(X[0],X[1],X[2])));
      const minY=Math.max(0,Math.floor(Math.min(Y[0],Y[1],Y[2]))),maxY=Math.min(h-1,Math.ceil(Math.max(Y[0],Y[1],Y[2])));
      for(let y=minY;y<=maxY;y++){
        const py=y+.5;
        for(let x=minX;x<=maxX;x++){
          const px=x+.5;
          const l0=((Y[1]-Y[2])*(px-X[2])+(X[2]-X[1])*(py-Y[2]))/det;
          const l1=((Y[2]-Y[0])*(px-X[2])+(X[0]-X[2])*(py-Y[2]))/det;
          const l2=1-l0-l1;
          if(l0<-1e-4||l1<-1e-4||l2<-1e-4)continue;
          const depth=l0*Z[0]+l1*Z[1]+l2*Z[2],index=y*w+x;
          if(depth>=zbuf[index]-1e-7){zbuf[index]=depth;buf[index]=color;}
        }
      }
    }
    tmp.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(buf.buffer.slice(0)),w,h),0,0);
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    ctx.drawImage(tmp,0,0,canvas.width,canvas.height);
  }
  window.World={ferry,preview,configureSea,vehiclePreview,bossPreview,render,project,walkable,spawn,configure,available:Boolean(gpu||software)};
})();
