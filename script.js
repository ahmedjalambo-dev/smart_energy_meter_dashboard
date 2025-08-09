// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
  databaseURL:
    "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const currentEl = document.getElementById("current");
const powerEl = document.getElementById("power");
const energyEl = document.getElementById("energy");
const billEl = document.getElementById("bill");
const loadStatusEl = document.getElementById("load-status");
const statusIndicator = document.getElementById("status-indicator");
const toggleLoadBtn = document.getElementById("toggle-load");
const datePicker = document.getElementById("date-picker");
const yearPicker = document.getElementById("year-picker");

// Utility Functions
function timestampToDate(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}

function timestampToHour(timestamp) {
  const date = new Date(timestamp);
  return date.getHours();
}

function timestampToMonth(timestamp) {
  const date = new Date(timestamp);
  return date.getMonth();
}

function timestampToYear(timestamp) {
  const date = new Date(timestamp);
  return date.getFullYear();
}

// Live Data Updates
const latestDataRef = database.ref("data").limitToLast(1);

latestDataRef.on("child_added", snapshot => {
  const data = snapshot.val();
  currentEl.textContent = `${data.current.toFixed(1)} A`;
  powerEl.textContent = `${data.power.toFixed(0)} W`;
  energyEl.textContent = `${data.totalEnergy_kWh.toFixed(3)} kWh`;
  billEl.textContent = `₪ ${data.currentBill.toFixed(2)}`;
});

// Load Control
const loadControlRef = database.ref("LoadControl/isEnabled");

loadControlRef.on("value", snapshot => {
  const isEnabled = snapshot.val();
  if (isEnabled) {
    loadStatusEl.textContent = "Disconnected";
    statusIndicator.className =
      "status-indicator status-disconnected disconnected";
    toggleLoadBtn.textContent = "Connect";
    toggleLoadBtn.className = "control-button btn-connect";
  } else {
    loadStatusEl.textContent = "Connected";
    statusIndicator.className = "status-indicator status-connected connected";
    toggleLoadBtn.textContent = "Disconnect";
    toggleLoadBtn.className = "control-button btn-disconnect";
  }
});

toggleLoadBtn.addEventListener("click", () => {
  loadControlRef.once("value", snapshot => {
    const isEnabled = snapshot.val();
    loadControlRef.set(!isEnabled);
  });
});

// Set default date
datePicker.valueAsDate = new Date();

// Initialize Charts
const dailyCtx = document.getElementById("daily-chart").getContext("2d");
const dailyChart = new Chart(dailyCtx, {
  type: "bar",
  data: {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: "Energy (kWh)",
        data: [],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.1)" },
        ticks: { color: "#6b7280" }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6b7280" }
      }
    }
  }
});

const monthlyCtx = document.getElementById("monthly-chart").getContext("2d");
const monthlyChart = new Chart(monthlyCtx, {
  type: "line",
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
        data: [],
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgba(99, 102, 241, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.1)" },
        ticks: { color: "#6b7280" }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6b7280" }
      }
    }
  }
});

// Chart Update Functions
function updateDailyChart(selectedDate) {
  const hourlyEnergy = new Array(24).fill(0);

  database.ref("data").once("value", snapshot => {
    if (!snapshot.exists()) {
      dailyChart.data.datasets[0].data = hourlyEnergy;
      dailyChart.update();
      return;
    }

    const allData = snapshot.val();
    Object.values(allData).forEach(entry => {
      if (entry.timestamp && entry.power !== undefined) {
        const entryDate = timestampToDate(parseInt(entry.timestamp));
        if (entryDate === selectedDate) {
          const hour = timestampToHour(parseInt(entry.timestamp));
          const energyIncrement = (entry.power || 0) / 1000.0 / 60.0;
          hourlyEnergy[hour] += energyIncrement;
        }
      }
    });

    dailyChart.data.datasets[0].data = hourlyEnergy;
    dailyChart.update();
  });
}

function updateMonthlyChart(selectedYear) {
  const monthlyBills = new Array(12).fill(0);

  database.ref("data").once("value", snapshot => {
    if (!snapshot.exists()) {
      monthlyChart.data.datasets[0].data = monthlyBills;
      monthlyChart.update();
      return;
    }

    const allData = snapshot.val();
    Object.values(allData).forEach(entry => {
      if (entry.timestamp && entry.currentBill !== undefined) {
        const entryYear = timestampToYear(parseInt(entry.timestamp));
        if (entryYear === parseInt(selectedYear)) {
          const month = timestampToMonth(parseInt(entry.timestamp));
          monthlyBills[month] = Math.max(
            monthlyBills[month],
            entry.currentBill || 0
          );
        }
      }
    });

    monthlyChart.data.datasets[0].data = monthlyBills;
    monthlyChart.update();
  });
}

// Alerts System
const dataRef = database.ref("data").limitToLast(1);
dataRef.on("child_added", snapshot => {
  const entry = snapshot.val();
  const alertsList = document.getElementById("alerts-list");
  alertsList.innerHTML = "";

  const alertMessages = {
    overdrawn: "Current exceeded safe limit!",
    budgetExceeded: "Monthly budget exceeded!",
    spikeDetected: "Sudden usage spike detected!"
  };

  let hasAlerts = false;

  Object.keys(alertMessages).forEach(key => {
    if (entry[key] === true) {
      hasAlerts = true;
      const li = document.createElement("li");
      li.classList.add("alert-item", `alert-${key}`);
      li.textContent = `${alertMessages[key]} (${new Date(
        parseInt(entry.timestamp)
      ).toLocaleString()})`;
      alertsList.appendChild(li);
    }
  });

  if (!hasAlerts) {
    alertsList.innerHTML = '<li class="no-alerts">No alerts at this time</li>';
  }
});

// Event Listeners
datePicker.addEventListener("change", e => {
  updateDailyChart(e.target.value);
});

yearPicker.addEventListener("change", e => {
  updateMonthlyChart(e.target.value);
});

// Real-time chart updates
database.ref("data").on("child_added", snapshot => {
  const newData = snapshot.val();
  if (newData && newData.timestamp) {
    const dataDate = timestampToDate(parseInt(newData.timestamp));
    const dataYear = timestampToYear(parseInt(newData.timestamp));
    const currentSelectedDate = datePicker.value;
    const currentSelectedYear = parseInt(yearPicker.value);

    if (dataDate === currentSelectedDate) {
      updateDailyChart(currentSelectedDate);
    }

    if (dataYear === currentSelectedYear) {
      updateMonthlyChart(currentSelectedYear);
    }
  }
});

// Initialize charts
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    updateDailyChart(datePicker.value);
    updateMonthlyChart(yearPicker.value);
  }, 1000);
});
// Update Current Time
// Current Time Function (put this near top of script.js)
function updateCurrentTime() {
  try {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const timeElement = document.getElementById("current-time");
    if (timeElement) {
      timeElement.textContent = timeString;
    } else {
      console.error("Element with ID 'current-time' not found!");
    }
  } catch (error) {
    console.error("Error updating time:", error);
  }
}

// Initialize time when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  console.log("Time updater initialized");
});
