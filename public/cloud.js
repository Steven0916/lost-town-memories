// 雲端紀錄：自動同步進度、班級排行榜、跨裝置還原。
// 沒有網路或後端時，遊戲仍照常以 localStorage 運作。
(() => {
  const PROGRESS_KEY = "lost-town-memories-progress-v1";
  const OUTFIT_KEY = "town-travel-outfit";
  const WALLET_KEY = "lost-town-memories-wallet-v1";
  const CLOUD_KEY = "lost-town-memories-cloud-v1";
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const $ = (s) => document.querySelector(s);
  const units = window.UNITS ?? [];
  const unitName = (id) => units.find((u) => u.id === id)?.unit ?? "港灣市集";

  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

  const randomCode = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  };

  let cloud = read(CLOUD_KEY, {});
  if (!cloud.code) { cloud.code = randomCode(); }
  if (!cloud.name) { cloud.name = "旅人" + cloud.code.slice(0, 4); }
  const persist = () => write(CLOUD_KEY, cloud);
  persist();

  // 網址帶 ?room=ABC123 時自動加入班級
  const roomParam = new URLSearchParams(location.search).get("room");
  if (roomParam && /^[A-Za-z0-9]{4,10}$/.test(roomParam)) { cloud.room = roomParam.toUpperCase(); persist(); }

  async function api(path, options) {
    const response = await fetch("/api/" + path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "連線失敗");
    return data;
  }
  const post = (path, body) => api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  // ---- 自動同步 ----
  let timer, dirty = false, lastSync = null;
  const pendingRecords = read("lost-town-memories-pending-v1", []);
  const savePending = () => write("lost-town-memories-pending-v1", pendingRecords);

  async function pushSave() {
    dirty = false;
    try {
      const result = await post("save", {
        code: cloud.code, name: cloud.name,
        progress: read(PROGRESS_KEY, {}), outfit: read(OUTFIT_KEY, {}), wallet: read(WALLET_KEY, null),
      });
      lastSync = result.updated; setStatus("已同步 " + new Date(lastSync).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
    } catch (error) { dirty = true; setStatus("離線中，稍後自動同步"); }
  }
  async function flushRecords() {
    while (pendingRecords.length) {
      try { await post("record", pendingRecords[0]); pendingRecords.shift(); savePending(); }
      catch { return; }
    }
  }
  window.addEventListener("ltm:save", (event) => {
    const { id, completed, tries, seconds } = event.detail;
    clearTimeout(timer);
    timer = setTimeout(pushSave, 1500);
    dirty = true;
    if (completed) {
      pendingRecords.push({ name: cloud.name, unit: id, tries, seconds, room: cloud.room || "" });
      savePending();
      flushRecords().then(() => { if (!$("#cloud")?.open) return; renderBoard(); });
    }
  });
  window.addEventListener("online", () => { if (dirty) pushSave(); flushRecords(); });
  flushRecords();

  // ---- 介面 ----
  const dialog = $("#cloud");
  const body = $("#cloud-body");
  let statusNode;
  function setStatus(text) { if (statusNode?.isConnected) statusNode.textContent = text; $("#cloud-btn")?.setAttribute("data-sync", text); }

  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children.filter((c) => c != null));
    return node;
  };

  async function copy(text, button) {
    try { await navigator.clipboard.writeText(text); const old = button.textContent; button.textContent = "已複製 ✓"; setTimeout(() => (button.textContent = old), 1600); }
    catch { window.prompt("請複製：", text); }
  }

  function formatTime(seconds) {
    if (!seconds) return "—";
    return seconds >= 60 ? Math.floor(seconds / 60) + " 分 " + (seconds % 60) + " 秒" : seconds + " 秒";
  }

  function completedCount() {
    const progress = read(PROGRESS_KEY, {});
    return Object.entries(progress).filter(([id, v]) => v.completed && id !== "sample").length;
  }

  function render() {
    statusNode = el("p", { className: "cloud-status", role: "status" }, lastSync ? "已同步" : "尚未同步");

    const nameInput = el("input", { type: "text", maxLength: 12, value: cloud.name, id: "cloud-name", autocomplete: "nickname" });
    nameInput.addEventListener("change", () => { cloud.name = nameInput.value.trim().slice(0, 12) || cloud.name; nameInput.value = cloud.name; persist(); pushSave(); });

    const codeBox = el("div", { className: "code-box" }, el("strong", { className: "code" }, cloud.code.slice(0, 4) + " " + cloud.code.slice(4)));
    const copyCode = el("button", { type: "button", className: "quiet-light" }, "複製同步碼");
    copyCode.addEventListener("click", () => copy(cloud.code, copyCode));
    codeBox.append(copyCode);

    const restoreInput = el("input", { type: "text", maxLength: 9, placeholder: "輸入另一台裝置的同步碼", id: "restore-code", autocapitalize: "characters" });
    const restoreBtn = el("button", { type: "button", className: "quiet-light" }, "還原進度");
    const restoreMsg = el("p", { className: "cloud-msg", role: "status" });
    restoreBtn.addEventListener("click", async () => {
      const code = restoreInput.value.replace(/\s|-/g, "").toUpperCase();
      restoreMsg.textContent = "查詢中…";
      try {
        const data = await api("save?code=" + encodeURIComponent(code));
        if (!confirm("找到「" + (data.name || "旅人") + "」的進度，要用它取代這台裝置的進度嗎？")) { restoreMsg.textContent = "已取消。"; return; }
        write(PROGRESS_KEY, data.progress ?? {});
        if (data.outfit && Object.keys(data.outfit).length) write(OUTFIT_KEY, data.outfit);
        if (data.wallet) write(WALLET_KEY, data.wallet);
        cloud.code = data.code; cloud.name = data.name || cloud.name; persist();
        restoreMsg.textContent = "還原完成，重新載入中…";
        setTimeout(() => location.reload(), 600);
      } catch (error) { restoreMsg.textContent = error.message; }
    });

    const roomInput = el("input", { type: "text", maxLength: 10, value: cloud.room ?? "", placeholder: "例如 6A2025", id: "room-code", autocapitalize: "characters" });
    const roomBtn = el("button", { type: "button", className: "quiet-light" }, "加入班級");
    const leaveBtn = el("button", { type: "button", className: "quiet-light" }, "離開");
    const shareBtn = el("button", { type: "button", className: "quiet-light" }, "複製班級連結");
    roomBtn.addEventListener("click", () => {
      const room = roomInput.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{4,10}$/.test(room)) { roomInput.setCustomValidity("請輸入 4–10 個英數字"); roomInput.reportValidity(); roomInput.setCustomValidity(""); return; }
      cloud.room = room; persist(); render();
    });
    leaveBtn.addEventListener("click", () => { delete cloud.room; persist(); render(); });
    shareBtn.addEventListener("click", () => copy(location.origin + "/?room=" + cloud.room, shareBtn));

    const board = el("div", { id: "cloud-board", className: "board" });
    const stats = el("div", { id: "cloud-stats", className: "board" });

    body.replaceChildren(
      el("div", { className: "dialog-head" },
        el("div", {}, el("p", { className: "eyebrow" }, "雲端紀錄"), el("h2", { id: "cloud-title", tabIndex: -1 }, "我的旅程")),
        Object.assign(el("button", { className: "close", type: "button", ariaLabel: "關閉視窗" }, "×"), { onclick: () => dialog.close() })),
      el("div", { className: "cloud-summary" },
        el("div", {}, el("strong", {}, String(completedCount())), el("span", {}, " / " + units.length + " 關已通關")),
        statusNode),
      el("label", { className: "field" }, "我的暱稱（會顯示在班級排行）", nameInput),
      el("section", {}, el("h3", {}, "跨裝置同步碼"),
        el("p", { className: "dialog-text small" }, "進度會自動備份。換平板或電腦時，輸入這組代碼就能接著玩。請不要把它公開給陌生人。"),
        codeBox,
        el("div", { className: "row" }, restoreInput, restoreBtn), restoreMsg),
      el("section", {}, el("h3", {}, "班級排行榜"),
        el("p", { className: "dialog-text small" }, "老師給全班同一個班級代碼，大家通關後就會出現在榜上。"),
        el("div", { className: "row" }, roomInput, roomBtn, ...(cloud.room ? [leaveBtn] : [])),
        ...(cloud.room ? [el("p", { className: "room-tag" }, "目前班級：", el("strong", {}, cloud.room), " ", shareBtn)] : []),
        board),
      el("section", {}, el("h3", {}, "全站通關次數"), stats));
    renderBoard();
    renderStats();
    $("#cloud-title").focus({ preventScroll: true });
  }

  async function renderBoard() {
    const board = $("#cloud-board");
    if (!board) return;
    if (!cloud.room) { board.textContent = ""; return; }
    board.textContent = "載入中…";
    try {
      const { records } = await api("room?room=" + encodeURIComponent(cloud.room));
      if (!records.length) { board.textContent = "還沒有人通關，成為第一位吧！"; return; }
      const rows = records.slice(0, 40).map((r, i) => el("tr", {},
        el("td", {}, String(i + 1)), el("td", {}, r.n), el("td", {}, unitName(r.u)),
        el("td", {}, r.k ? r.k + " 次" : "一次過 ✦"), el("td", {}, formatTime(r.s))));
      board.replaceChildren(el("table", {},
        el("thead", {}, el("tr", {}, ...["#", "旅人", "關卡", "答錯", "用時"].map((t) => el("th", { scope: "col" }, t)))),
        el("tbody", {}, ...rows)));
    } catch (error) { board.textContent = "暫時讀不到排行榜（" + error.message + "）"; }
  }

  async function renderStats() {
    const node = $("#cloud-stats");
    try {
      const { stats } = await api("stats");
      const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
      if (!entries.length) { node.textContent = "還沒有人通關。"; return; }
      const max = Math.max(...entries.map(([, n]) => n));
      node.replaceChildren(...entries.map(([id, n]) => el("div", { className: "bar" },
        el("span", {}, unitName(id)),
        el("i", { style: "--w:" + Math.round((n / max) * 100) + "%" }),
        el("b", {}, String(n)))));
    } catch { node.textContent = "暫時讀不到統計。"; }
  }

  $("#cloud-btn")?.addEventListener("click", () => { render(); dialog.showModal(); });
  dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  // 帶班級代碼進站時，提示一下
  if (roomParam) {
    window.addEventListener("load", () => {
      const toast = $("#toast"); if (!toast) return;
      toast.textContent = "已加入班級 " + cloud.room + "，通關後會記錄到排行榜。"; toast.hidden = false;
      setTimeout(() => (toast.hidden = true), 4200);
    });
  }
})();
