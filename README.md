# OpenAI 直播回顧

獨立、非官方的繁體中文直播回顧網頁。資料範圍為 2024-05-13 至 2026-09-30。

官方直播頁目前可查的 32 場過往直播均收錄；這不代表所有 OpenAI YouTube 廣播。官方清單：https://openai.com/zh-Hant/live/ 。尚未確認 YouTube 重播 ID 的事件連結到官方重播頁；不以宣傳短片冒充直播。

字幕特效預覽為自行撰寫的展示文字，非影片逐字稿。實際中英字幕需逐片匯入 SRT/VTT；匯入後可於已確認 YouTube ID 的影片同步播放。字幕只存在當前瀏覽器，時間偏移正值表示字幕延後。未確認站內播放 ID 的事件目前僅提供官方頁面觀看與字幕特效預覽。

`dist/index.html`、`style.css`、`events.js`、`app.js` 為可直接部署的靜態檔案。YouTube 封面和嵌入播放器需網路連線。

本地預覽：`python3 -m http.server 4173 --directory dist --bind 127.0.0.1`。
