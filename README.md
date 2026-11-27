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
| `public/fx.js` | 音效與通關彩帶 |
| `src/worker.js` | Cloudflare Worker：`/api/*`，資料存在 KV |

## 雲端資料功能
- **自動備份**：每次進度變動 1.5 秒後存到 KV，右上「我的紀錄」可看**同步碼**，換裝置輸入即可接續。
- **班級排行榜**：老師給班級代碼（例如 `6A2025`），或分享 `/?room=6A2025` 連結；通關者出現在榜上。
- **全站統計**：各單元通關次數。
- 沒網路時照常遊玩，恢復連線後自動補送。

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
