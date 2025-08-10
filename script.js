class EnergyMeterConfig {
  static FIREBASE_CONFIG = {
    apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
    databaseURL: "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app/"
  };
  
  static TARIFF_RATE = 0.5; // ILS per kWh
  static UPDATE_INTERVAL = 1000; // 1 second
  static CHART_INIT_DELAY = 1000; // 1 second delay for chart initialization
}

class DateTimeUtils {
  static timestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split("T")[0];
  }

  static timestampToHour(timestamp) {
    return new Date(timestamp).getHours();
  }

  static timestampToMonth(timestamp) {
    return new Date(timestamp).getMonth();
  }

  static timestampToYear(timestamp) {
    return new Date(timestamp).getFullYear();
  }

  static getStartOfMonth(year, month) {
    return new Date(year, month, 1).getTime();
  }

  static getEndOfMonth(year, month) {
    return new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  }

  static formatCurrentTime() {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }
}

class EnergyCalculator {
  static calculateEnergyFromPowerReadings(dataArray) {
    if (dataArray.length < 2) return 0;

    // Sort once for better performance
    const sortedData = [...dataArray].sort((a, b) => a.timestamp - b.timestamp);
    let totalEnergy = 0; // in kWh

    for (let i = 1; i < sortedData.length; i++) {
      const current = sortedData[i];
      const previous = sortedData[i - 1];

      const timeDiffHours = (current.timestamp - previous.timestamp) / (1000 * 60 * 60);
      const avgPower = (current.power + previous.power) / 2;
      totalEnergy += (avgPower / 1000) * timeDiffHours;
    }

    return totalEnergy;
  }

  static filterDataByTimeRange(allData, startTime, endTime) {
    return Object.values(allData)
      .filter(entry => entry.timestamp && entry.power !== undefined)
      .map(entry => ({
        timestamp: parseInt(entry.timestamp),
        power: entry.power
      }))
      .filter(entry => entry.timestamp >= startTime && entry.timestamp <= endTime);
  }

  static getTotalEnergyFromStart(allData) {
    const dataArray = Object.values(allData)
      .filter(entry => entry.timestamp && entry.power !== undefined)
      .map(entry => ({
        timestamp: parseInt(entry.timestamp),
        power: entry.power
      }));

    return this.calculateEnergyFromPowerReadings(dataArray);
  }

  static getCurrentMonthEnergyConsumption(allData) {
    const now = new Date();
    const startOfMonth = DateTimeUtils.getStartOfMonth(now.getFullYear(), now.getMonth());
    const endOfMonth = DateTimeUtils.getEndOfMonth(now.getFullYear(), now.getMonth());

    const monthData = this.filterDataByTimeRange(allData, startOfMonth, endOfMonth);
    return this.calculateEnergyFromPowerReadings(monthData);
  }

  static getMonthlyEnergyConsumption(allData, year, month) {
    const startOfMonth = DateTimeUtils.getStartOfMonth(year, month);
    const endOfMonth = DateTimeUtils.getEndOfMonth(year, month);

    const monthData = this.filterDataByTimeRange(allData, startOfMonth, endOfMonth);
    return this.calculateEnergyFromPowerReadings(monthData);
  }

  static getDailyEnergyByHour(allData, selectedDate) {
    const hourlyEnergy = new Array(24).fill(0);
    const hourlyData = Array.from({ length: 24 }, () => []);

    // Group data by hour efficiently
    Object.values(allData).forEach(entry => {
      if (entry.timestamp && entry.power !== undefined) {
        const timestamp = parseInt(entry.timestamp);
        const entryDate = DateTimeUtils.timestampToDate(timestamp);
        
        if (entryDate === selectedDate) {
          const hour = DateTimeUtils.timestampToHour(timestamp);
          hourlyData[hour].push({ timestamp, power: entry.power });
        }
      }
    });

    // Calculate energy for each hour
    hourlyData.forEach((hourData, hour) => {
      if (hourData.length > 0) {
        hourlyEnergy[hour] = this.calculateEnergyFromPowerReadings(hourData);
      }
    });

    return hourlyEnergy;
  }
}

class DOMManager {
  constructor() {
    this.elements = this.cacheElements();
    this.setupEventListeners();
  }

