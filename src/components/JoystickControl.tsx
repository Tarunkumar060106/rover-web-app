import axios from 'axios';
import { Joystick } from 'react-joystick-component';

// Define the custom type for joystick events
type JoystickEvent = {
  x: number | null; // Horizontal position (-1 to 1)
  y: number | null; // Vertical position (-1 to 1)
  direction: string | null; // Direction of movement (e.g., "FORWARD", "RIGHT")
  distance: number | null; // Distance from the center (0 to 1)
};

const JoystickControl = () => {
  // Handle joystick movement
  const handleJoystickMove = (event: JoystickEvent) => {
    const { x, y } = event;
    if (x === null || y === null) return; // Exit if x or y is null

    // Calculate the angle of the joystick movement
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    sendDirectionToBackend(angle);
  };

  // Send direction command to the backend
  const sendDirectionToBackend = async (angle: number | "stop") => {
    try {
      let direction: string;

      if (angle === "stop") {
        direction = "stop";
      } else {
        if (angle > -45 && angle <= 45) direction = "right";
        else if (angle > 45 && angle <= 135) direction = "forward";
        else if (angle > 135 || angle <= -135) direction = "left";
        else if (angle > -135 && angle <= -45) direction = "backward";
        else direction = "stop"; // Default to stop if angle doesn't match any condition
      }

      console.log(`Sending direction: ${direction}`); // Debugging log
      await axios.post('http://192.168.1.10:8000/rover/control', {
        direction: direction,
      });
    } catch (error: any) {
      console.error("Error sending direction to backend:", error.message);
    }
  };

  return (
    <div className="bg-[#D3FFE9] p-6 rounded-lg">
      <h2 className="text-center text-xl font-semibold mb-4">Joystick Control</h2>
      <div className="flex justify-center">
        <Joystick
          size={200}
          sticky={false}
          move={handleJoystickMove} // Triggered when joystick moves
          stop={() => sendDirectionToBackend("stop")} // Triggered when joystick stops
        />
      </div>
    </div>
  );
};

export default JoystickControl;