// 音效（WebAudio 合成，不需額外檔案）與通關彩帶。
(() => {
  const KEY = "lost-town-memories-sound";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let muted = false;
  try { muted = localStorage.getItem(KEY) === "off"; } catch {}
  let ctx;
  const button = document.querySelector("#sound");
  const paint = () => {
    if (!button) return;
    button.querySelector(".ico").textContent = muted ? "🔇" : "🔊";
    button.setAttribute("aria-pressed", String(!muted));
  };
  paint();
  button?.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem(KEY, muted ? "off" : "on"); } catch {}
    paint();
    if (!muted) play("tap");
  });

  function audio() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, start, length, type = "sine", volume = .07) {
    const c = audio(); if (!c) return;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, c.currentTime + start);
    gain.gain.setValueAtTime(0, c.currentTime + start);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + start + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + start + length);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime + start); osc.stop(c.currentTime + start + length + .05);
  }
  const notes = { c5: 523.25, e5: 659.25, g5: 783.99, c6: 1046.5, a4: 440, f4: 349.23, d5: 587.33 };
  const sounds = {
    tap: () => tone(notes.g5, 0, .09, "triangle", .04),
    gem: () => [notes.c5, notes.e5, notes.g5, notes.c6].forEach((f, i) => tone(f, i * .09, .25, "triangle", .07)),
    wrong: () => { tone(notes.a4, 0, .16, "sine", .06); tone(notes.f4, .12, .22, "sine", .06); },
    repair: () => { for (let i = 0; i < 12; i++) tone(400 + i * 85, i * .22, .3, "sine", .035); },
    win: () => {
      [notes.c5, notes.e5, notes.g5, notes.c6, notes.g5, notes.c6].forEach((f, i) => tone(f, i * .13, .4, "triangle", .08));
      tone(notes.c6 * 1.25, .9, .9, "sine", .06);
    },
  };
  function play(name) { if (!muted) try { sounds[name]?.(); } catch {} }

  // ---- 彩帶 ----
  function confetti() {
    if (reduced.matches) return;
    const canvas = Object.assign(document.createElement("canvas"), { className: "confetti", ariaHidden: "true" });
    document.body.append(canvas);
    const c = canvas.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; c.scale(dpr, dpr);
    const colors = ["#ffd981", "#ff9f7a", "#8fd6c4", "#b9a6ff", "#fff3c4", "#7fc4ff"];
    const pieces = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 240, y: innerHeight * .35,
      vx: (Math.random() - .5) * 15, vy: -Math.random() * 14 - 4,
      size: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .35,
      color: colors[(Math.random() * colors.length) | 0], star: Math.random() < .25,
    }));
    const t0 = performance.now();
    (function frame(now) {
      const age = (now - t0) / 1000;
      c.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of pieces) {
        p.vy += .34; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color;
        c.globalAlpha = Math.max(0, Math.min(1, 1 - (age - 2.4) / 1.2));
        if (p.star) { c.font = p.size * 1.8 + "px sans-serif"; c.fillText("✦", -p.size / 2, p.size / 2); } else c.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .6);
        c.restore();
      }
      if (age < 3.6) requestAnimationFrame(frame); else canvas.remove();
    })(t0);
  }

  window.addEventListener("ltm:fx", (event) => {
    const name = event.detail;
    play(name);
    if (name === "win") setTimeout(confetti, 120);
  });
})();

window.addEventListener("ltm:wallet", (event) => {
  const chip = document.querySelector("#coins");
  if (!chip || event.detail.coins === window.__lastCoins) { window.__lastCoins = event.detail.coins; return; }
  window.__lastCoins = event.detail.coins;
  chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump");
});
