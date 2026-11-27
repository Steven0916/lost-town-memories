// 重新產生各關卡的 QR Code：node scripts/make-qr.mjs https://你的網址
import QRCode from "qrcode";
import { readFileSync } from "node:fs";
const origin = (process.argv[2] || "https://lost-town-memories.ydlo-school.workers.dev").replace(/\/$/, "");
const ids = [...readFileSync("public/units.js", "utf8").matchAll(/unit\("([a-z]+)"/g)].map((m) => m[1]).concat("sample");
for (const id of ids) {
  await QRCode.toFile(`public/qr/${id}.png`, `${origin}/?unit=${id}`, { width: 216, margin: 2, color: { dark: "#12353a", light: "#ffffff" } });
  console.log(id, "→", `${origin}/?unit=${id}`);
}
