import { useEffect, useState } from 'react';
import { Joystick } from 'react-joystick-component';
import './App.css';

type JoystickEvent = {
  x: number | null;
  y: number | null;
  direction: string | null;
  distance: number | null;
};

const App = () => {
  const [sensorData, setSensorData] = useState({
    ir_sensors: {},
    gas_sensor: null,
    dht_sensor: { temperature: null, humidity: null },
  });

  const [joystickSize, setJoystickSize] = useState(150);

  // Fetch sensor data every 2 seconds with validation
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        // Update HTTP endpoint to Raspberry Pi's IP and port
        const response = await fetch('http://192.168.219.238:8000/rover/sensor_data'); // Replace with your Raspberry Pi's IP and HTTP endpoint
        const data = await response.json();

        // Validate the data structure
        if (
          typeof data === 'object' &&
          data.ir_sensors &&
          typeof data.gas_sensor !== 'undefined' &&
          data.dht_sensor &&
          typeof data.dht_sensor.temperature !== 'undefined' &&
          typeof data.dht_sensor.humidity !== 'undefined'
        ) {
          setSensorData(data);
        } else {
          console.error('Invalid sensor data received:', data);
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 2000); // Update every 2 seconds
    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  // Handle joystick movement and send direction via HTTP POST request
  const handleJoystickMove = async (event: JoystickEvent) => {
    const { x, y } = event;
    if (x === null || y === null) return;

    const angle = Math.atan2(y, x) * (180 / Math.PI);
    await sendDirectionToRaspberryPi(angle);
  };

  // Send direction to Raspberry Pi via HTTP POST request
  const sendDirectionToRaspberryPi = async (angle: number | 'stop') => {
    let direction: string;

    if (angle === 'stop') {
      direction = 'stop';
    } else {
      if (angle > -45 && angle <= 45) direction = 'right';
      else if (angle > 45 && angle <= 135) direction = 'forward';
      else if (angle > 135 || angle <= -135) direction = 'left';
      else if (angle > -135 && angle <= -45) direction = 'backward';
      else direction = 'stop';
    }

    console.log(`Sending direction to Raspberry Pi: ${direction}`);

    try {
      // Send direction as an HTTP POST request
      await fetch('http://192.168.219.238:8000/rover/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      });
    } catch (error) {
      console.error('Error sending direction to Raspberry Pi:', error);
    }
  };

  // Dynamically adjust joystick size based on screen width
  useEffect(() => {
    const updateJoystickSize = () => {
      const newSize = window.innerWidth < 768 ? 100 : 150;
      setJoystickSize(newSize);
    };

    updateJoystickSize();
    window.addEventListener('resize', updateJoystickSize);

    return () => {
      window.removeEventListener('resize', updateJoystickSize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 py-4 shadow-md">
        <h1 className="text-3xl font-bold text-center">🚀 Rescue Twin Control Interface</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 grid gap-8 lg:grid-cols-5">
        {/* Video Feed (Spanning 3 Rows and 3 Columns) */}
        <div className="bg-black border border-gray-600 overflow-hidden rounded-lg shadow-lg row-span-3 col-span-3 aspect-[4/3] relative">
          <iframe
            title="Live Video Stream"
            src="http://192.168.219.238:8000/video_feed" // Update video feed URL to Raspberry Pi's IP
            width="100%"
            height="100%"
            className="rounded-lg absolute inset-0"
          >
            <p>Your browser does not support iframes.</p>
          </iframe>
          <div className="absolute inset-0 bg-gray-900 text-white text-center p-4 hidden">
            <p>Video feed unavailable. Please check your connection.</p>
          </div>
        </div>

        {/* Joystick Control */}
        <div className="bg-gray-800 rounded-lg p-6 text-center shadow-lg transition hover:shadow-xl flex items-center justify-center col-span-2">
          <div className='flex flex-col items-center'>
            <h2 className="text-xl font-semibold mb-4">🎮 Joystick Control</h2>
            <Joystick
              size={joystickSize}
              sticky={false}
              move={handleJoystickMove}
              stop={() => sendDirectionToRaspberryPi('stop')}
            />
          </div>
        </div>

        {/* Sensor Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 col-span-2">
          {[
            {
              title: `🌡️ Temperature: ${sensorData.dht_sensor.temperature ?? 'N/A'}°C`,
              color: 'bg-yellow-100',
            },
            {
              title: `💧 Humidity: ${sensorData.dht_sensor.humidity ?? 'N/A'}%`,
              color: 'bg-blue-100',
            },
            {
              title: `🪞 Gas Sensor:         ${
                sensorData.gas_sensor ? 'Detected' : '\Not Detected'
              }`,
              color: 'bg-red-100',
            },
            {
              title: (
                <>
                  🔦 IR Readings:
                  <ul className="text-left pl-4 mt-1 list-disc list-inside">
                    {Object.entries(sensorData.ir_sensors).map(([key, value]) => (
                      <li key={key}>
                        {key}: {String(value)}
                      </li>
                    ))}
                  </ul>
                </>
              ),
              color: 'bg-green-100',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`${item.color} text-black p-6 rounded-lg shadow-md text-center font-medium transition hover:shadow-lg flex items-center justify-center`}
            >
              {item.title}
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-4 text-center text-gray-400">
        © 2025 Rescue Twin
      </footer>
    </div>
  );
};

export default App;