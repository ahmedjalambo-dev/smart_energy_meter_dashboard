// Theme Management
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Check for saved theme preference or default to 'light'
const currentTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Update charts with new theme
  updateChartsTheme();
});

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
  databaseURL: "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app/"
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
const connectionIcon = document.getElementById("connection-icon");

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

// Get current theme colors for charts
function getThemeColors() {
  const isDark = html.getAttribute('data-theme') === 'dark';
  return {
    primary: isDark ? '#60a5fa' : '#3b82f6',
    primaryAlpha: isDark ? 'rgba(96, 165, 250, 0.6)' : 'rgba(59, 130, 246, 0.6)',
    text: isDark ? '#f8fafc' : '#0f172a',
    grid: isDark ? '#334155' : '#e2e8f0',
    background: isDark ? '#1e293b' : '#ffffff'
  };
}

// Live Data & Controls
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
    loadStatusEl.classList.remove("connected");
    loadStatusEl.classList.add("disconnected");
    toggleLoadBtn.textContent = "Connect Electricity";
    toggleLoadBtn.classList.add("connect");
    
    // Update connection icon
    connectionIcon.innerHTML = `
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      <line x1="18" y1="6" x2="6" y2="18" stroke="red" stroke-width="3"></line>
    `;
  } else {
    loadStatusEl.textContent = "Connected";
    loadStatusEl.classList.remove("disconnected");
    loadStatusEl.classList.add("connected");
    toggleLoadBtn.textContent = "Disconnect Electricity";
    toggleLoadBtn.classList.remove("connect");
    
    // Update connection icon
    connectionIcon.innerHTML = `
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    `;
  }
});

toggleLoadBtn.addEventListener("click", () => {
  loadControlRef.once("value", snapshot => {
    const isEnabled = snapshot.val();
    loadControlRef.set(!isEnabled);
  });
});

// Charts
datePicker.valueAsDate = new Date();

// Daily Energy Chart
const dailyCtx = document.getElementById("daily-chart").getContext("2d");
let dailyChart;

function createDailyChart() {
  const colors = getThemeColors();
  
  dailyChart = new Chart(dailyCtx, {
    type: "bar",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: "Energy (kWh)",
        data: [],
        backgroundColor: colors.primaryAlpha,
        borderColor: colors.primary,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Daily Energy Consumption",
          color: colors.text,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          labels: {
            color: colors.text,
            font: {
              family: 'Inter'
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy (kWh)",
            color: colors.text
          },
          ticks: {
            color: colors.text
          },
          grid: {
            color: colors.grid
          }
        },
        x: {
          title: {
            display: true,
            text: "Hour of Day",
            color: colors.text
          },
          ticks: {
            color: colors.text
          },
          grid: {
            color: colors.grid
          }
        }
      }
    }
  });
}

// Monthly Bills Chart
const monthlyCtx = document.getElementById("monthly-chart").getContext("2d");
let monthlyChart;

function createMonthlyChart() {
  const colors = getThemeColors();
  
  monthlyChart = new Chart(monthlyCtx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{
        label: "Bill (₪)",
        data: [],
        backgroundColor: colors.primaryAlpha,
        borderColor: colors.primary,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colors.primary,
        pointBorderColor: colors.background,
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Monthly Bills",
          color: colors.text,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          labels: {
            color: colors.text,
            font: {
              family: 'Inter'
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Bill Amount (₪)",
            color: colors.text
          },
          ticks: {
            color: colors.text
          },
          grid: {
            color: colors.grid
          }
        },
        x: {
          title: {
            display: true,
            text: "Month",
            color: colors.text
          },
          ticks: {
            color: colors.text
          },
          grid: {
            color: colors.grid
          }
        }
      }
    }
  });
}

// Update charts theme
function updateChartsTheme() {
  if (dailyChart) {
    dailyChart.destroy();
    createDailyChart();
    updateDailyChart(datePicker.value);
  }
  
  if (monthlyChart) {
    monthlyChart.destroy();
    createMonthlyChart();
    updateMonthlyChart(yearPicker.value);
  }
}

