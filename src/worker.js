// Cloudflare Worker：靜態網站由 assets 提供，/api/* 由這裡處理（資料存在 KV）。
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;      // 同步碼（不含易混淆字元）
const ROOM_RE = /^[A-Z0-9]{4,10}$/;         // 班級代碼
const UNIT_RE = /^[a-z]{3,12}$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_BODY = 24_000;
const MAX_RECORDS = 300;
const YEAR = 60 * 60 * 24 * 365;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

const clean = (s, n = 12) =>
  String(s ?? "").replace(/[\u0000-\u001f<>"'`&]/g, "").trim().slice(0, n);

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "資料太大");
  try { return JSON.parse(text || "{}"); } catch { throw new HttpError(400, "格式錯誤"); }
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

// 只保留合法的進度結構，避免亂資料進入儲存空間。
function sanitizeProgress(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const [id, value] of Object.entries(input).slice(0, 20)) {
    if (!UNIT_RE.test(id) && id !== "sample") continue;
    const cp = value?.checkpoint;
    out[id] = {
      completed: value?.completed === true,
      checkpoint: cp && typeof cp === "object" ? {
        stage: Math.max(0, Math.min(3, Number(cp.stage) | 0)),
        heard: Array.isArray(cp.heard) ? cp.heard.slice(0, 6).map((x) => clean(x, 20)) : [],
        records: Array.isArray(cp.records) ? cp.records.slice(0, 6).map((x) => clean(x, 400)) : [],
        tries: Array.isArray(cp.tries) ? cp.tries.slice(0, 3).map((x) => Math.max(0, Number(x) | 0)) : [0, 0, 0],
        cornerUnlocked: cp.cornerUnlocked === true,
      } : null,
    };
  }
  return out;
}

async function handleApi(request, env, url) {
  const kv = env.DATA;
  if (!kv) throw new HttpError(503, "尚未綁定資料庫");
  const route = url.pathname.replace(/^\/api\//, "");
  const method = request.method;

  // ---- 雲端存檔 ----
  if (route === "save" && method === "POST") {
    const body = await readBody(request);
    let code = String(body.code ?? "").toUpperCase();
    if (!CODE_RE.test(code)) code = newCode();
    const record = {
      name: clean(body.name),
      progress: sanitizeProgress(body.progress),
      outfit: typeof body.outfit === "object" && body.outfit ? Object.fromEntries(
        Object.entries(body.outfit).slice(0, 8).map(([k, v]) => [clean(k, 10), clean(v, 12)])) : {},
      updated: Date.now(),
    };
    await kv.put("save:" + code, JSON.stringify(record), { expirationTtl: YEAR });
    return json({ ok: true, code, updated: record.updated });
  }
  if (route === "save" && method === "GET") {
    const code = String(url.searchParams.get("code") ?? "").toUpperCase();
    if (!CODE_RE.test(code)) throw new HttpError(400, "同步碼格式不正確");
    const data = await kv.get("save:" + code, "json");
    if (!data) throw new HttpError(404, "找不到這組同步碼");
    return json({ ok: true, code, ...data });
  }

  // ---- 班級紀錄 ----
  if (route === "record" && method === "POST") {
    const body = await readBody(request);
    const unit = String(body.unit ?? "");
    if (!UNIT_RE.test(unit) && unit !== "sample") throw new HttpError(400, "單元不正確");
    const entry = {
      n: clean(body.name) || "旅人",
      u: unit,
      t: Date.now(),
      k: Math.max(0, Math.min(99, Number(body.tries) | 0)),   // 答錯次數
      s: Math.max(0, Math.min(36000, Number(body.seconds) | 0)), // 花費秒數
    };
    const room = String(body.room ?? "").toUpperCase();
    if (room) {
      if (!ROOM_RE.test(room)) throw new HttpError(400, "班級代碼格式不正確");
      const key = "room:" + room;
      const list = (await kv.get(key, "json")) ?? [];
      const filtered = list.filter((r) => !(r.n === entry.n && r.u === entry.u));
      filtered.unshift(entry);
      await kv.put(key, JSON.stringify(filtered.slice(0, MAX_RECORDS)), { expirationTtl: YEAR });
    }
    const stats = (await kv.get("stats", "json")) ?? {};
    stats[unit] = (stats[unit] ?? 0) + 1;
    await kv.put("stats", JSON.stringify(stats));
    return json({ ok: true });
  }
  if (route === "room" && method === "GET") {
    const room = String(url.searchParams.get("room") ?? "").toUpperCase();
    if (!ROOM_RE.test(room)) throw new HttpError(400, "班級代碼格式不正確");
    const list = (await kv.get("room:" + room, "json")) ?? [];
    return json({ ok: true, room, records: list });
  }
  if (route === "stats" && method === "GET") {
    return json({ ok: true, stats: (await kv.get("stats", "json")) ?? {} }, 200, { "cache-control": "public, max-age=30" });
  }
  throw new HttpError(404, "找不到");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await handleApi(request, env, url); }
      catch (error) {
        if (error instanceof HttpError) return json({ ok: false, error: error.message }, error.status);
        console.error(error);
        return json({ ok: false, error: "伺服器錯誤" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
