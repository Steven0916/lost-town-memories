# 異界巡旅：消失的城鎮記憶

翰林版六年級社會課前 3D 冒險（六上 6 關、六下 4 關＋港灣市集示範關）。
線上版：https://lost-town-memories.ydlo-school.workers.dev

## 結構
| 路徑 | 說明 |
|---|---|
| `public/` | 網站本體（純 HTML/CSS/JS，無需建置） |
| `public/units.js` | **各單元題目、線索、答案** — 改教材主要改這裡 |
| `public/lesson.js` | 港灣市集示範關卡 |
| `public/polish.css` | 美化層（顏色、動畫），可獨立調整 |
| `public/world.js` | 3D 場景引擎（WebGL，含軟體繪圖備援） |
| `public/cloud.js` | 雲端存檔、同步碼、班級排行榜 |
| `public/fleet.js` | 金幣與載具設定（價格、速度、特性）— 新增載具改這裡 |
| `public/costumes.js` | 衣櫃裡的專屬服裝商店 |
| `public/quiz.js` | 海盜問答：把單元任務自動改編成選擇題 |
| `public/gear.js` | 衣櫃裡的裝備與能力值介面 |
| `public/fx.js` | 音效與通關彩帶 |
| `src/worker.js` | Cloudflare Worker：`/api/*`，資料存在 KV |

## 雲端資料功能
- **自動備份**：每次進度變動 1.5 秒後存到 KV，右上「我的紀錄」可看**同步碼**，換裝置輸入即可接續。
- **班級排行榜**：老師給班級代碼（例如 `6A2025`），或分享 `/?room=6A2025` 連結；通關者出現在榜上。
- **全站統計**：各單元通關次數。
- 沒網路時照常遊玩，恢復連線後自動補送。

## 金幣與載具（3D 開船）
- 每枚記憶碎片 +10 金幣、每關通關 +20（每關各領一次）；金幣與載具會隨雲端同步碼備份。
- 載具：⛵帆船（免費）、✈️戰鬥機（150，速度快、容錯久）、🐙海怪（300，海盜不敢開砲）。
- 其他賺金幣：一次過 +15、每日登入（連續天數越多越多，最高 +17）、每關場景藏 3 枚閃光金幣（各 +3）、海上 6 枚金幣（+2）與 2 個寶箱（+6）。
- 專屬服裝（`fleet.js` 的 `COSTUMES`）：風行者（疾風步）、星術師（星象提示）、海盜船長（無畏航行）、黃金商人（財運亨通）、小博士（再試一次）、守護騎士（守護光盾）。外觀在 `world.js` 的 `costumePalette/costumeHead/costumeBody`，技能效果在 `game.js`。
- 海盜戰鬥：偏離航線或遇到巡邏海盜（航程 30%、68% 處）時，回答剛通關單元的問題。答對以「攻擊力」扣海盜血量，答錯被砲擊扣「生命值」（不會直接回原點，生命值歸零才回碼頭）。擊敗海盜得金幣，並有機會掉裝備。題目由 `quiz.js` 從 `units.js` 的任務自動產生，改教材時題目會跟著更新。
- 能力值（基礎血量 100／體力 100／攻擊力 10）：武器加攻擊力、護甲加血量、靴子加體力。裝備定義在 `fleet.js` 的 `GEAR`。體力用於按住 Shift（或「衝刺」鈕）的衝刺。
- 開船在 `game.js` 的 `sail()`，海域與載具 3D 模型在 `world.js` 的 `seaTerrain()` / `vehicle()`。

## 本機開發與部署
```bash
npm install
npm run dev        # http://localhost:8787
npm run deploy     # 部署到 Cloudflare
npm run qr -- https://你的網址   # 換網域後重新產生 QR Code
```
## 推送後自動部署（GitHub Actions，選用）
把 `docs/deploy.yml.example` 複製成 `.github/workflows/deploy.yml`（在 GitHub 網頁上新增即可）。
到 GitHub repo → Settings → Secrets and variables → Actions 新增：
`CLOUDFLARE_API_TOKEN`（使用「Edit Cloudflare Workers」範本建立）與 `CLOUDFLARE_ACCOUNT_ID`。之後每次 push 到 `main` 就會自動上線。

## 注意
同步碼等同簡易密碼，請勿公開。KV 為最終一致性儲存，適合班級規模使用。