  cacheElements() {
    const elementIds = [
      'current', 'power', 'energy', 'bill', 'load-status', 'status-indicator',
      'toggle-load', 'date-picker', 'year-picker', 'current-time', 'alerts-list',
      'alert-count'
    ];

    return elementIds.reduce((elements, id) => {
      elements[id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = 
        document.getElementById(id);
      return elements;
    }, {});
  }

  setupEventListeners() {
    if (this.elements.datePicker) {
      this.elements.datePicker.valueAsDate = new Date();
    }
  }

  updateElement(elementKey, content) {
    const element = this.elements[elementKey];
    if (element) {
      element.textContent = content;
    }
  }

  updateLoadStatus(isEnabled) {
    const { loadStatus, statusIndicator, toggleLoad } = this.elements;
    
    if (isEnabled) {
      this.updateElement('loadStatus', 'Disconnected');
      statusIndicator.className = 'status-indicator status-disconnected disconnected';
      toggleLoad.textContent = 'Connect';
      toggleLoad.className = 'control-button btn-connect';
    } else {
      this.updateElement('loadStatus', 'Connected');
      statusIndicator.className = 'status-indicator status-connected connected';
      toggleLoad.textContent = 'Disconnect';
      toggleLoad.className = 'control-button btn-disconnect';
    }
  }

  updateAlerts(entry) {
    const alertsList = this.elements.alertsList;
    const alertCountElement = this.elements.alertCount;
    
    if (!alertsList) return;

    alertsList.innerHTML = '';

    const alertMessages = {
      overdrawn: 'Current exceeded safe limit!',
      spikeDetected: 'Sudden usage spike detected!'
    };

    let alertCount = 0;
    const fragment = document.createDocumentFragment();

    Object.entries(alertMessages).forEach(([key, message]) => {
      if (entry[key] === true || entry[key] === 'true') {
        alertCount++;
        const li = document.createElement('li');
        li.classList.add('alert-item', `alert-${key}`);
        li.textContent = `${message} (${new Date(parseInt(entry.timestamp)).toLocaleString()})`;
        fragment.appendChild(li);
      }
    });

    if (alertCount > 0) {
      alertsList.appendChild(fragment);
    } else {
      alertsList.innerHTML = '<li class="no-alerts">No alerts at this time</li>';
    }

    if (alertCountElement) {
      alertCountElement.textContent = alertCount;
      alertCountElement.classList.add('count-updated');
      setTimeout(() => alertCountElement.classList.remove('count-updated'), 300);
    }
  }

  updateCurrentTime() {
    this.updateElement('currentTime', DateTimeUtils.formatCurrentTime());
  }
}

class ChartManager {
  constructor() {
    this.charts = {};
    this.initializeCharts();
  }

  initializeCharts() {
    this.initializeDailyChart();
    this.initializeMonthlyChart();
  }

  initializeDailyChart() {
    const ctx = document.getElementById('daily-chart')?.getContext('2d');
    if (!ctx) return;

    this.charts.daily = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Energy (kWh)',
          data: [],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: this.getChartOptions()
    });
  }

  initializeMonthlyChart() {
    const ctx = document.getElementById('monthly-chart')?.getContext('2d');
    if (!ctx) return;

    this.charts.monthly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Bill (₪)',
          data: [],
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: this.getChartOptions()
    });
  }

  getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.1)' },
          ticks: { color: '#6b7280' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#6b7280' }
        }
      }
    };
  }

  updateDailyChart(selectedDate, allData) {
    if (!this.charts.daily || !allData) {
      this.setEmptyData('daily', 24);
      return;
    }

    const hourlyEnergy = EnergyCalculator.getDailyEnergyByHour(allData, selectedDate);
    this.charts.daily.data.datasets[0].data = hourlyEnergy;
    this.charts.daily.update();
  }

  updateMonthlyChart(selectedYear, allData) {
    if (!this.charts.monthly || !allData) {
      this.setEmptyData('monthly', 12);
      return;
    }

    const monthlyBills = Array.from({ length: 12 }, (_, month) => {
      const consumption = EnergyCalculator.getMonthlyEnergyConsumption(allData, parseInt(selectedYear), month);
      return consumption * EnergyMeterConfig.TARIFF_RATE;
    });

    this.charts.monthly.data.datasets[0].data = monthlyBills;
    this.charts.monthly.update();
  }

  setEmptyData(chartType, length) {
    if (this.charts[chartType]) {
      this.charts[chartType].data.datasets[0].data = new Array(length).fill(0);
      this.charts[chartType].update();
    }
  }
}

class SmartEnergyMeter {
  constructor() {
    this.database = null;
    this.domManager = new DOMManager();
    this.chartManager = new ChartManager();
    this.dataCache = null;
    this.lastUpdateTime = 0;
    
    this.initializeFirebase();
    this.setupRealtimeListeners();
    this.setupEventListeners();
    this.startTimeUpdater();
  }

