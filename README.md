# OpenAI 官方影片總覽

獨立、非官方的繁體中文影片回顧網頁，保留 OpenAI Live 的簡潔版面與中英雙語字幕播放器。

目前快照核對日期：**2026-10-01（台灣時間）**。

- 2022～2026 年 OpenAI 官方頻道目前公開可取得的 **752 支影片**：641 支一般影片、33 場直播、78 支 Shorts。
- 額外保留使用者指定的 3 場 2019 年直播；指定的 2023 年 DevDay 與 GPT-4 開發者直播已包含在上述 752 支。
- 保留官方 Live 清單中尚未確認 YouTube ID 的「Built to benefit everyone」重播頁。
- 網頁合計 756 筆內容，其中 755 支 YouTube 影片與 1 個官方重播頁連結。

資料來源：

- https://www.youtube.com/@OpenAI/videos
- https://www.youtube.com/@OpenAI/streams
- https://www.youtube.com/@OpenAI/shorts
- https://openai.com/zh-Hant/live/

清單使用官方頻道分頁與逐支 YouTube 影片中繼資料交叉核對，確認頻道 ID、原文標題與發布日期。它是目前公開內容的快照，不包含私人、刪除或未列在頻道清單的影片，亦不代表尚未發布的 2026 年內容已存在。日期使用影片來源顯示的發布日期；先前人工整理的直播保留活動日期。

## 瀏覽與字幕

支援年份、一般影片／直播／Shorts 類型篩選、標題或影片 ID 搜尋，以及每批 24 支的「載入更多」。提供中英雙語、繁中、英文、關閉字幕四種模式；逐字浮現、柔和淡入與經典字幕三種特效。

字幕特效預覽使用展示文字，**不是影片逐字稿**。完整中英字幕仍需逐片匯入 SRT/VTT；匯入後可與已確認 YouTube ID 的影片同步播放。字幕只儲存在目前瀏覽器，時間偏移正值表示字幕延後。外部官方重播頁目前僅提供字幕特效預覽。

## 本地預覽

```sh
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

`dist/index.html`、`style.css`、`events.js`、`app.js` 是可直接部署的靜態檔案，不需要建置。YouTube 封面與播放器需網路連線。

## 更新資料

需要 Python 3 與 yt-dlp。僅下載影片中繼資料，沒有下載影音。

```sh
python3 scripts/collect-youtube.py
python3 scripts/build-catalog.py
```

若要略過 Shorts，可執行 `python3 scripts/build-catalog.py --exclude-shorts`。資料收集器每次重新取得三個官方分頁，已核對的影片中繼資料可重用；本次完整核對 821 支不同影片，2022～2026 範圍內有 752 支。`data/collection-summary.json` 與 `data/catalog-summary.json` 記錄統計，`data/livestream-curation.json` 保留原始人工整理直播。
