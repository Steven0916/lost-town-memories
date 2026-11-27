// 金幣、載具、服裝、裝備與能力值。所有數值集中在這裡，方便調整。
// 新增載具：加到 VEHICLES，並在 world.js 的 vehicle() 補 3D 模型。
// 新增服裝：加到 COSTUMES，並在 world.js 的 costumePalette / costumeHead / costumeBody 補外觀。
// 新增裝備：加到 GEAR（slot 為 weapon / armor / boots，tier 1~3 對應 world.js 的外觀顏色）。
(() => {
  const KEY = "lost-town-memories-wallet-v1";
  const VEHICLES = [
    { id: "sail", name: "帆船", icon: "⛵", price: 0, speed: 8.5, tolerance: 2, immune: false, guard: 1,
      perk: "穩定好駕駛。偏離航線 2 秒，海盜就會來襲。", stats: [3, 3] },
    { id: "jet", name: "戰鬥機", icon: "✈️", price: 150, speed: 15, tolerance: 3.4, immune: false, guard: 1,
      perk: "速度快將近兩倍，偏離航線也有更多時間修正。", stats: [5, 4] },
    { id: "kraken", name: "海怪", icon: "🐙", price: 300, speed: 11, tolerance: Infinity, immune: true, guard: .5,
      perk: "偏離航線不會引來海盜；遇到巡邏海盜時，受到的傷害減半。", stats: [4, 5] },
  ];
  const COSTUMES = [
    { id: "base", name: "巡旅者", icon: "🧭", price: 0, skill: { id: "curious", name: "好奇心", type: "被動",
      desc: "撿閃光金幣和海上金幣的範圍變大 50%。" } },
    { id: "wind", name: "風行者", icon: "🌪️", price: 100, skill: { id: "dash", name: "疾風步", type: "主動",
      desc: "按 Q 或技能鈕，3 秒內移動速度 ×1.9 且不耗體力，冷卻 10 秒。" } },
    { id: "star", name: "星術師", icon: "🔮", price: 120, skill: { id: "star", name: "星象提示", type: "主動",
      desc: "答題或與海盜對戰時，可用「星象提示」免費看提示或排除一個錯誤選項。每關 2 次。" } },
    { id: "pirate", name: "海盜船長", icon: "🏴‍☠️", price: 180, skill: { id: "captain", name: "無畏航行", type: "被動",
      desc: "開船偏離航線的容忍時間 ×2，海上金幣會被自動吸過來。" } },
    { id: "gold", name: "黃金商人", icon: "💰", price: 200, skill: { id: "fortune", name: "財運亨通", type: "被動",
      desc: "所有金幣收入 +25%。" } },
    { id: "scholar", name: "小博士", icon: "🎓", price: 220, skill: { id: "retry", name: "再試一次", type: "被動",
      desc: "每關第一次答錯不計入答錯次數；與海盜對戰時，第一次答錯不會受傷。" } },
    { id: "knight", name: "守護騎士", icon: "🛡️", price: 320, skill: { id: "shield", name: "守護光盾", type: "被動",
      desc: "每次航行可擋下一次海盜砲擊。" } },
  ];
  // 裝備：price 為 0 代表只能擊敗海盜取得
  const SLOTS = {
    weapon: { name: "武器", stat: "atk", label: "攻擊力", icon: "⚔️" },
    armor: { name: "護甲", stat: "hp", label: "血量", icon: "🛡️" },
    boots: { name: "靴子", stat: "sta", label: "體力", icon: "👢" },
  };
  const TIERS = ["", "普通", "稀有", "傳說"];
  const GEAR = [
    { id: "sword1", slot: "weapon", tier: 1, name: "木劍", icon: "🗡️", value: 5, price: 60 },
    { id: "sword2", slot: "weapon", tier: 2, name: "鋼彎刀", icon: "⚔️", value: 10, price: 200 },
    { id: "sword3", slot: "weapon", tier: 3, name: "星辰長劍", icon: "✨", value: 18, price: 0 },
    { id: "armor1", slot: "armor", tier: 1, name: "皮甲", icon: "🥋", value: 20, price: 60 },
    { id: "armor2", slot: "armor", tier: 2, name: "鎖子甲", icon: "🛡️", value: 40, price: 200 },
    { id: "armor3", slot: "armor", tier: 3, name: "龍鱗甲", icon: "🐉", value: 70, price: 0 },
    { id: "boots1", slot: "boots", tier: 1, name: "水手靴", icon: "👞", value: 20, price: 60 },
    { id: "boots2", slot: "boots", tier: 2, name: "疾風靴", icon: "👟", value: 40, price: 200 },
    { id: "boots3", slot: "boots", tier: 3, name: "雲步靴", icon: "☁️", value: 70, price: 0 },
  ];
  const BASE = { hp: 100, sta: 100, atk: 10 };
  // 每關各項獎勵（每項只領一次）＋戰鬥獎勵
  const REWARD = { gem: 10, finish: 20, perfect: 15, scene: 3, sea: 2, chest: 6, dailyBase: 5, dailyStep: 2, dailyMax: 7,
    battleHit: 2, battleWin: 12 };
  const PIRATE = { hp: 30, damage: 20 };

  const fresh = () => ({
    coins: 0, owned: ["sail"], selected: "sail", earned: {},
    costumes: { owned: ["base"], equipped: "base" }, daily: { last: "", streak: 0 },
    gear: { owned: [], equipped: { weapon: "", armor: "", boots: "" } }, wins: 0,
  });
  const flags = (arr, n) => Array.from({ length: n }, (_, i) => arr?.[i] === true);
  function sanitize(raw) {
    const w = fresh();
    if (!raw || typeof raw !== "object") return w;
    w.coins = Math.max(0, Math.min(99999, Number(raw.coins) | 0));
    w.owned = [...new Set(["sail", ...(Array.isArray(raw.owned) ? raw.owned : [])])].filter((id) => VEHICLES.some((v) => v.id === id));
    w.selected = w.owned.includes(raw.selected) ? raw.selected : "sail";
    if (raw.earned && typeof raw.earned === "object") {
      for (const [id, e] of Object.entries(raw.earned).slice(0, 30)) {
        w.earned[id] = { g: flags(e?.g, 3), f: e?.f === true, p: e?.p === true, c: flags(e?.c, 3), s: flags(e?.s, 8) };
      }
    }
    const co = raw.costumes?.owned;
    w.costumes.owned = [...new Set(["base", ...(Array.isArray(co) ? co : [])])].filter((id) => COSTUMES.some((c) => c.id === id));
    w.costumes.equipped = w.costumes.owned.includes(raw.costumes?.equipped) ? raw.costumes.equipped : "base";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw.daily?.last ?? "")) w.daily = { last: raw.daily.last, streak: Math.max(0, Math.min(999, Number(raw.daily.streak) | 0)) };
    const go = raw.gear?.owned;
    w.gear.owned = [...new Set(Array.isArray(go) ? go : [])].filter((id) => GEAR.some((g) => g.id === id));
    for (const slot of Object.keys(SLOTS)) {
      const id = raw.gear?.equipped?.[slot];
      w.gear.equipped[slot] = w.gear.owned.includes(id) && GEAR.find((g) => g.id === id)?.slot === slot ? id : "";
    }
    w.wins = Math.max(0, Math.min(99999, Number(raw.wins) | 0));
    return w;
  }
  let wallet;
  try { wallet = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { wallet = fresh(); }

  const findV = (id) => VEHICLES.find((v) => v.id === id);
  const findC = (id) => COSTUMES.find((c) => c.id === id);
  const findG = (id) => GEAR.find((g) => g.id === id);
  const skillId = () => findC(wallet.costumes.equipped)?.skill.id ?? "curious";

  function stats() {
    const bonus = { hp: 0, sta: 0, atk: 0 };
    for (const id of Object.values(wallet.gear.equipped)) {
      const g = findG(id);
      if (g) bonus[SLOTS[g.slot].stat] += g.value;
    }
    return { hp: BASE.hp + bonus.hp, sta: BASE.sta + bonus.sta, atk: BASE.atk + bonus.atk, bonus };
  }
  function applyOutfit() {
    const o = window.travelOutfit;
    if (!o) return;
    o.costume = wallet.costumes.equipped;
    for (const slot of Object.keys(SLOTS)) o[slot] = findG(wallet.gear.equipped[slot])?.tier ?? 0;
  }
  function commit(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(wallet)); } catch {}
    const count = document.querySelector("#coin-count");
    if (count) count.textContent = wallet.coins;
    applyOutfit();
    window.dispatchEvent(new CustomEvent("ltm:wallet", { detail: wallet }));
    if (!silent) window.dispatchEvent(new CustomEvent("ltm:save", { detail: { id: "wallet", completed: false } }));
  }
  const entry = (id) => (wallet.earned[id] ??= { g: [false, false, false], f: false, p: false, c: [false, false, false], s: Array(8).fill(false) });
  // 套用服裝技能「財運亨通」並入帳；回傳實際入帳金額
  function grant(base) {
    const amount = skillId() === "fortune" ? Math.round(base * 1.25) : base;
    wallet.coins = Math.min(99999, wallet.coins + amount);
    return amount;
  }
  const today = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function once(unitId, key, index, base) {
    const e = entry(unitId);
    const list = e[key];
    if (Array.isArray(list)) { if (list[index]) return 0; list[index] = true; }
    else { if (e[key]) return 0; e[key] = true; }
    const gained = grant(base);
    commit();
    return gained;
  }

  window.Fleet = {
    vehicles: VEHICLES, costumes: COSTUMES, reward: REWARD, pirate: PIRATE,
    gear: { list: GEAR, slots: SLOTS, tiers: TIERS, base: BASE },
    get: () => wallet,
    current: () => findV(wallet.selected) ?? VEHICLES[0],
    owns: (id) => wallet.owned.includes(id),
    canAfford: (id) => wallet.coins >= (findV(id)?.price ?? Infinity),
    costume: () => findC(wallet.costumes.equipped) ?? COSTUMES[0],
    skillId,
    ownsCostume: (id) => wallet.costumes.owned.includes(id),
    stats,
    // ---- 賺金幣 ----
    gem: (unit, i) => once(unit, "g", i, REWARD.gem),
    finish: (unit) => once(unit, "f", 0, REWARD.finish),
    perfect: (unit) => once(unit, "p", 0, REWARD.perfect),
    scene: (unit, i) => once(unit, "c", i, REWARD.scene),
    sea: (unit, i, chest) => once(unit, "s", i, chest ? REWARD.chest : REWARD.sea),
    collected: (unit, key) => entry(unit)[key].slice(),
    addCoins(base) { const n = grant(base); commit(); return n; },
    daily() {
      const now = today();
      if (wallet.daily.last === now) return null;
      const yesterday = today(new Date(Date.now() - 864e5));
      const streak = wallet.daily.last === yesterday ? wallet.daily.streak + 1 : 1;
      const coins = grant(REWARD.dailyBase + REWARD.dailyStep * (Math.min(streak, REWARD.dailyMax) - 1));
      wallet.daily = { last: now, streak };
      commit();
      return { streak, coins };
    },
    // ---- 戰鬥戰利品：第一次勝利必得普通裝備，之後 50% 掉落（稀有 27%、傳說 8%）----
    recordWin() { wallet.wins += 1; commit(); },
    rollLoot() {
      const first = wallet.wins <= 1;
      if (!first && Math.random() > .5) return null;
      const roll = Math.random();
      const tier = first ? 1 : roll < .08 ? 3 : roll < .35 ? 2 : 1;
      const slot = Object.keys(SLOTS)[Math.floor(Math.random() * 3)];
      const item = GEAR.find((g) => g.slot === slot && g.tier === tier);
      if (wallet.gear.owned.includes(item.id)) return { item, duplicate: true };
      wallet.gear.owned.push(item.id);
      if (!wallet.gear.equipped[slot]) wallet.gear.equipped[slot] = item.id;
      commit();
      return { item, duplicate: false };
    },
    // ---- 花金幣 ----
    buy(id) {
      const v = findV(id);
      if (!v || wallet.owned.includes(id) || wallet.coins < v.price) return false;
      wallet.coins -= v.price; wallet.owned.push(id); wallet.selected = id; commit(); return true;
    },
    select(id) { if (!wallet.owned.includes(id)) return false; wallet.selected = id; commit(); return true; },
    buyCostume(id) {
      const c = findC(id);
      if (!c || wallet.costumes.owned.includes(id) || wallet.coins < c.price) return false;
      wallet.coins -= c.price; wallet.costumes.owned.push(id); wallet.costumes.equipped = id; commit(); return true;
    },
    equip(id) { if (!wallet.costumes.owned.includes(id)) return false; wallet.costumes.equipped = id; commit(); return true; },
    ownsGear: (id) => wallet.gear.owned.includes(id),
    buyGear(id) {
      const g = findG(id);
      if (!g || !g.price || wallet.gear.owned.includes(id) || wallet.coins < g.price) return false;
      wallet.coins -= g.price; wallet.gear.owned.push(id); wallet.gear.equipped[g.slot] = id; commit(); return true;
    },
    equipGear(id) {
      const g = findG(id);
      if (!g || !wallet.gear.owned.includes(id)) return false;
      wallet.gear.equipped[g.slot] = id; commit(); return true;
    },
    unequipGear(slot) { if (!SLOTS[slot]) return false; wallet.gear.equipped[slot] = ""; commit(); return true; },
    replace(raw) { wallet = sanitize(raw); commit(true); },
  };
  commit(true);
  window.addEventListener("load", applyOutfit);
})();
