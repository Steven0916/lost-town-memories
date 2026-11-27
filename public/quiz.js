// 海盜問答：把單元裡的任務資料自動改編成選擇題，海盜來襲時出題。
// 題目來源就是 units.js / lesson.js，所以改教材時問答會自動跟著更新。
(() => {
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };
  const make = (q, options, correct, clue, explain) => {
    const unique = shuffle([...new Set(options)]);
    return { q, options: unique, answer: unique.indexOf(correct), clue: clue || "", explain: explain || clue || "" };
  };

  function fromUnit(unit) {
    const out = [];
    for (const t of unit.tasks) {
      const clue = t.clue, hint = t.hint;
      switch (t.type) {
        case "pick": {
          const right = t.answer.map((i) => t.options[i]);
          const wrong = t.options.filter((_, i) => !t.answer.includes(i));
          for (const r of right) out.push(make(t.prompt + (right.length > 1 ? "（下列哪一項是正確的？）" : ""), [r, ...shuffle(wrong).slice(0, 2)], r, clue, hint));
          break;
        }
        case "match":
          t.rows.forEach((row, i) => out.push(make("「" + row + "」最適合配對哪一項？", t.options, t.options[t.answer[i]], clue, hint)));
          break;
        case "sort":
        case "route":
          out.push(make("「" + t.prompt + "」第一個應該是哪一項？", t.options, t.options[t.answer[0]], clue, hint));
          out.push(make("「" + t.prompt + "」最後一個應該是哪一項？", t.options, t.options[t.answer[t.answer.length - 1]], clue, hint));
          break;
        case "budget": {
          const first = t.required[0];
          const others = t.items.filter((_, i) => !t.required.includes(i)).map((item) => item[0]);
          out.push(make("預算 " + t.budget + " " + (t.currency || "點") + "，下列哪一項是必須優先買的？", [t.items[first][0], ...others], t.items[first][0], clue, hint));
          break;
        }
        case "stance":
        case "corners":
          t.plans.forEach((p) => out.push(make("如果你選擇「" + p[0] + "」，哪一項線索最能支持你？", t.options, t.options[p[2]], clue, hint)));
          break;
      }
    }
    return out.filter((item) => item.options.length >= 2 && item.answer >= 0);
  }

  function fromSample(lesson) {
    const out = [];
    const { map, tasks } = lesson;
    map.labels.forEach((label, i) => out.push(make(
      "港灣地圖上，「" + label + "：" + map.positions[i] + "」是哪個地名？", map.places, map.places[map.answer[i]], map.record, map.record)));
    const claim = tasks[1];
    out.push(make(claim.prompt, claim.claims, claim.claims[claim.answer[0]], "船夫說貨物在碼頭卸下，攤販說舊市集靠近卸貨處。", claim.hints[1]));
    out.push(make("哪一項證據最能支持「船貨在碼頭卸下，靠近卸貨處能減少搬運」？", claim.evidence, claim.evidence[claim.answer[1]], "地圖上兩地相鄰，攤販說走一小段就能搬貨。", claim.hints[1]));
    return out;
  }

  window.Quiz = {
    // unit 為 null 代表港灣市集示範關卡
    forUnit(unit) { return shuffle(unit ? fromUnit(unit) : fromSample(window.LESSON)); },
  };
})();
