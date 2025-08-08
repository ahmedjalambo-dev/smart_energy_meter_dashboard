// Firebase Configuration from your sketch.ino
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
const toggleLoadBtn = document.getElementById("toggle-load");
const datePicker = document.getElementById("date-picker");
const yearPicker = document.getElementById("year-picker");

// --- UTILITY FUNCTIONS ---

// Convert timestamp to date string (YYYY-MM-DD)
function timestampToDate(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}

// Convert timestamp to hour (0-23)
function timestampToHour(timestamp) {
  const date = new Date(timestamp);
  return date.getHours();
}

// Convert timestamp to month (0-11)
function timestampToMonth(timestamp) {
  const date = new Date(timestamp);
  return date.getMonth();
}

// Convert timestamp to year
function timestampToYear(timestamp) {
  const date = new Date(timestamp);
  return date.getFullYear();
}

// --- LIVE DATA & CONTROLS ---

// Reference to the latest data entry
const latestDataRef = database.ref("data").limitToLast(1);

latestDataRef.on("child_added", snapshot => {
  const data = snapshot.val();
  currentEl.textContent = `${data.current.toFixed(1)} A`;
  powerEl.textContent = `${data.power.toFixed(0)} W`;
  energyEl.textContent = `${data.totalEnergy_kWh.toFixed(3)} kWh`;
  billEl.textContent = `₪ ${data.currentBill.toFixed(2)}`;
});

// Reference to the load control
const loadControlRef = database.ref("LoadControl/isEnabled");

loadControlRef.on("value", snapshot => {
  const isEnabled = snapshot.val();
  if (isEnabled) {
    loadStatusEl.textContent = "Disconnected";
    loadStatusEl.classList.remove("connected");
    loadStatusEl.classList.add("disconnected");
    toggleLoadBtn.textContent = "Connect Electricity";
    toggleLoadBtn.classList.add("connect");
  } else {
    loadStatusEl.textContent = "Connected";
    loadStatusEl.classList.remove("disconnected");
    loadStatusEl.classList.add("connected");
    toggleLoadBtn.textContent = "Disconnect Electricity";
    toggleLoadBtn.classList.remove("connect");
  }
});

toggleLoadBtn.addEventListener("click", () => {
  loadControlRef.once("value", snapshot => {
    const isEnabled = snapshot.val();
    // Toggle the value in Firebase
    loadControlRef.set(!isEnabled);
  });
});

// --- CHARTS ---

// Set default date for date picker to today
datePicker.valueAsDate = new Date();

// Daily Energy Consumption Chart
const dailyCtx = document.getElementById("daily-chart").getContext("2d");
const dailyChart = new Chart(dailyCtx, {
  type: "bar",
  data: {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), // 24 hours
    datasets: [
      {
        label: "Energy (kWh)",
        data: [], // Initially empty
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1
      }
    ]
  },
  options: {
    responsive: true,
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
          text: "Hour of Day"
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: "Daily Energy Consumption"
      }
    }
  }
});

// Monthly Bills Chart
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
        data: [], // Initially empty
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        fill: true,
        tension: 0.1
      }
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Bill Amount (₪)"
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
      title: {
        display: true,
        text: "Monthly Bills"
      }
    }
  }
});

// --- REAL CHART DATA LOGIC ---

// Function to fetch and update daily chart with real Firebase data
function updateDailyChart(selectedDate) {
  console.log(`Loading daily data for: ${selectedDate}`);

  // Initialize hourly energy array (24 hours)
  const hourlyEnergy = new Array(24).fill(0);
  const hourlyDataCount = new Array(24).fill(0);

  // Get all data from Firebase
  database
    .ref("data")
    .once("value", snapshot => {
      if (!snapshot.exists()) {
        console.log("No data available in Firebase");
        dailyChart.data.datasets[0].data = hourlyEnergy;
        dailyChart.update();
        return;
      }

      const allData = snapshot.val();
      let dataPointsProcessed = 0;
      let dataPointsForSelectedDate = 0;

      // Process each data entry
      Object.values(allData).forEach(entry => {
        if (entry.timestamp && entry.power !== undefined) {
          dataPointsProcessed++;
          const entryDate = timestampToDate(parseInt(entry.timestamp));

          // Check if this entry is from the selected date
          if (entryDate === selectedDate) {
            dataPointsForSelectedDate++;
            const hour = timestampToHour(parseInt(entry.timestamp));

            // Accumulate energy for this hour
            // Convert power to energy: power (W) / 1000 / 60 = energy per minute (kWh)
            const energyIncrement = (entry.power || 0) / 1000.0 / 60.0;
            hourlyEnergy[hour] += energyIncrement;
            hourlyDataCount[hour]++;
          }
        }
      });

      console.log(`Processed ${dataPointsProcessed} total data points`);
      console.log(
        `Found ${dataPointsForSelectedDate} data points for ${selectedDate}`
      );
      console.log("Hourly energy data:", hourlyEnergy);

      // Update the chart
      dailyChart.data.datasets[0].data = hourlyEnergy;
      dailyChart.update();

      // Update chart title with date
      dailyChart.options.plugins.title.text = `Daily Energy Consumption - ${selectedDate}`;
      dailyChart.update();
    })
    .catch(error => {
      console.error("Error fetching daily data:", error);
      // Fallback to empty data
      dailyChart.data.datasets[0].data = hourlyEnergy;
      dailyChart.update();
    });
}

