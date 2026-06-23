# 期末專題：旅遊資料助手

這個專題不是「背單字軟體」，而是一個「旅遊資料助手」。使用者可輸入目的地城市與預計出發日期，自動呼叫天氣 API 填入資料，並透過 Google Apps Script 將資料存進 Google Spreadsheet。

## 功能
1. 前端網頁效果
2. 呼叫 OpenWeather API 自動填入資料
3. 使用 Google Apps Script (GAS) 將資料存入 Google Spreadsheet
4. 可部署到 GitHub Pages

## 專案檔案
- `index.html`
- `assets/style.css`
- `assets/app.js`
- `gas_code.gs`

## 使用方式
1. 將檔案上傳到 GitHub Repo
2. 在 GitHub Pages 啟用 `main` 分支
3. 將 `index.html` 與 `assets/` 放在 repo 根目錄

## API 與資料流程
1. 前端按下「自動填入資料」後，會呼叫 OpenWeather API
2. 取得城市天氣資訊、平均溫度、天氣型態
3. 系統根據天氣自動產生打包建議
4. 按下「儲存到 Google Sheets」後，資料會送到 GAS
5. GAS 將結果寫入指定 Spreadsheet

## GAS 部署流程
1. 打開 Google Apps Script
2. 建立新專案並貼上 `gas_code.gs` 內容
3. 修改 `YOUR_SPREADSHEET_ID`
4. 部署為 Web App，設定「任何人都可以存取」
5. 將部署網址貼回 `assets/app.js` 的 `YOUR_GAS_DEPLOYMENT_ID`

## 說明
- 前端為純靜態 HTML/CSS/JS，可直接放到 GitHub Pages
- API 來源為 OpenWeather
- 存檔來源為 Google Apps Script

## 注意
- 需自行填入 `YOUR_OPENWEATHER_KEY`
- 需自行填入 GAS `YOUR_GAS_DEPLOYMENT_ID`
- GitHub Pages 網址範例： `https://<你的帳號>.github.io/<repo 名稱>/`
