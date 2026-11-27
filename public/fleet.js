// 金幣與載具：通關賺金幣，到船塢購買載具。想新增載具，只要在 VEHICLES 加一筆（並在 world.js 的 vehicle() 加模型）。
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
  const REWARD = { gem: 10, finish: 20 };   // 每枚碎片、通關獎勵（每關每項只領一次）

  const fresh = () => ({ coins: 0, owned: ["sail"], selected: "sail", earned: {} });
  function sanitize(raw) {
    const w = fresh();
    if (!raw || typeof raw !== "object") return w;
    w.coins = Math.max(0, Math.min(99999, Number(raw.coins) | 0));
    w.owned = [...new Set(["sail", ...(Array.isArray(raw.owned) ? raw.owned : [])])].filter((id) => VEHICLES.some((v) => v.id === id));
    w.selected = w.owned.includes(raw.selected) ? raw.selected : "sail";
    if (raw.earned && typeof raw.earned === "object") {
      for (const [id, e] of Object.entries(raw.earned).slice(0, 30)) {
        w.earned[id] = { g: [0, 1, 2].map((i) => e?.g?.[i] === true), f: e?.f === true };
      }
    }
    return w;
  }
  let wallet;
  try { wallet = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { wallet = fresh(); }

  function commit(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(wallet)); } catch {}
    const count = document.querySelector("#coin-count");
    if (count) count.textContent = wallet.coins;
    window.dispatchEvent(new CustomEvent("ltm:wallet", { detail: wallet }));
    if (!silent) window.dispatchEvent(new CustomEvent("ltm:save", { detail: { id: "wallet", completed: false } }));
  }
  const entry = (id) => (wallet.earned[id] ??= { g: [false, false, false], f: false });
  const find = (id) => VEHICLES.find((v) => v.id === id);

  window.Fleet = {
    vehicles: VEHICLES,
    reward: REWARD,
    get: () => wallet,
    current: () => find(wallet.selected) ?? VEHICLES[0],
    owns: (id) => wallet.owned.includes(id),
    canAfford: (id) => wallet.coins >= (find(id)?.price ?? Infinity),
    gem(unitId, index) {
      const e = entry(unitId);
      if (e.g[index]) return 0;
      e.g[index] = true; wallet.coins += REWARD.gem; commit(); return REWARD.gem;
    },
    finish(unitId) {
      const e = entry(unitId);
      if (e.f) return 0;
      e.f = true; wallet.coins += REWARD.finish; commit(); return REWARD.finish;
    },
    buy(id) {
      const v = find(id);
      if (!v || wallet.owned.includes(id) || wallet.coins < v.price) return false;
      wallet.coins -= v.price; wallet.owned.push(id); wallet.selected = id; commit(); return true;
    },
    select(id) {
      if (!wallet.owned.includes(id)) return false;
      wallet.selected = id; commit(); return true;
    },
    // 雲端還原用
    replace(raw) { wallet = sanitize(raw); commit(true); },
  };
  commit(true);
})();
