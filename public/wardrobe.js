(() => {
  const slots = [
    ["hat","帽子",[["brim","巡旅帽"],["hood","星術尖帽"],["bare","不戴帽子"]]],
    ["coat","上衣",[["556ea2","靛藍旅行衫"],["367b67","森林金領外套"],["a74f55","莓紅長袍"]]],
    ["pants","褲子",[["45494f","炭灰長褲"],["836746","卡其長褲"],["374e79","深藍長褲"]]],
    ["shoes","鞋子",[["5f4738","棕色皮鞋"],["e4dbc4","米白步鞋"],["903f44","磚紅便鞋"]]],
    ["gear","裝備",[["pack","探險背包"],["lamp","手提燈"],["none","卸下裝備"]]]
  ];
  const wardrobe=document.querySelector("#wardrobe"), canvas=document.querySelector("#model");
  let angle=.4, saved={};
  try{saved=JSON.parse(localStorage.getItem("town-travel-outfit")) || {};}catch{}
  const outfit=window.travelOutfit={};
  for(const [key,title,items] of slots){
    const label=document.createElement("label"), select=document.createElement("select");
    label.textContent=title;
    for(const [value,name] of items)select.add(new Option(name,value));
    if(items.some(([value])=>value===saved[key]))select.value=saved[key];
    outfit[key]=select.value;
    select.onchange=()=>{
      outfit[key]=select.value;
      try{localStorage.setItem("town-travel-outfit",JSON.stringify(outfit));}catch{}
      World.preview(canvas,angle);
    };
    label.append(select);document.querySelector("#clothes").append(label);
  }
  document.querySelector("#dress").onclick=()=>{wardrobe.showModal();World.preview(canvas,angle);};
  document.querySelector("#rotate").onclick=()=>{angle+=Math.PI/2;World.preview(canvas,angle);};
})();
