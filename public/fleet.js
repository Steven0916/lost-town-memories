// 金幣、載具、服裝與技能。所有數值集中在這裡，方便調整。
// 新增載具：加到 VEHICLES，並在 world.js 的 vehicle() 補 3D 模型。
// 新增服裝：加到 COSTUMES，並在 world.js 的 costumePalette / costumeHead / costumeBody 補外觀，
// 技能效果在 game.js 以 Fleet.skillId() 判斷。
(() => {
  const KEY = "lost-town-memories-wallet-v1";
  const VEHICLES = [
    { id: "sail", name: "帆船", icon: "⛵", price: 0, speed: 8.5, tolerance: 2, immune: false,
      perk: "穩定好駕駛。偏離航線 2 秒，海盜就會開砲。", stats: [3, 3] },
    { id: "jet", name: "戰鬥機", icon: "✈️", price: 150, speed: 15, tolerance: 3.4, immune: false,
      perk: "速度快將近兩倍，偏離航線也有更多時間修正。", stats: [5, 4] },
    { id: "kraken", name: "海怪", icon: "🐙", price: 300, speed: 11, tolerance: Infinity, immune: true,
      perk: "海盜看到海怪嚇得不敢開砲，可以安心探險。", stats: [4, 5] },
  ];
  const COSTUMES = [
    { id: "base", name: "巡旅者", icon: "🧭", price: 0, skill: { id: "curious", name: "好奇心", type: "被動",
      desc: "撿閃光金幣和海上金幣的範圍變大 50%。" } },
    { id: "wind", name: "風行者", icon: "🌪️", price: 100, skill: { id: "dash", name: "疾風步", type: "主動",
      desc: "按 Shift 或技能鈕，3 秒內移動速度 ×1.9，冷卻 10 秒。" } },
    { id: "star", name: "星術師", icon: "🔮", price: 120, skill: { id: "star", name: "星象提示", type: "主動",
      desc: "答題時可點「星象提示」免費看一則提示，不算答錯。每關 2 次。" } },
    { id: "pirate", name: "海盜船長", icon: "🏴‍☠️", price: 180, skill: { id: "captain", name: "無畏航行", type: "被動",
      desc: "開船偏離航線的容忍時間 ×2，海上金幣會被自動吸過來。" } },
    { id: "gold", name: "黃金商人", icon: "💰", price: 200, skill: { id: "fortune", name: "財運亨通", type: "被動",
      desc: "所有金幣收入 +25%。" } },
    { id: "scholar", name: "小博士", icon: "🎓", price: 220, skill: { id: "retry", name: "再試一次", type: "被動",
      desc: "每關第一次答錯不計入答錯次數，一次過獎勵還有機會。" } },
    { id: "knight", name: "守護騎士", icon: "🛡️", price: 320, skill: { id: "shield", name: "守護光盾", type: "被動",
      desc: "每次航行可擋下一次海盜砲擊。" } },
  ];
  // 每關各項獎勵（每項只領一次）
  const REWARD = { gem: 10, finish: 20, perfect: 15, scene: 3, sea: 2, chest: 6, dailyBase: 5, dailyStep: 2, dailyMax: 7 };

  const fresh = () => ({
    coins: 0, owned: ["sail"], selected: "sail", earned: {},
    costumes: { owned: ["base"], equipped: "base" }, daily: { last: "", streak: 0 },
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
    return w;
  }
  let wallet;
  try { wallet = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { wallet = fresh(); }

  const findV = (id) => VEHICLES.find((v) => v.id === id);
  const findC = (id) => COSTUMES.find((c) => c.id === id);
  const skillId = () => findC(wallet.costumes.equipped)?.skill.id ?? "curious";

  function applyOutfit() {
    if (window.travelOutfit) window.travelOutfit.costume = wallet.costumes.equipped;
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
    vehicles: VEHICLES, costumes: COSTUMES, reward: REWARD,
    get: () => wallet,
    current: () => findV(wallet.selected) ?? VEHICLES[0],
    owns: (id) => wallet.owned.includes(id),
    canAfford: (id) => wallet.coins >= (findV(id)?.price ?? Infinity),
    costume: () => findC(wallet.costumes.equipped) ?? COSTUMES[0],
    skillId,
    ownsCostume: (id) => wallet.costumes.owned.includes(id),
    // ---- 賺金幣 ----
    gem: (unit, i) => once(unit, "g", i, REWARD.gem),
    finish: (unit) => once(unit, "f", 0, REWARD.finish),
    perfect: (unit) => once(unit, "p", 0, REWARD.perfect),
    scene: (unit, i) => once(unit, "c", i, REWARD.scene),
    sea: (unit, i, chest) => once(unit, "s", i, chest ? REWARD.chest : REWARD.sea),
    collected: (unit, key) => entry(unit)[key].slice(),
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
    replace(raw) { wallet = sanitize(raw); commit(true); },
  };
  commit(true);
  window.addEventListener("load", applyOutfit);
})();
