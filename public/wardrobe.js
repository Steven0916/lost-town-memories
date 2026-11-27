// 衣櫃：依 catalog.js 建立各類選單，只列出「已擁有」的款式；新款式到下方「服飾商店」購買。
(() => {
  const CATALOG = window.CATALOG;
  const order = ["hat", "coat", "pants", "shoes", "hair", "skin", "face", "neck", "back", "gear", "pet"];
  const wardrobe = document.querySelector("#wardrobe"), canvas = document.querySelector("#model");
  const KEY = "town-travel-outfit";
  let angle = .4, saved = {}, tryOn = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  const outfit = window.travelOutfit = {};
  const selects = {};
  const owns = (slot, id) => (window.Fleet ? Fleet.ownsItem(slot, id) : CATALOG[slot].items.find((i) => i.id === id)?.price === 0);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(outfit)); } catch {} };
  const redraw = () => World.preview(canvas, angle, undefined, tryOn);

  function fill(slot) {
    const select = selects[slot], current = outfit[slot] ?? saved[slot];
    select.replaceChildren();
    for (const item of CATALOG[slot].items) if (owns(slot, item.id)) select.add(new Option(item.name, item.id));
    const has = [...select.options].some((o) => o.value === current);
    select.value = has ? current : select.options[0].value;
    outfit[slot] = select.value;
  }

  for (const slot of order) {
    const label = document.createElement("label"), select = document.createElement("select");
    label.textContent = CATALOG[slot].name;
    selects[slot] = select;
    fill(slot);
    select.onchange = () => { outfit[slot] = select.value; tryOn = null; save(); redraw(); };
    label.append(select);
    document.querySelector("#clothes").append(label);
  }
  window.Fleet?.applyOutfit?.();

  window.Wardrobe = {
    outfit,
    // 穿上某件（購買後自動呼叫）
    setOutfit(slot, id) { fill(slot); outfit[slot] = id; fill(slot); tryOn = null; save(); redraw(); },
    // 只預覽、不保留
    tryOn(slot, id) { tryOn = { [slot]: id }; redraw(); },
    refresh() { for (const slot of order) fill(slot); save(); },
  };

  window.addEventListener("ltm:wallet", () => { for (const slot of order) fill(slot); });
  document.querySelector("#dress").onclick = () => { tryOn = null; wardrobe.showModal(); redraw(); };
  document.querySelector("#rotate").onclick = () => { angle += Math.PI / 2; redraw(); };
})();
