// 衣櫃裡的「冒險裝備與能力值」：購買、裝備、強化、合成、分解。
// 武器加攻擊力、護甲加血量、靴子加體力；強化每級 +20%，最高 Lv5。
(() => {
  const list = document.querySelector("#gear-list");
  const wardrobe = document.querySelector("#wardrobe");
  const main = document.querySelector("#model");
  if (!list || !window.Fleet) return;

  const el = (tag, props = {}, ...kids) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids.filter((k) => k != null));
    return node;
  };
  const fx = (name) => window.dispatchEvent(new CustomEvent("ltm:fx", { detail: name }));
  const { slots, list: items, tiers } = Fleet.gear;
  const MAX = { hp: 320, sta: 320, atk: 50 };
  const named = (id) => items.find((g) => g.id === id);

  function statRow(icon, label, key, stats) {
    const total = stats[key], bonus = stats.bonus[key];
    return el("div", { className: "stat-row" },
      el("span", {}, icon + " " + label),
      el("div", { className: "stat-bar" }, el("i", { style: "width:" + Math.min(100, total / MAX[key] * 100) + "%" })),
      el("b", {}, total + (bonus ? "（+" + bonus + "）" : "")));
  }

  function render(message = "") {
    const stats = Fleet.stats(), wallet = Fleet.get();
    const refresh = (text) => { World.preview(main, .4); render(text); };
    const small = (label, handler, { disabled = false, title = "", className = "mini" } = {}) => {
      const b = el("button", { type: "button", className, title, disabled }, label);
      if (!disabled) b.addEventListener("click", handler);
      return b;
    };

    const groups = Object.entries(slots).map(([slot, info]) => {
      const cards = items.filter((g) => g.slot === slot).map((g) => {
        const owned = Fleet.ownsGear(g.id), on = wallet.gear.equipped[slot] === g.id;
        const lv = Fleet.levelOf(g.id), value = Fleet.gearValue(g);
        const buttons = [];

        // 主要按鈕：裝備／卸下／購買
        if (on) buttons.push(small("卸下", () => { Fleet.unequipGear(slot); fx("tap"); refresh(); }, { className: "quiet-light" }));
        else if (owned) buttons.push(small("裝備", () => { Fleet.equipGear(g.id); fx("tap"); refresh(); }, { className: "quiet-light" }));
        else if (g.price) buttons.push(small("🪙 " + g.price + " 購買", () => {
          if (Fleet.buyGear(g.id)) { fx("gem"); refresh("已買下「" + g.name + "」並裝備！"); }
          else refresh("還差 " + (g.price - wallet.coins) + " 金幣。");
        }, { className: wallet.coins >= g.price ? "primary" : "quiet" }));

        // 合成：用較低一階的同部位裝備＋碎片＋金幣
        const craft = !owned && Fleet.craftInfo(g.id);
        if (craft) {
          const have = Fleet.ownsGear(craft.lower.id);
          const ready = have && wallet.coins >= craft.cost.coins && wallet.shards >= craft.cost.shards;
          buttons.push(small("合成 🧩" + craft.cost.shards + " 🪙" + craft.cost.coins, () => {
            if (Fleet.craft(g.id)) { fx("win"); refresh("合成成功！「" + craft.lower.name + "」升級成「" + g.name + "」。"); }
          }, { disabled: !ready, title: "消耗「" + craft.lower.name + "」＋碎片＋金幣" + (have ? "" : "（你還沒有「" + craft.lower.name + "」）"),
            className: ready ? "primary" : "quiet" }));
          if (!have) buttons.push(el("p", { className: "gear-note" }, "需要「" + craft.lower.name + "」"));
        }
        if (!owned && !g.price && !craft) buttons.push(small("擊敗海盜取得", () => {}, { disabled: true, className: "quiet" }));
        if (!owned && !g.price && craft) buttons.push(el("p", { className: "gear-note" }, "或擊敗 Boss 取得"));

        // 已擁有：強化／分解
        if (owned) {
          const cost = Fleet.upgradeCost(g.id);
          if (cost) {
            const ok = wallet.coins >= cost.coins && wallet.shards >= cost.shards;
            buttons.push(small("強化 🪙" + cost.coins + " 🧩" + cost.shards, () => {
              if (Fleet.upgrade(g.id)) { fx("gem"); refresh("「" + g.name + "」強化到 Lv" + (lv + 1) + "！"); }
            }, { disabled: !ok, className: ok ? "primary" : "quiet", title: "強化後數值 +20%" }));
          } else buttons.push(el("p", { className: "gear-note" }, "已滿級 ✨"));
          if (!on) buttons.push(small("分解 🧩+" + g.tier * 3, () => {
            if (confirm("要分解「" + g.name + "」嗎？分解後無法復原。")) { const n = Fleet.dismantle(g.id); fx("tap"); refresh("分解「" + g.name + "」，得到 🧩 碎片 ×" + n + "。"); }
          }, { className: "ghost" }));
        }

        return el("article", { className: "gear-card tier" + g.tier + (on ? " on" : "") + (owned ? "" : " locked") },
          el("div", { className: "gear-icon" }, g.icon),
          el("h5", {}, g.name + (owned && lv ? " Lv" + lv : "")),
          el("p", {}, tiers[g.tier] + "・" + info.label + " +" + value),
          ...buttons);
      });
      return el("div", { className: "gear-group" }, el("h4", {}, info.icon + " " + info.name + "（加" + info.label + "）"),
        el("div", { className: "gear-grid" }, ...cards));
    });

    list.replaceChildren(
      el("p", { className: "cloud-msg", role: "status" },
        message || "🪙 " + wallet.coins + " 金幣　🧩 " + wallet.shards + " 碎片　已擊敗海盜 " + wallet.wins + " 次。重複掉落的裝備和分解裝備都會變成碎片。"),
      el("div", { className: "stat-box" },
        statRow("❤️", "血量", "hp", stats), statRow("⚡", "體力", "sta", stats), statRow("⚔️", "攻擊力", "atk", stats)),
      ...groups);
  }

  document.querySelector("#dress")?.addEventListener("click", () => render());
  window.addEventListener("ltm:wallet", () => { if (wardrobe.open) render(); });
})();
