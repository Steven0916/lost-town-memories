// 錯題本：與海盜／Boss 對戰時答錯的題目會自動收進來，這裡可以複習，答對就移出。
(() => {
  const dialog = document.querySelector("#review");
  const body = document.querySelector("#review-body");
  const button = document.querySelector("#book-btn");
  const badge = document.querySelector("#book-count");
  if (!dialog || !window.Fleet) return;

  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fx = (name) => window.dispatchEvent(new CustomEvent("ltm:fx", { detail: name }));
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };
  const unitName = (id) => (window.UNITS || []).find((u) => u.id === id)?.unit || "港灣市集";
  const head = (title, kicker) => '<div class="dialog-head"><div><p class="eyebrow">' + esc(kicker) + '</p><h2 id="review-title" tabindex="-1">' + esc(title) +
    '</h2></div><button class="close" data-r="close" type="button" aria-label="關閉視窗">×</button></div>';
  const act = (label, id, style = "primary") => '<button type="button" class="' + style + '" data-r="' + id + '">' + esc(label) + "</button>";

  let queue = [], current = null, session = { right: 0, coins: 0 };

  function paintBadge() {
    const n = Fleet.mistakes().length;
    badge.textContent = n || "";
    button.classList.toggle("has-items", n > 0);
  }
  window.addEventListener("ltm:wallet", paintBadge);
  paintBadge();

  function listView() {
    const items = Fleet.mistakes();
    const rows = items.map((m) => '<li><span class="mb-unit">' + esc(unitName(m.u)) + '</span><span class="mb-q">' + esc(m.q) +
      '</span><span class="mb-n">答錯 ' + m.n + " 次</span></li>").join("");
    body.innerHTML = head("錯題本", "📕 把答錯的題目變成會的") + (items.length
      ? '<p class="dialog-text">共 ' + items.length + " 題。複習時答對，這題就會移出錯題本。今天複習還能賺 🪙 " + Fleet.reviewLeft() + " 枚。</p>" +
        '<ul class="mb-list">' + rows + '</ul><div class="dialog-actions">' + act("關閉", "close", "quiet") + act("開始複習", "start") + "</div>"
      : '<p class="dialog-text">目前沒有錯題，太棒了！🎉</p><p class="dialog-text small">與海盜或 Boss 對戰時答錯的題目，會自動收進這裡。</p>' +
        '<div class="dialog-actions">' + act("關閉", "close") + "</div>");
    focusTitle();
  }
  const focusTitle = () => body.querySelector("#review-title")?.focus({ preventScroll: true });

  function start() {
    queue = shuffle(Fleet.mistakes().map((m) => m.key));
    session = { right: 0, coins: 0 };
    nextQuestion();
  }
  function nextQuestion() {
    while (queue.length) {
      const key = queue.shift();
      const m = Fleet.mistakes().find((x) => x.key === key);
      if (m) { current = { m, options: shuffle(m.o), answered: false }; renderQuestion(); return; }
    }
    summary();
  }
  function renderQuestion() {
    const { m, options } = current;
    body.innerHTML = head("複習中", unitName(m.u) + " · 還剩 " + (queue.length + 1) + " 題") +
      '<details class="battle-clue"><summary>📜 回看線索</summary><p class="dialog-text">' + esc(m.c || "想想這個單元學到的內容。") + "</p></details>" +
      '<p class="battle-q">' + esc(m.q) + '</p><div class="battle-options">' +
      options.map((o, i) => '<button type="button" class="battle-opt" data-r="ans-' + i + '">' + esc(o) + "</button>").join("") + "</div>";
    focusTitle();
  }
  function answer(index) {
    if (!current || current.answered) return;
    current.answered = true;
    const { m, options } = current;
    const ok = options[index] === m.a;
    let result;
    if (ok) {
      Fleet.clearMistake(m.key);
      const coins = Fleet.reviewReward();
      session.right += 1; session.coins += coins;
      fx(coins ? "coin" : "gem");
      result = '<p class="battle-result ok">✅ 答對了！這題已移出錯題本。' + (coins ? " 🪙 +" + coins : "（今天的複習金幣已領完）") + "</p>";
    } else {
      fx("wrong");
      queue.push(m.key);
      result = '<p class="battle-result bad">❌ 還不對，這題會再出現一次。</p>';
    }
    body.innerHTML = head("複習中", unitName(m.u)) + result +
      '<p class="battle-q">' + esc(m.q) + '</p><p class="dialog-text">正確答案：<strong>' + esc(m.a) + "</strong></p>" +
      (m.e ? '<p class="dialog-text small">' + esc(m.e) + "</p>" : "") +
      '<div class="dialog-actions">' + act(queue.length ? "下一題" : "完成", "next") + "</div>";
    focusTitle();
  }
  function summary() {
    const left = Fleet.mistakes().length;
    body.innerHTML = head("複習完成", "📕 錯題本") +
      '<p class="coin-gain">本輪答對 ' + session.right + " 題" + (session.coins ? " · 🪙 +" + session.coins : "") + "</p>" +
      '<p class="dialog-text">' + (left ? "錯題本還剩 " + left + " 題，下次再接再厲！" : "錯題本清空了，太厲害了！🎉") + "</p>" +
      '<div class="dialog-actions">' + act("關閉", "close", "quiet") + (left ? act("再來一輪", "start") : "") + "</div>";
    focusTitle();
  }

  body.addEventListener("click", (event) => {
    const command = event.target.closest("[data-r]")?.dataset.r;
    if (!command) return;
    if (command === "close") dialog.close();
    if (command === "start") start();
    if (command === "next") nextQuestion();
    if (command.startsWith("ans-")) answer(Number(command.slice(4)));
  });
  button.addEventListener("click", () => { listView(); dialog.showModal(); });
})();
