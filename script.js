// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL:
    "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "smart-energy-meter-73045",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const currentEl = document.getElementById("current");
const powerEl = document.getElementById("power");
const energyEl = document.getElementById("energy");
const billEl = document.getElementById("bill");
const disconnectBtn = document.getElementById("disconnect-btn");

const dailyChartCtx = document.getElementById("dailyChart").getContext("2d");
const monthlyChartCtx = document
  .getElementById("monthlyChart")
  .getContext("2d");

let dailyChart, monthlyChart;

function fetchLatestReading() {
  db.ref("/data").limitToLast(1).once("value", snapshot => {
    snapshot.forEach(child => {
      const data = child.val();
      currentEl.textContent = data.current.toFixed(2);
      powerEl.textContent = data.power.toFixed(2);
      energyEl.textContent = data.totalEnergy_kWh.toFixed(2);
      billEl.textContent = data.currentBill.toFixed(2);
    });
  });
}

function disconnectLoad() {
  db.ref("/commands").set({ loadEnabled: false });
  alert("Load disconnected!");
}

disconnectBtn.addEventListener("click", disconnectLoad);
setInterval(fetchLatestReading, 3000);

function processDailyData(date) {
  db.ref("/data").once("value", snapshot => {
    const hourly = Array(24).fill(0);
    snapshot.forEach(child => {
      const data = child.val();
      const ts = new Date(data.timestamp);
      const dstr = ts.toISOString().split("T")[0];
      if (dstr === date) {
        hourly[ts.getHours()] += data.totalEnergy_kWh || 0;
      }
    });
    renderDailyChart(hourly);
  });
}

function processMonthlyData(year) {
  db.ref("/data").once("value", snapshot => {
    const monthly = Array(12).fill(0);
    snapshot.forEach(child => {
      const data = child.val();
      const ts = new Date(data.timestamp);
      if (ts.getFullYear() === year) {
        monthly[ts.getMonth()] += data.currentBill || 0;
      }
    });
    renderMonthlyChart(monthly);
  });
}

function renderDailyChart(data) {
  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(dailyChartCtx, {
    type: "bar",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: "Energy (kWh)",
          data
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderMonthlyChart(data) {
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(monthlyChartCtx, {
    type: "bar",
    data: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      datasets: [
        {
          label: "Bill (₪)",
          data
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

document.getElementById("datePicker").addEventListener("change", e => {
  processDailyData(e.target.value);
});

document.getElementById("yearPicker").addEventListener("change", e => {
  processMonthlyData(parseInt(e.target.value));
});

// Load defaults
const today = new Date().toISOString().split("T")[0];
document.getElementById("datePicker").value = today;
processDailyData(today);
processMonthlyData(2025);