// Function to fetch and update monthly chart with real Firebase data
function updateMonthlyChart(selectedYear) {
  console.log(`Loading monthly data for: ${selectedYear}`);

  // Initialize monthly bills array (12 months)
  const monthlyBills = new Array(12).fill(0);
  const monthlyDataCount = new Array(12).fill(0);

  // Get all data from Firebase
  database
    .ref("data")
    .once("value", snapshot => {
      if (!snapshot.exists()) {
        console.log("No data available in Firebase");
        monthlyChart.data.datasets[0].data = monthlyBills;
        monthlyChart.update();
        return;
      }

      const allData = snapshot.val();
      let dataPointsProcessed = 0;
      let dataPointsForSelectedYear = 0;

      // Process each data entry
      Object.values(allData).forEach(entry => {
        if (entry.timestamp && entry.currentBill !== undefined) {
          dataPointsProcessed++;
          const entryYear = timestampToYear(parseInt(entry.timestamp));

          // Check if this entry is from the selected year
          if (entryYear === parseInt(selectedYear)) {
            dataPointsForSelectedYear++;
            const month = timestampToMonth(parseInt(entry.timestamp));

            // Keep the maximum bill for each month (as bills are cumulative)
            monthlyBills[month] = Math.max(
              monthlyBills[month],
              entry.currentBill || 0
            );
            monthlyDataCount[month]++;
          }
        }
      });

      console.log(`Processed ${dataPointsProcessed} total data points`);
      console.log(
        `Found ${dataPointsForSelectedYear} data points for year ${selectedYear}`
      );
      console.log("Monthly bill data:", monthlyBills);

      // Update the chart
      monthlyChart.data.datasets[0].data = monthlyBills;
      monthlyChart.update();

      // Update chart title with year
      monthlyChart.options.plugins.title.text = `Monthly Bills - ${selectedYear}`;
      monthlyChart.update();
    })
    .catch(error => {
      console.error("Error fetching monthly data:", error);
      // Fallback to empty data
      monthlyChart.data.datasets[0].data = monthlyBills;
      monthlyChart.update();
    });
}

// Real-time chart updates - listen for new data and update current day/year charts
database.ref("data").on("child_added", snapshot => {
  const newData = snapshot.val();
  if (newData && newData.timestamp) {
    const dataDate = timestampToDate(parseInt(newData.timestamp));
    const dataYear = timestampToYear(parseInt(newData.timestamp));
    const currentSelectedDate = datePicker.value;
    const currentSelectedYear = parseInt(yearPicker.value);

    // Update daily chart if the new data is from the currently selected date
    if (dataDate === currentSelectedDate) {
      console.log("New data for selected date, updating daily chart...");
      updateDailyChart(currentSelectedDate);
    }

    // Update monthly chart if the new data is from the currently selected year
    if (dataYear === currentSelectedYear) {
      console.log("New data for selected year, updating monthly chart...");
      updateMonthlyChart(currentSelectedYear);
    }
  }
});

// Event Listeners for date/year pickers
datePicker.addEventListener("change", e => {
  updateDailyChart(e.target.value);
});

yearPicker.addEventListener("change", e => {
  updateMonthlyChart(e.target.value);
});

// Initial chart load with current selections
document.addEventListener("DOMContentLoaded", () => {
  // Small delay to ensure Firebase is initialized
  setTimeout(() => {
    updateDailyChart(datePicker.value);
    updateMonthlyChart(yearPicker.value);
  }, 1000);
});

// Also load immediately if DOM is already loaded
if (document.readyState === "loading") {
  // Still loading, wait for DOMContentLoaded
} else {
  // Already loaded
  setTimeout(() => {
    updateDailyChart(datePicker.value);
    updateMonthlyChart(yearPicker.value);
  }, 1000);
}
