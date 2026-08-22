const API_KEY = "834d71cdb1ae38d3db2c9f806f175ddc";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const currentWeather = document.getElementById("currentWeather");
const forecastContainer = document.getElementById("forecast");
const errorEl = document.getElementById("error");
const loading = document.getElementById("loading");
const favBtn = document.getElementById("favBtn");
const favoriteList = document.getElementById("favoriteList");

let currentCity = "";

/* ================= FETCH WEATHER BY CITY ================= */
async function getWeatherByCity(city) {
  try {
    loading.classList.remove("hidden");
    errorEl.textContent = "";

    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        city
      )}&limit=5&appid=${API_KEY}`
    );

    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("City not found");

    const { lat, lon, name, state, country } = geoData[0];
    currentCity = `${name}${state ? ", " + state : ""}${country ? ", " + country : ""}`;

    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    const data = await weatherRes.json();
    displayCurrentWeather(data);
    getForecast(lat, lon);
  } catch (err) {
    errorEl.textContent = "❌ " + err.message;
  } finally {
    loading.classList.add("hidden");
  }
}

/* ================= CURRENT WEATHER DISPLAY ================= */
function displayCurrentWeather(data) {
  currentWeather.classList.remove("hidden");

  document.getElementById("cityName").textContent = currentCity;
  document.getElementById("temperature").textContent =
    Math.round(data.main.temp) + "°C";
  document.getElementById("condition").textContent =
    data.weather[0].main;
  document.getElementById("humidity").textContent =
    data.main.humidity;
  document.getElementById("wind").textContent =
    data.wind.speed;
  document.getElementById("pressure").textContent =
    data.main.pressure;

  document.getElementById("weatherIcon").src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  document.getElementById("dateTime").textContent =
    new Date().toLocaleString();
}

/* ================= FORECAST ================= */
async function getForecast(lat, lon) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
  );

  const data = await res.json();
  forecastContainer.innerHTML = "";

  data.list
    .filter(item => item.dt_txt.includes("12:00:00"))
    .forEach(day => {
      const card = document.createElement("div");
      card.className = "forecast-card";
      card.innerHTML = `
        <p>${new Date(day.dt_txt).toDateString()}</p>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png">
        <p>${day.weather[0].main}</p>
        <p>${Math.round(day.main.temp_min)}° / ${Math.round(
        day.main.temp_max
      )}°</p>
      `;
      forecastContainer.appendChild(card);
    });
}

/* ================= FAVORITES ================= */
function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites")) || [];
}

function saveFavorites(favs) {
  localStorage.setItem("favorites", JSON.stringify(favs));
  loadFavorites();
}

favBtn.onclick = () => {
  if (!currentCity) return;
  const favs = getFavorites();
  if (!favs.includes(currentCity)) {
    favs.push(currentCity);
    saveFavorites(favs);
  }
};

function loadFavorites() {
  favoriteList.innerHTML = "";
  getFavorites().forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.onclick = () => getWeatherByCity(city);
    favoriteList.appendChild(li);
  });
}

/* ================= GEOLOCATION (AUTO-DETECT ON LOAD) ================= */
function detectUserLocation() {
  if (!navigator.geolocation) {
    errorEl.textContent = "❌ Geolocation not supported";
    return;
  }

  loading.classList.remove("hidden");
  errorEl.textContent = "";

  navigator.geolocation.getCurrentPosition(
    pos => {
      getWeatherByCoords(
        pos.coords.latitude,
        pos.coords.longitude
      );
    },
    () => {
      loading.classList.add("hidden");
      errorEl.textContent =
        "📍 Location access denied. Please search city manually.";
    }
  );
}

/* ================= REVERSE GEOCODING (CITY-LEVEL FIX) ================= */
async function getWeatherByCoords(lat, lon) {
  try {
    // 🔹 Get nearest CITY using direct geocode fallback
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${API_KEY}`
    );
    const geoData = await geoRes.json();

    if (geoData.length) {
      // Prefer city-level result
      const cityObj =
        geoData.find(p => p.name && !p.name.toLowerCase().includes("mandal")) ||
        geoData[0];

      const { name, state, country } = cityObj;
      currentCity = `${name}${state ? ", " + state : ""}${country ? ", " + country : ""}`;
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    const data = await res.json();
    displayCurrentWeather(data);
    getForecast(lat, lon);
  } catch (err) {
    errorEl.textContent = "❌ Unable to fetch location weather";
  } finally {
    loading.classList.add("hidden");
  }
}

/* ================= EVENTS ================= */
searchBtn.onclick = () => {
  const city = cityInput.value.trim();
  if (city) getWeatherByCity(city);
};

/* ✅ ENTER KEY SUPPORT */
cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
      getWeatherByCity(city);
      cityInput.value = "";
    }
  }
});

/* ================= INIT ================= */
window.addEventListener("load", detectUserLocation);
loadFavorites();
