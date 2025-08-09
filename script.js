// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
  databaseURL:
    "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Constants
const TARIFF_RATE = 0.5; // ILS per kWh

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

function getStartOfMonth(year, month) {
  return new Date(year, month, 1).getTime();
}

function getEndOfMonth(year, month) {
  return new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
}

function calculateEnergyFromPowerReadings(dataArray) {
  if (dataArray.length < 2) return 0;

  let totalEnergy = 0; // in kWh

  // Sort by timestamp to ensure proper order
  dataArray.sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < dataArray.length; i++) {
    const currentReading = dataArray[i];
    const previousReading = dataArray[i - 1];

    // Calculate time difference in hours
    const timeDiffMs = currentReading.timestamp - previousReading.timestamp;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    // Use average power between two readings for more accuracy
    const avgPower = (currentReading.power + previousReading.power) / 2;

    // Calculate energy consumed in this time interval (kWh)
    const energyIncrement = avgPower / 1000 * timeDiffHours;

    totalEnergy += energyIncrement;
  }

  return totalEnergy;
}

function getTotalEnergyFromStart(allData) {
  const dataArray = [];

  Object.values(allData).forEach(entry => {
    if (entry.timestamp && entry.power !== undefined) {
      dataArray.push({
        timestamp: parseInt(entry.timestamp),
        power: entry.power
      });
    }
  });

  return calculateEnergyFromPowerReadings(dataArray);
}

function getCurrentMonthEnergyConsumption(allData) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startOfMonth = getStartOfMonth(currentYear, currentMonth);
  const endOfMonth = getEndOfMonth(currentYear, currentMonth);

  // Get all entries for current month
  const monthDataArray = [];
  Object.values(allData).forEach(entry => {
    if (entry.timestamp && entry.power !== undefined) {
      const timestamp = parseInt(entry.timestamp);
      if (timestamp >= startOfMonth && timestamp <= endOfMonth) {
        monthDataArray.push({
          timestamp: timestamp,
          power: entry.power
        });
      }
    }
  });

  return calculateEnergyFromPowerReadings(monthDataArray);
}

function getMonthlyEnergyConsumption(allData, year, month) {
  const startOfMonth = getStartOfMonth(year, month);
  const endOfMonth = getEndOfMonth(year, month);

  // Get all entries for the specified month
  const monthDataArray = [];
  Object.values(allData).forEach(entry => {
    if (entry.timestamp && entry.power !== undefined) {
      const timestamp = parseInt(entry.timestamp);
      if (timestamp >= startOfMonth && timestamp <= endOfMonth) {
        monthDataArray.push({
          timestamp: timestamp,
          power: entry.power
        });
      }
    }
  });

  return calculateEnergyFromPowerReadings(monthDataArray);
}

function getDailyEnergyByHour(allData, selectedDate) {
  const hourlyEnergy = new Array(24).fill(0);

  // Group data by hour for the selected date
  const hourlyData = {};
  for (let hour = 0; hour < 24; hour++) {
    hourlyData[hour] = [];
  }

  Object.values(allData).forEach(entry => {
    if (entry.timestamp && entry.power !== undefined) {
      const entryDate = timestampToDate(parseInt(entry.timestamp));
      if (entryDate === selectedDate) {
        const hour = timestampToHour(parseInt(entry.timestamp));
        hourlyData[hour].push({
          timestamp: parseInt(entry.timestamp),
          power: entry.power
        });
      }
    }
  });

  // Calculate energy for each hour
  for (let hour = 0; hour < 24; hour++) {
    if (hourlyData[hour].length > 0) {
      hourlyEnergy[hour] = calculateEnergyFromPowerReadings(hourlyData[hour]);
    }
  }

  return hourlyEnergy;
}

// Live Data Updates
const latestDataRef = database.ref("data").limitToLast(1);

latestDataRef.on("child_added", snapshot => {
  const data = snapshot.val();
  currentEl.textContent = `${data.current.toFixed(1)} A`;
  powerEl.textContent = `${data.power.toFixed(0)} W`;

  // Calculate total energy and current month bill from all data
  database.ref("data").once("value", allDataSnapshot => {
    if (allDataSnapshot.exists()) {
      const allData = allDataSnapshot.val();

      // Calculate total energy from start
      const totalEnergy = getTotalEnergyFromStart(allData);
      energyEl.textContent = `${totalEnergy.toFixed(3)} kWh`;

      // Calculate current month consumption and bill
      const monthlyConsumption = getCurrentMonthEnergyConsumption(allData);
      const monthlyBill = monthlyConsumption * TARIFF_RATE;
      billEl.textContent = `₪ ${monthlyBill.toFixed(2)}`;
    }
  });
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
  database.ref("data").once("value", snapshot => {
    if (!snapshot.exists()) {
      dailyChart.data.datasets[0].data = new Array(24).fill(0);
      dailyChart.update();
      return;
    }

    const allData = snapshot.val();
    const hourlyEnergy = getDailyEnergyByHour(allData, selectedDate);

    dailyChart.data.datasets[0].data = hourlyEnergy;
    dailyChart.update();
  });
}

function updateMonthlyChart(selectedYear) {
  database.ref("data").once("value", snapshot => {
    if (!snapshot.exists()) {
      monthlyChart.data.datasets[0].data = new Array(12).fill(0);
      monthlyChart.update();
      return;
    }

    const allData = snapshot.val();
    const monthlyBills = [];

    // Calculate bill for each month
    for (let month = 0; month < 12; month++) {
      const monthlyConsumption = getMonthlyEnergyConsumption(
        allData,
        parseInt(selectedYear),
        month
      );
      monthlyBills.push(monthlyConsumption * TARIFF_RATE);
    }

    monthlyChart.data.datasets[0].data = monthlyBills;
    monthlyChart.update();
  });
}

// Alerts handling
const dataRef = database.ref("data").limitToLast(1);
dataRef.on("child_added", snapshot => {
  const entry = snapshot.val();
  const alertsList = document.getElementById("alerts-list");
  alertsList.innerHTML = "";

  const alertMessages = {
    overdrawn: "Current exceeded safe limit!",
    spikeDetected: "Sudden usage spike detected!"
  };

  let alertCount = 0;

  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();

  Object.keys(alertMessages).forEach(key => {
    // Check both boolean true and string "true" for robustness
    if (entry[key] === true || entry[key] === "true") {
      alertCount++;

      const li = document.createElement("li");
      li.classList.add("alert-item", `alert-${key}`);
      li.textContent = `${alertMessages[key]} (${new Date(
        parseInt(entry.timestamp)
      ).toLocaleString()})`;
      fragment.appendChild(li);
    }
  });

  // Update the DOM
  if (alertCount > 0) {
    alertsList.appendChild(fragment);
  } else {
    alertsList.innerHTML = '<li class="no-alerts">No alerts at this time</li>';
  }

  // Update counter
  const alertCountElement = document.getElementById("alert-count");
  if (alertCountElement) {
    alertCountElement.textContent = alertCount;
    // Visual feedback when count changes
    alertCountElement.classList.add("count-updated");
    setTimeout(() => alertCountElement.classList.remove("count-updated"), 300);
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

// Current Time Function
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