  initializeFirebase() {
    try {
      firebase.initializeApp(EnergyMeterConfig.FIREBASE_CONFIG);
      this.database = firebase.database();
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  setupRealtimeListeners() {
    if (!this.database) return;

    // Live data updates with throttling
    const latestDataRef = this.database.ref('data').limitToLast(1);
    latestDataRef.on('child_added', this.handleLatestDataUpdate.bind(this));

    // Load control listener
    const loadControlRef = this.database.ref('LoadControl/isEnabled');
    loadControlRef.on('value', this.handleLoadControlUpdate.bind(this));

    // Alerts listener
    const dataRef = this.database.ref('data').limitToLast(1);
    dataRef.on('child_added', this.handleAlertsUpdate.bind(this));

    // Real-time chart updates with debouncing
    this.database.ref('data').on('child_added', this.handleChartDataUpdate.bind(this));
  }

  setupEventListeners() {
    // Date picker change
    if (this.domManager.elements.datePicker) {
      this.domManager.elements.datePicker.addEventListener('change', (e) => {
        this.updateDailyChart(e.target.value);
      });
    }

    // Year picker change
    if (this.domManager.elements.yearPicker) {
      this.domManager.elements.yearPicker.addEventListener('change', (e) => {
        this.updateMonthlyChart(e.target.value);
      });
    }

    // Toggle load button
    if (this.domManager.elements.toggleLoad) {
      this.domManager.elements.toggleLoad.addEventListener('click', this.handleToggleLoad.bind(this));
    }
  }

  handleLatestDataUpdate(snapshot) {
    const data = snapshot.val();
    if (!data) return;

    // Update display elements
    this.domManager.updateElement('current', `${data.current.toFixed(1)} A`);
    this.domManager.updateElement('power', `${data.power.toFixed(0)} W`);

    // Throttle expensive operations
    const now = Date.now();
    if (now - this.lastUpdateTime < 1000) return; // Update at most once per second
    this.lastUpdateTime = now;

    // Update energy and bill calculations
    this.updateEnergyAndBill();
  }

  handleLoadControlUpdate(snapshot) {
    const isEnabled = snapshot.val();
    this.domManager.updateLoadStatus(isEnabled);
  }

  handleAlertsUpdate(snapshot) {
    const entry = snapshot.val();
    if (entry) {
      this.domManager.updateAlerts(entry);
    }
  }

  handleChartDataUpdate(snapshot) {
    const newData = snapshot.val();
    if (!newData?.timestamp) return;

    const dataDate = DateTimeUtils.timestampToDate(parseInt(newData.timestamp));
    const dataYear = DateTimeUtils.timestampToYear(parseInt(newData.timestamp));
    const currentSelectedDate = this.domManager.elements.datePicker?.value;
    const currentSelectedYear = parseInt(this.domManager.elements.yearPicker?.value);

    // Update charts only if the new data affects current view
    if (dataDate === currentSelectedDate) {
      this.updateDailyChart(currentSelectedDate);
    }

    if (dataYear === currentSelectedYear) {
      this.updateMonthlyChart(currentSelectedYear);
    }
  }

  handleToggleLoad() {
    if (!this.database) return;

    const loadControlRef = this.database.ref('LoadControl/isEnabled');
    loadControlRef.once('value', (snapshot) => {
      const isEnabled = snapshot.val();
      loadControlRef.set(!isEnabled);
    });
  }

  updateEnergyAndBill() {
    if (!this.database) return;

    this.database.ref('data').once('value', (allDataSnapshot) => {
      if (!allDataSnapshot.exists()) return;

      const allData = allDataSnapshot.val();
      this.dataCache = allData; // Cache for performance

      // Calculate total energy from start
      const totalEnergy = EnergyCalculator.getTotalEnergyFromStart(allData);
      this.domManager.updateElement('energy', `${totalEnergy.toFixed(3)} kWh`);

      // Calculate current month consumption and bill
      const monthlyConsumption = EnergyCalculator.getCurrentMonthEnergyConsumption(allData);
      const monthlyBill = monthlyConsumption * EnergyMeterConfig.TARIFF_RATE;
      this.domManager.updateElement('bill', `₪ ${monthlyBill.toFixed(2)}`);
    });
  }

  updateDailyChart(selectedDate) {
    if (this.dataCache) {
      this.chartManager.updateDailyChart(selectedDate, this.dataCache);
    } else {
      this.database?.ref('data').once('value', (snapshot) => {
        const allData = snapshot.exists() ? snapshot.val() : null;
        this.chartManager.updateDailyChart(selectedDate, allData);
      });
    }
  }

  updateMonthlyChart(selectedYear) {
    if (this.dataCache) {
      this.chartManager.updateMonthlyChart(selectedYear, this.dataCache);
    } else {
      this.database?.ref('data').once('value', (snapshot) => {
        const allData = snapshot.exists() ? snapshot.val() : null;
        this.chartManager.updateMonthlyChart(selectedYear, allData);
      });
    }
  }

  startTimeUpdater() {
    this.domManager.updateCurrentTime();
    setInterval(() => {
      this.domManager.updateCurrentTime();
    }, EnergyMeterConfig.UPDATE_INTERVAL);
  }

  initializeCharts() {
    setTimeout(() => {
      const currentDate = this.domManager.elements.datePicker?.value;
      const currentYear = this.domManager.elements.yearPicker?.value;
      
      if (currentDate) this.updateDailyChart(currentDate);
      if (currentYear) this.updateMonthlyChart(currentYear);
    }, EnergyMeterConfig.CHART_INIT_DELAY);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const energyMeter = new SmartEnergyMeter();
  energyMeter.initializeCharts();
});