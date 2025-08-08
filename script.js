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
    scales: {
      y: {
        beginAtZero: true
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
        fill: true
      }
    ]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// --- CHART DATA LOGIC ---

// Function to fetch and update daily chart
function updateDailyChart(date) {
  // In a real application, you would query Firebase for data on the selected date.
  // For this example, we'll use dummy data.
  const dummyDailyData = Array.from({ length: 24 }, () => Math.random() * 2); // Random kWh
  dailyChart.data.datasets[0].data = dummyDailyData;
  dailyChart.update();
}

// Function to fetch and update monthly chart
function updateMonthlyChart(year) {
  // In a real application, you would query Firebase for bills for the selected year.
  // For this example, we'll use dummy data.
  const dummyMonthlyData = Array.from(
    { length: 12 },
    () => Math.random() * 200
  ); // Random bill amount
  monthlyChart.data.datasets[0].data = dummyMonthlyData;
  monthlyChart.update();
}

// Event Listeners for pickers
datePicker.addEventListener("change", e => {
  updateDailyChart(e.target.value);
});

yearPicker.addEventListener("change", e => {
  updateMonthlyChart(e.target.value);
});

// Initial chart load
updateDailyChart(datePicker.value);
updateMonthlyChart(yearPicker.value);
