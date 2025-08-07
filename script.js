// script.js

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
  databaseURL: "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Live data display
function fetchLatestEntry() {
  db.ref("data").limitToLast(1).on("value", (snapshot) => {
    const entries = snapshot.val();
    if (!entries) return;
    const latest = Object.values(entries)[0];
    document.getElementById("current").innerText = latest.current.toFixed(2);
    document.getElementById("power").innerText = latest.power.toFixed(1);
    document.getElementById("energy").innerText = latest.totalEnergy_kWh.toFixed(3);
    document.getElementById("bill").innerText = latest.currentBill.toFixed(2);

    document.getElementById("toggle-button").innerText = latest.loadEnabled ? "Disconnect" : "Connect";
  });
}

// Manual toggle
const toggleBtn = document.getElementById("toggle-button");
toggleBtn.addEventListener("click", () => {
  db.ref("data").limitToLast(1).once("value", snapshot => {
    const lastKey = Object.keys(snapshot.val())[0];
    const currentStatus = snapshot.val()[lastKey].loadEnabled;
    db.ref(`data/${lastKey}/loadEnabled`).set(!currentStatus);
  });
});

// Daily chart
const dailyChart = new Chart(document.getElementById("dailyChart"), {
  type: "bar",
  data: {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: "Energy (kWh)",
      data: Array(24).fill(0),
      backgroundColor: "#4CAF50"
    }]
  }
});

function loadDailyChart(date) {
  const dateStr = date.replaceAll("-", "");
  const updates = [];
  for (let h = 0; h < 24; h++) {
    const hour = h.toString().padStart(2, "0");
    updates.push(`entry_${dateStr}${hour}`);
  }
  db.ref("data").once("value", snap => {
    const all = snap.val();
    const data = updates.map(k => all[k]?.totalEnergy_kWh || 0);
    dailyChart.data.datasets[0].data = data;
    dailyChart.update();
  });
}

document.getElementById("date-picker").addEventListener("change", e => {
  loadDailyChart(e.target.value);
});

// Monthly chart
const monthlyChart = new Chart(document.getElementById("monthlyChart"), {
  type: "bar",
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [{
      label: "Bill (₪)",
      data: Array(12).fill(0),
      backgroundColor: "#2196F3"
    }]
  }
});

function loadMonthlyChart(year) {
  db.ref("data").once("value", snap => {
    const entries = snap.val();
    const monthTotals = Array(12).fill(0);
    for (let key in entries) {
      const ts = new Date(entries[key].timestamp);
      if (ts.getFullYear() === year) {
        const m = ts.getMonth();
        monthTotals[m] += entries[key].currentBill || 0;
      }
    }
    monthlyChart.data.datasets[0].data = monthTotals;
    monthlyChart.update();
  });
}

document.getElementById("year-picker").addEventListener("change", e => {
  loadMonthlyChart(parseInt(e.target.value));
});

// Initial load
fetchLatestEntry();
const today = new Date().toISOString().split("T")[0];
document.getElementById("date-picker").value = today;
loadDailyChart(today);
loadMonthlyChart(2025);
