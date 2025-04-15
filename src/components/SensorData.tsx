import React from 'react';
import axios from 'axios';

const SensorData = () => {
  const [sensorData, setSensorData] = React.useState({
    ir1: 0,
    ir2: 0,
    ir3: 0,
    ir4: 0,
    gas: 0,
  });

  React.useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await axios.get('http://192.168.1.10:8000/rover/sensor_data');
        setSensorData(response.data);
      } catch (error: any) {
        console.error("Error fetching sensor data:", error.message);
      }
    };

    // Fetch sensor data every 2 seconds
    const interval = setInterval(fetchSensorData, 2000);
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  return (
    <div className="bg-[#D3FFE9] p-6 rounded-lg">
      <h2 className="text-center text-xl font-semibold mb-4">Sensor Data</h2>
      <div className="space-y-2">
        <p>IR Sensor 1: {sensorData.ir1}</p>
        <p>IR Sensor 2: {sensorData.ir2}</p>
        <p>IR Sensor 3: {sensorData.ir3}</p>
        <p>IR Sensor 4: {sensorData.ir4}</p>
        <p>Gas Sensor: {sensorData.gas}</p>
      </div>
    </div>
  );
};

export default SensorData