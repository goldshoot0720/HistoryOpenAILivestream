# OpenAI 直播回顧

獨立、非官方的繁體中文直播回顧網頁，參考 OpenAI Live 的簡潔版面，提供中英雙語字幕播放器。

資料快照：**2026-10-01（台灣時間）**。只收錄 [OpenAI 官方 YouTube「直播」分頁](https://www.youtube.com/@OpenAI/streams)的公開直播。

- 2022～2026 年共 **33 場**；2022 年目前沒有公開直播。
- 額外保留使用者指定的 3 場 2019 年直播。
- 指定的 2023 年 DevDay 與 GPT-4 開發者直播已包含在上述 33 場。
- 合計 **36 場直播**，不收錄一般影片、Shorts 或僅有文章的重播項目。

清單以官方直播分頁與逐場 YouTube 中繼資料交叉核對，確認頻道 ID、原文標題與發布日期。這是公開內容的快照，不包含私人、刪除或未列在直播分頁的內容；尚未發布的內容不會提前建立。日期使用來源的發布日期，人工整理項目保留活動日期。

## 瀏覽與字幕

支援年份篩選、標題或影片 ID 搜尋，以及每批 24 場的「載入更多」。字幕提供中英雙語、繁中、英文、關閉四種模式；特效提供逐字浮現、柔和淡入與經典字幕。

字幕特效預覽使用展示文字，**不是影片逐字稿**。完整中英字幕仍需逐場匯入 SRT/VTT；匯入後與 YouTube 播放時間同步。字幕只儲存在目前瀏覽器，時間偏移正值表示字幕延後。

## 本地預覽

```sh
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

`dist/index.html`、`style.css`、`events.js`、`app.js` 可直接部署，不需要建置。YouTube 封面與播放器需要網路連線。

## 更新清單

需要 Python 3 與 yt-dlp。只下載中繼資料，不下載影音。

```sh
python3 scripts/collect-youtube.py
python3 scripts/build-catalog.py
```

收集器每次重新取得官方「直播」分頁，重用已核對的中繼資料，並移除不在該分頁的資料。建置程式只選取 2022～2026 年直播與指定的五場直播。`data/collection-summary.json`、`data/catalog-summary.json` 記錄統計；`data/livestream-curation.json` 是原始人工整理參考，只有能連結到官方直播分頁的項目會呈現在網站。
