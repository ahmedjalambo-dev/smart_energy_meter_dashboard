## Smart Energy Meter (Dashboard)

This repository contains the frontend code for the Smart Energy Meter web dashboard. It's a static HTML/CSS/JS application that connects directly to the Firebase Realtime Database populated by the ESP32 device.

The dashboard provides real-time monitoring, data visualization, and remote control capabilities for the energy meter.

### Simulation

This project can be run directly on Wokwi:
**Dashboard Link:** `https://ahmedjalambo-dev.github.io/smart_energy_meter_dashboard/`


<img width="1327" height="1034" alt="image" src="https://github.com/user-attachments/assets/c621d214-0342-4562-8b8f-9e8b65433153" />


### ⚡ Features

  * **Real-time Metrics:** Displays the latest Current (A), Power (W), Energy (kWh), and estimated Bill (in ₪) by listening for live data updates from Firebase.
  * **System Control:** Allows the user to remotely connect or disconnect the load by toggling a button. This writes to the `/LoadControl/isEnabled` path in Firebase, which the ESP32 is listening to.
  * **Live Alerts:** Shows a list of active alerts (e.g., "Current exceeded safe limit\!") as they are pushed from the device.
  * **Data Visualization (Chart.js):**
      * **Daily Consumption:** A bar chart showing the total energy consumed per hour for any selected date.
      * **Monthly Bill:** A line chart showing the total calculated bill for each month of a selected year.
  * **Calculations:**
      * The dashboard dynamically calculates total energy consumption and bills by processing the historical data from Firebase.
      * A tariff rate (`TARIFF_RATE = 0.5 ₪ per kWh`) is defined in `script.js` to calculate the bill.

### 🚀 How to Run

1.  Clone this repository.
2.  Open the `index.html` file in any modern web browser.
      * No local server is *required* as it's a static site, but it's good practice.
3.  The dashboard will automatically connect to the Firebase database specified in `script.js` and display data as long as the ESP32 device is running and pushing data.

### 🔧 Configuration

The Firebase project credentials are hardcoded in `script.js`. This must match the configuration used in the ESP32 firmware.

```javascript
// From script.js
class EnergyMeterConfig {
  static FIREBASE_CONFIG = {
    apiKey: "AIzaSyDrSS7eDfPxqKrNkx5s8mr4X6T5ZQRELWk",
    databaseURL: "https://smart-energy-meter-73045-default-rtdb.europe-west1.firebasedatabase.app/"
  };
  
  static TARIFF_RATE = 0.5; // ILS per kWh
  // ...
}
```
