// 衣櫃裡的「冒險裝備與能力值」：武器加攻擊力、護甲加血量、靴子加體力。
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
  const { slots, list: items, tiers, base } = Fleet.gear;
  const MAX = { hp: 260, sta: 260, atk: 40 };

  function statRow(icon, label, key, stats) {
    const total = stats[key], bonus = stats.bonus[key];
    return el("div", { className: "stat-row" },
      el("span", {}, icon + " " + label),
      el("div", { className: "stat-bar" }, el("i", { style: "width:" + Math.min(100, total / MAX[key] * 100) + "%" })),
      el("b", {}, total + (bonus ? "（+" + bonus + "）" : "")));
  }

  function render(message = "") {
    const stats = Fleet.stats(), wallet = Fleet.get();
    const groups = Object.entries(slots).map(([slot, info]) => {
      const cards = items.filter((g) => g.slot === slot).map((g) => {
        const owned = Fleet.ownsGear(g.id), on = wallet.gear.equipped[slot] === g.id;
        let button;
        if (on) button = el("button", { type: "button", className: "quiet-light" }, "卸下");
        else if (owned) button = el("button", { type: "button", className: "quiet-light" }, "裝備");
        else if (g.price) button = el("button", { type: "button", className: wallet.coins >= g.price ? "primary" : "quiet" }, "🪙 " + g.price + " 購買");
        else button = el("button", { type: "button", className: "quiet", disabled: true }, "擊敗海盜取得");
        button.addEventListener("click", () => {
          if (on) { Fleet.unequipGear(slot); fx("tap"); render(); }
          else if (owned) { Fleet.equipGear(g.id); fx("tap"); render(); }
          else if (Fleet.buyGear(g.id)) { fx("gem"); render("已買下「" + g.name + "」並裝備！"); }
          else render("還差 " + (g.price - wallet.coins) + " 金幣。通關、撿金幣或擊敗海盜都能存到！");
          World.preview(main, .4);
        });
        return el("article", { className: "gear-card tier" + g.tier + (on ? " on" : "") + (owned ? "" : " locked") },
          el("div", { className: "gear-icon" }, g.icon),
          el("h5", {}, g.name),
          el("p", {}, tiers[g.tier] + "・" + info.label + " +" + g.value),
          button);
      });
      return el("div", { className: "gear-group" }, el("h4", {}, info.icon + " " + info.name + "（加" + info.label + "）"),
        el("div", { className: "gear-grid" }, ...cards));
    });
    list.replaceChildren(
      el("p", { className: "cloud-msg", role: "status" }, message || "🪙 你有 " + wallet.coins + " 金幣。與海盜對戰獲勝可以拿到裝備！已擊敗海盜 " + wallet.wins + " 次。"),
      el("div", { className: "stat-box" },
        statRow("❤️", "血量", "hp", stats), statRow("⚡", "體力", "sta", stats), statRow("⚔️", "攻擊力", "atk", stats)),
      ...groups);
  }

  document.querySelector("#dress")?.addEventListener("click", () => render());
  window.addEventListener("ltm:wallet", () => { if (wardrobe.open) render(); });
})();
