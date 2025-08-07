// This script handles all the dynamic functionality of the Smart Energy Meter Dashboard.

// Set up the Firebase configuration from the user's sketch.ino file
const firebaseConfig = {
  apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
  databaseURL:
    "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "smart-energy-meter-73045"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const dbRef = db.ref("/");

// Get DOM elements
const liveCurrentEl = document.getElementById("live-current");
const livePowerEl = document.getElementById("live-power");
const liveEnergyEl = document.getElementById("live-energy");
const liveBillEl = document.getElementById("live-bill");
const loadControlBtn = document.getElementById("load-control-btn");
const loadStatusEl = document.getElementById("load-status");
const datePicker = document.getElementById("date-picker");
const yearPicker = document.getElementById("year-picker");
const loadingOverlay = document.getElementById("loading-overlay");

// Chart instances
let hourlyEnergyChart;
let monthlyBillsChart;

// Global variable to store all historical data
let allReadings = [];

/**
 * Toggles the visibility of the loading overlay.
 * @param {boolean} isLoading - True to show the overlay, false to hide.
 */
function toggleLoading(isLoading) {
  if (isLoading) {
    loadingOverlay.classList.remove("hidden");
  } else {
    loadingOverlay.classList.add("hidden");
  }
}

/**
 * Initializes the Chart.js instances for the hourly and monthly charts.
 */
function initializeCharts() {
  const hourlyEnergyCtx = document
    .getElementById("hourlyEnergyChart")
    .getContext("2d");
  hourlyEnergyChart = new Chart(hourlyEnergyCtx, {
    type: "bar",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: "Energy Consumed (kWh)",
          data: [],
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy (kWh)"
          }
        },
        x: {
          title: {
            display: true,
            text: "Hour of the Day"
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });

  const monthlyBillsCtx = document
    .getElementById("monthlyBillsChart")
    .getContext("2d");
  const monthLabels = [
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
  ];
  monthlyBillsChart = new Chart(monthlyBillsCtx, {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: "Monthly Bill (ILS)",
          data: [],
          backgroundColor: "rgba(236, 72, 153, 0.6)",
          borderColor: "rgba(236, 72, 153, 1)",
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Bill Amount (ILS)"
          }
        },
        x: {
          title: {
            display: true,
            text: "Month"
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

/**
 * Updates the hourly energy chart based on the selected date.
 * @param {string} selectedDateStr - The date string from the date picker.
 */
function updateHourlyChart(selectedDateStr) {
  const selectedDate = new Date(selectedDateStr);
  const hourlyData = new Array(24).fill(0);

  // Filter readings for the selected day
  const dailyReadings = allReadings.filter(reading => {
    const readingDate = new Date(reading.timestamp);
    return (
      readingDate.getFullYear() === selectedDate.getFullYear() &&
      readingDate.getMonth() === selectedDate.getMonth() &&
      readingDate.getDate() === selectedDate.getDate()
    );
  });

  if (dailyReadings.length === 0) {
    hourlyEnergyChart.data.datasets[0].data = hourlyData;
    hourlyEnergyChart.update();
    return;
  }

  dailyReadings.sort((a, b) => a.timestamp - b.timestamp);

  const hourlyMaxEnergy = {};
  dailyReadings.forEach(reading => {
    const readingDate = new Date(reading.timestamp);
    const hour = readingDate.getHours();
    if (
      !hourlyMaxEnergy[hour] ||
      reading.totalEnergy_kWh > hourlyMaxEnergy[hour]
    ) {
      hourlyMaxEnergy[hour] = reading.totalEnergy_kWh;
    }
  });

  let previousHourEnergy = 0;
  for (let i = 0; i < 24; i++) {
    if (hourlyMaxEnergy[i] !== undefined) {
      let startOfHourEnergy = 0;
      for (let j = i - 1; j >= 0; j--) {
        if (hourlyMaxEnergy[j] !== undefined) {
          startOfHourEnergy = hourlyMaxEnergy[j];
          break;
        }
      }
      const hourlyConsumption = hourlyMaxEnergy[i] - startOfHourEnergy;
      hourlyData[i] = hourlyConsumption > 0 ? hourlyConsumption : 0;
    } else {
      hourlyData[i] = 0;
    }
  }

  hourlyEnergyChart.data.datasets[0].data = hourlyData;
  hourlyEnergyChart.update();
}

/**
 * Updates the monthly bills chart based on the selected year.
 * @param {number} selectedYear - The year from the year picker.
 */
function updateMonthlyChart(selectedYear) {
  const monthlyData = new Array(12).fill(0);

  // Filter readings for the selected year
  const yearlyReadings = allReadings.filter(reading => {
    const readingDate = new Date(reading.timestamp);
    return readingDate.getFullYear() === selectedYear;
  });

  if (yearlyReadings.length === 0) {
    monthlyBillsChart.data.datasets[0].data = monthlyData;
    monthlyBillsChart.update();
    return;
  }

  const monthlyMaxBills = {};
  yearlyReadings.forEach(reading => {
    const readingDate = new Date(reading.timestamp);
    const month = readingDate.getMonth();
    if (
      !monthlyMaxBills[month] ||
      reading.currentBill > monthlyMaxBills[month]
    ) {
      monthlyMaxBills[month] = reading.currentBill;
    }
  });

  for (let i = 0; i < 12; i++) {
    monthlyData[i] = monthlyMaxBills[i] || 0;
  }

  monthlyBillsChart.data.datasets[0].data = monthlyData;
  monthlyBillsChart.update();
}

// Real-time listener for the main data
dbRef.child("data").on(
  "value",
  snapshot => {
    const data = snapshot.val();
    if (data) {
      allReadings = Object.values(data);
      const latestReading = allReadings.sort(
        (a, b) => b.timestamp - a.timestamp
      )[0];

      if (latestReading) {
        liveCurrentEl.textContent = latestReading.current.toFixed(2);
        livePowerEl.textContent = latestReading.power.toFixed(2);
        liveEnergyEl.textContent = latestReading.totalEnergy_kWh.toFixed(2);
        liveBillEl.textContent = latestReading.currentBill.toFixed(2);
      }

      updateHourlyChart(datePicker.value);
      updateMonthlyChart(parseInt(yearPicker.value));
    }
    toggleLoading(false);
  },
  error => {
    console.error("Error fetching data:", error);
    toggleLoading(false);
  }
);

// Real-time listener for the load control state
dbRef.child("LoadControl/isEnabled").on(
  "value",
  snapshot => {
    const isEnabled = snapshot.val();
    if (isEnabled === true) {
      loadControlBtn.textContent = "Disconnect Electricity";
      loadControlBtn.classList.remove(
        "bg-green-500",
        "hover:bg-green-600",
        "focus:ring-green-500/50"
      );
      loadControlBtn.classList.add(
        "bg-red-500",
        "hover:bg-red-600",
        "focus:ring-red-500/50"
      );
      loadStatusEl.textContent = "Load is currently connected.";
      loadStatusEl.classList.remove("text-red-500");
      loadStatusEl.classList.add("text-green-500");
    } else if (isEnabled === false) {
      loadControlBtn.textContent = "Connect Electricity";
      loadControlBtn.classList.remove(
        "bg-red-500",
        "hover:bg-red-600",
        "focus:ring-red-500/50"
      );
      loadControlBtn.classList.add(
        "bg-green-500",
        "hover:bg-green-600",
        "focus:ring-green-500/50"
      );
      loadStatusEl.textContent = "Load is currently disconnected.";
      loadStatusEl.classList.remove("text-green-500");
      loadStatusEl.classList.add("text-red-500");
    }
  },
  error => {
    console.error("Error fetching load control state:", error);
  }
);

// Event listener for the load control button
loadControlBtn.addEventListener("click", () => {
  const isEnabled = loadControlBtn.textContent === "Disconnect Electricity";
  dbRef
    .child("LoadControl/isEnabled")
    .set(!isEnabled)
    .then(() => {
      // Update successful, the onValue listener will handle UI change
    })
    .catch(error => {
      console.error("Error writing to Firebase:", error);
    });
});

// Event listener for the date picker
datePicker.addEventListener("change", event => {
  updateHourlyChart(event.target.value);
});

// Event listener for the year picker
yearPicker.addEventListener("change", event => {
  updateMonthlyChart(parseInt(event.target.value));
});

// Set up initial date pickers on load
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
datePicker.value = `${yyyy}-${mm}-${dd}`;
yearPicker.value = yyyy;

// Initial setup on window load
window.onload = function() {
  toggleLoading(true);
  initializeCharts();
};
