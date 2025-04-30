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
    ir_sensors: {} as Record<string, number>,
    gas_sensor: null as boolean | null,
    dht_sensor: { temperature: null, humidity: null },
  });

  const [joystickSize, setJoystickSize] = useState(150);
  const [motorSpeed, setMotorSpeed] = useState<number>(0); // State for motor speed

  // Fetch sensor data from ThinkV API every 2 seconds
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch('https://api.thinkv.space/channels/862d2b4e-c312-4d1c-9425-0c4f40f993b2?api_key=d16b3f1d-580e-42fb-84fd-2acc35f64ca0');
        const data = await response.json();

        if (
          typeof data === 'object' &&
          data.fields &&
          typeof data.fields['1']?.value !== 'undefined' &&
          typeof data.fields['2']?.value !== 'undefined' &&
          typeof data.fields['3']?.value !== 'undefined'
        ) {
          setSensorData({
            ir_sensors: {
              ir_1: data.fields['4']?.value ?? 0,
              ir_2: data.fields['5']?.value ?? 0,
              ir_3: data.fields['6']?.value ?? 0,
              ir_4: data.fields['7']?.value ?? 0,
            },
            gas_sensor: data.fields['3']?.value === 1,
            dht_sensor: {
              temperature: data.fields['1']?.value ?? null,
              humidity: data.fields['2']?.value ?? null,
            },
          });
        } else {
          console.error('Invalid sensor data received:', data);
        }
      } catch (error) {
        console.error('Error fetching sensor data from ThinkV:', error);
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle joystick movement
  const handleJoystickMove = async (event: JoystickEvent) => {
    const { x, y } = event;
    if (x === null || y === null) return;

    const angle = Math.atan2(y, x) * (180 / Math.PI);
    await sendDirection(angle);
  };

  // Send direction to both ThinkV and Raspberry Pi
  const sendDirection = async (input: number | 'stop' | 'forward' | 'backward' | 'left' | 'right') => {
    let direction: string;

    if (typeof input === 'string') {
      direction = input;
    } else {
      const angle = input;
      if (angle > -45 && angle <= 45) direction = 'right';
      else if (angle > 45 && angle <= 135) direction = 'forward';
      else if (angle > 135 || angle <= -135) direction = 'left';
      else if (angle > -135 && angle <= -45) direction = 'backward';
      else direction = 'stop';
    }

    const directionMap: Record<string, number> = {
      stop: 0,
      forward: 1,
      backward: 2,
      left: 3,
      right: 4,
    };
    const valueToSend = directionMap[direction] ?? 0;
    console.log(`Sending motorControl: ${direction} (${valueToSend})`);

    try {
      // Send to ThinkV API
      const thinkvUrl = `https://api.thinkv.space/update?channel_id=953778df-9a6a-4d1d-9eab-cfda344196b4&api_key=fac56c13-e4a4-4e49-a892-d012650719a6&field1=${valueToSend}`;
      await fetch(thinkvUrl, { method: 'GET' });

      // Send to Raspberry Pi (FastAPI server)
      const raspiUrl = `http://192.168.178.238:8000/control?command=${valueToSend}`;
      await fetch(raspiUrl, { method: 'GET' });

    } catch (error) {
      console.error('Error sending motor control:', error);
    }
  };

  // Handle motor speed slider change
  const handleSpeedChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = Number(event.target.value);
    setMotorSpeed(newSpeed);

    await fetch(`http://192.168.178.238:8000/set_speed?speed=${newSpeed}`);
  };

  // Dynamically adjust joystick size
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
      <header className="bg-gray-800 py-4 shadow-md">
        <h1 className="text-3xl font-bold text-center">🚀 Rescue Twin Control Interface</h1>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 grid gap-8 lg:grid-cols-5">
        <div className="bg-black border border-gray-600 overflow-hidden rounded-lg shadow-lg row-span-3 col-span-3 aspect-[4/3] relative">
          <iframe
            title="Live Video Stream"
            src="http://192.168.178.238:8000/video_feed"
            width="100%"
            height="100%"
            className="rounded-lg absolute inset-0"
          >
            <p>Your browser does not support iframes.</p>
          </iframe>
        </div>

        {/* Joystick and Controls */}
        <div className="bg-gray-800 rounded-lg p-6 text-center shadow-lg transition hover:shadow-xl flex flex-col items-center justify-center col-span-2 space-y-6">
          <h2 className="text-xl font-semibold mb-4">🎮 Joystick Control</h2>

          <Joystick
            size={joystickSize}
            sticky={false}
            move={handleJoystickMove}
            stop={() => sendDirection('stop')}
          />

          {/* Manual Direction Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div></div>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              onClick={() => sendDirection('forward')}
            >
              ↑
            </button>
            <div></div>

            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              onClick={() => sendDirection('left')}
            >
              ←
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              onClick={() => sendDirection('stop')}
            >
              ■
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              onClick={() => sendDirection('right')}
            >
              →
            </button>

            <div></div>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              onClick={() => sendDirection('backward')}
            >
              ↓
            </button>
            <div></div>
          </div>

          {/* Motor Speed Slider */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold">⚡ Motor Speed: {motorSpeed}%</h3>
            <input
              type="range"
              min="0"
              max="100"
              value={motorSpeed}
              onChange={handleSpeedChange}
              className="w-full"
            />
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 py-4 text-center text-gray-400">
        © 2025 Rescue Twin
      </footer>
    </div>
  );
};

export default App;
