const cityInput = document.getElementById('city');
const dateInput = document.getElementById('date');
const loadButton = document.getElementById('loadButton');
const saveButton = document.getElementById('saveButton');
const statusEl = document.getElementById('status');
const resultCard = document.getElementById('resultCard');
const resultCity = document.getElementById('resultCity');
const resultDate = document.getElementById('resultDate');
const resultWeather = document.getElementById('resultWeather');
const resultTemp = document.getElementById('resultTemp');
const packingList = document.getElementById('packingList');

let currentPayload = null;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.backgroundColor = isError ? '#fee2e2' : '#eef2ff';
  statusEl.style.color = isError ? '#991b1b' : '#3730a3';
}

function renderResult(data) {
  resultCard.classList.remove('hidden');
  resultCity.textContent = data.city;
  resultDate.textContent = data.departDate;
  resultWeather.textContent = `${data.weatherType} (${data.weatherDescription})`;
  resultTemp.textContent = `${data.averageTemp} °C`;
  packingList.innerHTML = data.packingList.map(item => `<li>${item}</li>`).join('');
}

async function fetchData(city, date) {
  setStatus('正在呼叫 API，自動填入資料...');
  loadButton.disabled = true;
  saveButton.disabled = true;
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=YOUR_OPENWEATHER_KEY`);
    if (!response.ok) {
      throw new Error('API 取得失敗，請檢查城市名稱。');
    }
    const raw = await response.json();
    const weatherType = raw.weather?.[0]?.main || 'Unknown';
    const description = raw.weather?.[0]?.description || '無描述';
    const temp = raw.main?.temp ?? 0;
    const packingList = [];
    if (weatherType.includes('Rain') || weatherType.includes('Drizzle') || weatherType.includes('Thunderstorm')) {
      packingList.push('雨具');
      packingList.push('防水外套');
    }
    if (temp <= 15) {
      packingList.push('發熱衣');
      packingList.push('厚外套');
    } else if (temp <= 22) {
      packingList.push('薄外套');
    } else {
      packingList.push('短袖');
      packingList.push('太陽眼鏡');
      packingList.push('防曬乳');
    }
    if (weatherType === 'Snow') {
      packingList.push('保暖手套');
    }
    const data = {
      city: raw.name,
      departDate: date,
      weatherType,
      weatherDescription: description,
      averageTemp: temp.toFixed(1),
      packingList
    };
    currentPayload = data;
    renderResult(data);
    setStatus('資料已自動填入，請按「儲存到 Google Sheets」。');
    saveButton.disabled = false;
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    loadButton.disabled = false;
  }
}

async function saveToSheet(payload) {
  setStatus('正在儲存到 Google Sheets...');
  saveButton.disabled = true;
  try {
    const response = await fetch('https://script.google.com/macros/s/YOUR_GAS_DEPLOYMENT_ID/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || '儲存失敗');
    }
    setStatus('已成功儲存到 Google Sheets！');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
}

loadButton.addEventListener('click', () => {
  const city = cityInput.value.trim();
  const date = dateInput.value;
  if (!city || !date) {
    setStatus('請先輸入目的地城市與出發日期。', true);
    return;
  }
  fetchData(city, date);
});

saveButton.addEventListener('click', () => {
  if (!currentPayload) {
    setStatus('沒有可儲存的資料，請先自動填入。', true);
    return;
  }
  saveToSheet(currentPayload);
});
