// 服飾商店目錄：每一類有哪些款式、多少金幣。price 為 0 代表一開始就有。
// 新增款式：在對應類別加一筆，並到 world.js 補上外觀（帽子在 hatModel、上衣細節在 coatDetail、
// 臉部／頸部／背飾／手持在 accessories、寵物在 petModel）。顏色類（上衣、褲子、鞋子）id 就是色碼。
window.CATALOG = (() => {
  const color = (id, name, price) => ({ id, name, price, color: id });
  return {
    hat: { name: "帽子", icon: "🎩", items: [
      { id: "brim", name: "巡旅帽", price: 0, icon: "🧢" },
      { id: "hood", name: "星術尖帽", price: 0, icon: "🧙" },
      { id: "bare", name: "不戴帽子", price: 0, icon: "💇" },
      { id: "straw", name: "草帽", price: 30, icon: "👒" },
      { id: "beanie", name: "毛線帽", price: 30, icon: "🧶" },
      { id: "beret", name: "貝雷帽", price: 35, icon: "🎨" },
      { id: "chef", name: "廚師帽", price: 40, icon: "👨‍🍳" },
      { id: "party", name: "派對帽", price: 45, icon: "🎉" },
      { id: "flower", name: "花冠", price: 60, icon: "🌸" },
      { id: "cat", name: "貓耳", price: 70, icon: "🐱" },
      { id: "bunny", name: "兔耳", price: 70, icon: "🐰" },
      { id: "crown", name: "皇冠", price: 120, icon: "👑" },
      { id: "halo", name: "天使光環", price: 150, icon: "😇" },
    ] },
    coat: { name: "上衣", icon: "👕", items: [
      color("556ea2", "靛藍旅行衫", 0), color("367b67", "森林金領外套", 0), color("a74f55", "莓紅長袍", 0),
      color("f0a6b8", "櫻花粉外套", 40), color("6fb8e8", "天空藍背心", 40), color("f2c14e", "太陽黃雨衣", 45),
      color("f4f1e6", "海軍條紋衫", 50), color("9a82d6", "薰衣草長袍", 55), color("4f7a4f", "森林長袍", 55),
      color("f4f4f0", "白色實驗袍", 60), color("2b2b36", "黑色禮服", 80),
    ] },
    pants: { name: "褲子", icon: "👖", items: [
      color("45494f", "炭灰長褲", 0), color("836746", "卡其長褲", 0), color("374e79", "深藍長褲", 0),
      color("4f7bb8", "牛仔藍", 20), color("e8dcc0", "米白長褲", 20), color("6b8f4f", "草綠長褲", 25),
      color("6a4c93", "紫羅蘭", 25), color("b23a48", "莓紅長褲", 25), color("1e1e22", "墨黑長褲", 25),
    ] },
    shoes: { name: "鞋子", icon: "👟", items: [
      color("5f4738", "棕色皮鞋", 0), color("e4dbc4", "米白步鞋", 0), color("903f44", "磚紅便鞋", 0),
      color("d9534f", "紅運動鞋", 20), color("f2c14e", "黃雨靴", 25), color("e8a0b8", "粉紅鞋", 25),
      color("4f7bb8", "藍球鞋", 25), color("1e1e22", "黑皮鞋", 30), color("d9b54a", "金色長靴", 80),
    ] },
    hair: { name: "髮色", icon: "💇", items: [
      color("503b35", "栗棕", 0), color("25201e", "墨黑", 0), color("d9a94e", "金黃", 0),
      color("a8472f", "赭紅", 0), color("cfd3d8", "銀白", 0), color("3f6fb0", "海藍", 0),
    ] },
    skin: { name: "膚色", icon: "🧑", items: [
      color("f4cfa7", "淺膚", 0), color("efbf92", "自然", 0), color("d9a074", "小麥", 0), color("a8714a", "深膚", 0),
    ] },
    face: { name: "臉部", icon: "👓", items: [
      { id: "none", name: "無", price: 0, icon: "🙂" },
      { id: "glasses", name: "圓框眼鏡", price: 25, icon: "👓" },
      { id: "shades", name: "墨鏡", price: 35, icon: "🕶️" },
      { id: "mask", name: "口罩", price: 20, icon: "😷" },
      { id: "clown", name: "小丑鼻", price: 30, icon: "🤡" },
    ] },
    neck: { name: "頸部", icon: "🧣", items: [
      { id: "none", name: "無", price: 0, icon: "🙂" },
      { id: "scarf", name: "紅圍巾", price: 25, icon: "🧣" },
      { id: "bow", name: "蝴蝶結", price: 25, icon: "🎀" },
      { id: "tie", name: "領帶", price: 25, icon: "👔" },
      { id: "medal", name: "金牌", price: 60, icon: "🥇" },
    ] },
    back: { name: "背飾", icon: "🦋", items: [
      { id: "none", name: "無", price: 0, icon: "🙂" },
      { id: "cape", name: "紅披風", price: 70, icon: "🦸" },
      { id: "butterfly", name: "蝴蝶翅膀", price: 100, icon: "🦋" },
      { id: "devil", name: "小惡魔翅膀", price: 110, icon: "😈" },
      { id: "angel", name: "天使翅膀", price: 130, icon: "🪽" },
    ] },
    gear: { name: "手持道具", icon: "🎒", items: [
      { id: "pack", name: "探險背包", price: 0, icon: "🎒" },
      { id: "lamp", name: "手提燈", price: 0, icon: "🏮" },
      { id: "none", name: "卸下裝備", price: 0, icon: "✋" },
      { id: "balloon", name: "氣球", price: 35, icon: "🎈" },
      { id: "umbrella", name: "雨傘", price: 40, icon: "☂️" },
      { id: "flag", name: "旗幟", price: 40, icon: "🚩" },
      { id: "telescope", name: "望遠鏡", price: 55, icon: "🔭" },
      { id: "wand", name: "魔杖", price: 70, icon: "🪄" },
    ] },
    pet: { name: "寵物", icon: "🐾", items: [
      { id: "none", name: "沒有寵物", price: 0, icon: "🙂" },
      { id: "slime", name: "史萊姆", price: 100, icon: "🟢" },
      { id: "cat", name: "小貓", price: 120, icon: "🐱" },
      { id: "bird", name: "小藍鳥", price: 120, icon: "🐦" },
      { id: "dragon", name: "迷你龍", price: 200, icon: "🐲" },
    ] },
  };
})();
