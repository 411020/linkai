const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

if (!OPENWEATHER_API_KEY) {
  console.warn('請設定 OPENWEATHER_API_KEY。');
}

function getSeasonalAverageTemp(month, lat) {
  const hemisphere = lat >= 0 ? 'north' : 'south';
  const seasonal = {
    0: { north: 4, south: 26 },
    1: { north: 6, south: 26 },
    2: { north: 9, south: 25 },
    3: { north: 14, south: 20 },
    4: { north: 18, south: 16 },
    5: { north: 22, south: 12 },
    6: { north: 25, south: 10 },
    7: { north: 24, south: 12 },
    8: { north: 21, south: 16 },
    9: { north: 16, south: 20 },
    10: { north: 11, south: 23 },
    11: { north: 7, south: 25 }
  };
  return seasonal[month]?.[hemisphere] ?? 18;
}

function buildPackingList(weatherType, averageTemp) {
  const items = new Set();
  if (weatherType === 'Rain') {
    items.add('雨具');
    items.add('防水外套');
  }
  if (weatherType === 'Snow') {
    items.add('雪地靴');
    items.add('保暖外套');
  }
  if (averageTemp <= 15) {
    items.add('發熱衣');
    items.add('厚外套');
    items.add('毛帽 / 圍巾');
  } else if (averageTemp <= 22) {
    items.add('輕薄外套');
  } else {
    items.add('短袖');
    items.add('遮陽帽');
    items.add('防曬');
  }
  if (weatherType === 'Clear') {
    items.add('墨鏡');
  }
  if (weatherType === 'Clouds') {
    items.add('薄長袖');
  }
  return Array.from(items);
}

function normalizeWeatherType(weatherMain) {
  const key = weatherMain?.toLowerCase() ?? '';
  if (key.includes('rain') || key.includes('drizzle') || key.includes('thunderstorm')) {
    return 'Rain';
  }
  if (key.includes('snow')) {
    return 'Snow';
  }
  if (key.includes('clear')) {
    return 'Clear';
  }
  if (key.includes('cloud')) {
    return 'Clouds';
  }
  return 'Variable';
}

async function geocodeCity(city) {
  const url = 'http://api.openweathermap.org/geo/1.0/direct';
  const response = await axios.get(url, {
    params: {
      q: city,
      limit: 1,
      appid: OPENWEATHER_API_KEY
    }
  });
  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new Error('無法找到城市座標，請確認目的地城市名稱。');
  }
  const location = response.data[0];
  return {
    name: `${location.name}${location.state ? ' ' + location.state : ''}, ${location.country}`,
    lat: location.lat,
    lon: location.lon
  };
}

async function fetchWeatherData(lat, lon) {
  const url = 'https://api.openweathermap.org/data/2.5/onecall';
  const response = await axios.get(url, {
    params: {
      lat,
      lon,
      exclude: 'minutely,hourly,alerts',
      units: 'metric',
      appid: OPENWEATHER_API_KEY
    }
  });
  return response.data;
}

app.get('/api/weather', async (req, res) => {
  try {
    const city = req.query.city?.trim();
    const dateString = req.query.date?.trim();
    if (!city || !dateString) {
      return res.status(400).json({ error: '請提供目的地城市與預計出發日期。' });
    }
    const departDate = new Date(dateString);
    if (Number.isNaN(departDate.getTime())) {
      return res.status(400).json({ error: '出發日期格式錯誤，請使用 YYYY-MM-DD。' });
    }

    const location = await geocodeCity(city);
    const weatherData = await fetchWeatherData(location.lat, location.lon);
    const now = new Date();
    const diffDays = Math.round((departDate - now) / (1000 * 60 * 60 * 24));
    let averageTemp;
    let weatherType;
    let weatherDescription;

    if (diffDays >= 0 && diffDays < weatherData.daily.length) {
      const daily = weatherData.daily[diffDays];
      averageTemp = (daily.temp.morn + daily.temp.day + daily.temp.eve + daily.temp.night) / 4;
      weatherType = normalizeWeatherType(daily.weather?.[0]?.main);
      weatherDescription = daily.weather?.[0]?.description || '未指定';
    } else {
      averageTemp = getSeasonalAverageTemp(departDate.getMonth(), location.lat);
      const currentMain = weatherData.current.weather?.[0]?.main;
      weatherType = normalizeWeatherType(currentMain);
      weatherDescription = weatherData.current.weather?.[0]?.description || '預測季節天候';
    }

    const packingList = buildPackingList(weatherType, averageTemp);
    return res.json({ 
      locationName: location.name,
      departDate: departDate.toISOString().slice(0, 10),
      averageTemp: Number(averageTemp.toFixed(1)),
      weatherType,
      weatherDescription,
      packingList
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || '取得天氣資料失敗。' });
  }
});

function createSheetsClient() {
  if (!GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    throw new Error('請設定 GOOGLE_SERVICE_ACCOUNT_KEY_PATH。');
  }
  if (!fs.existsSync(GOOGLE_SERVICE_ACCOUNT_KEY_PATH)) {
    throw new Error(`找不到 Google Service Account JSON：${GOOGLE_SERVICE_ACCOUNT_KEY_PATH}`);
  }
  const keyFile = JSON.parse(fs.readFileSync(GOOGLE_SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

app.post('/api/save', async (req, res) => {
  try {
    const { city, departDate, averageTemp, weatherType, packingList } = req.body;
    if (!city || !departDate || !averageTemp || !weatherType || !Array.isArray(packingList)) {
      return res.status(400).json({ error: '請提供 city, departDate, averageTemp, weatherType 與 packingList。' });
    }
    if (!SPREADSHEET_ID) {
      return res.status(500).json({ error: '請設定 SPREADSHEET_ID。' });
    }
    const sheets = createSheetsClient();
    const values = [[
      new Date().toISOString(),
      city,
      departDate,
      averageTemp,
      weatherType,
      packingList.join(', ')
    ]];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || '存入 Google Sheets 失敗。' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器已啟動，請開啟 http://localhost:${PORT}`);
});