// Chart Data Functions
function updateDailyChart(selectedDate) {
  console.log(`Loading daily data for: ${selectedDate}`);
  
  const hourlyEnergy = new Array(24).fill(0);
  
  database.ref("data").once("value", snapshot => {
    if (!snapshot.exists()) {
      console.log("No data available in Firebase");
      dailyChart.data.datasets[0].data = hourlyEnergy;
      dailyChart.update();
      return;
    }
    
    const allData = snapshot.val();
    let dataPointsProcessed = 0;
    let dataPointsForSelectedDate = 0;
    
    Object.values(allData).forEach(entry => {
      if (entry.timestamp && entry.power !== undefined) {
        dataPointsProcessed++;
        const entryDate = timestampToDate(parseInt(entry.timestamp));
        
        if (entryDate === selectedDate) {
          dataPointsForSelectedDate++;
          const hour = timestampToHour(parseInt(entry.timestamp));
          const energyIncrement = (entry.power || 0) / 1000.0 / 60.0;
          hourlyEnergy[hour] += energyIncrement;
        }
      }
    });
    
    console.log(`Processed ${dataPointsProcessed} total data points`);
    console.log(`Found ${dataPointsForSelectedDate} data points for ${selectedDate}`);
    
    dailyChart.data.datasets[0].data = hourlyEnergy;
    dailyChart.options.plugins.title.text = `Daily Energy Consumption - ${selectedDate}`;
    dailyChart.update();
  }).catch(error => {
    console.error("Error fetching daily data:", error);
    dailyChart.data.datasets[0].data = hourlyEnergy;
    dailyChart.update();
  });
}

function updateMonthlyChart(selectedYear) {
  console.log(`Loading monthly data for: ${selectedYear}`);
  
  const monthlyBills = new Array(12).fill(0);
  
  database.ref("data").once("value", snapshot => {
    if (!snapshot.exists()) {
      console.log("No data available in Firebase");
      monthlyChart.data.datasets[0].data = monthlyBills;
      monthlyChart.update();
      return;
    }
    
    const allData = snapshot.val();
    let dataPointsProcessed = 0;
    let dataPointsForSelectedYear = 0;
    
    Object.values(allData).forEach(entry => {
      if (entry.timestamp && entry.currentBill !== undefined) {
        dataPointsProcessed++;
        const entryYear = timestampToYear(parseInt(entry.timestamp));
        
        if (entryYear === parseInt(selectedYear)) {
          dataPointsForSelectedYear++;
          const month = timestampToMonth(parseInt(entry.timestamp));
          monthlyBills[month] = Math.max(monthlyBills[month], entry.currentBill || 0);
        }
      }
    });
    
    console.log(`Processed ${dataPointsProcessed} total data points`);
    console.log(`Found ${dataPointsForSelectedYear} data points for year ${selectedYear}`);
    
    monthlyChart.data.datasets[0].data = monthlyBills;
    monthlyChart.options.plugins.title.text = `Monthly Bills - ${selectedYear}`;
    monthlyChart.update();
  }).catch(error => {
    console.error("Error fetching monthly data:", error);
    monthlyChart.data.datasets[0].data = monthlyBills;
    monthlyChart.update();
  });
}

// Real-time chart updates
database.ref("data").on("child_added", snapshot => {
  const newData = snapshot.val();
  if (newData && newData.timestamp) {
    const dataDate = timestampToDate(parseInt(newData.timestamp));
    const dataYear = timestampToYear(parseInt(newData.timestamp));
    const currentSelectedDate = datePicker.value;
    const currentSelectedYear = parseInt(yearPicker.value);
    
    if (dataDate === currentSelectedDate) {
      console.log("New data for selected date, updating daily chart...");
      updateDailyChart(currentSelectedDate);
    }
    
    if (dataYear === currentSelectedYear) {
      console.log("New data for selected year, updating monthly chart...");
      updateMonthlyChart(currentSelectedYear);
    }
  }
});

// Event Listeners
datePicker.addEventListener("change", e => {
  updateDailyChart(e.target.value);
});

yearPicker.addEventListener("change", e => {
  updateMonthlyChart(e.target.value);
});

// Initialize charts and load data
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    createDailyChart();
    createMonthlyChart();
    updateDailyChart(datePicker.value);
    updateMonthlyChart(yearPicker.value);
  }, 1000);
});

// Also load immediately if DOM is already loaded
if (document.readyState !== "loading") {
  setTimeout(() => {
    createDailyChart();
    createMonthlyChart();
    updateDailyChart(datePicker.value);
    updateMonthlyChart(yearPicker.value);
  }, 1000);
}
