from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
import cv2
import numpy as np
import requests
import mediapipe as mp
import threading
import time

app = FastAPI()

# Global variables
human_detected = False
frame = None  # To store the latest frame

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose()

# ThinkV API constants for control
CONTROL_API_KEY = "fac56c13-e4a4-4e49-a892-d012650719a6"
CONTROL_CHANNEL_ID = "953778df-9a6a-4d1d-9eab-cfda344196b4"
THINKV_CONTROL_URL = "https://api.thinkv.space/update"

# URL of the ngrok stream
NGROK_VIDEO_URL = "http://192.168.178.238:8000/video_feed"

def update_dashboard(person_detected):
    """
    Update the ThinkV dashboard with the current human detection status (using GET request).
    """
    try:
        url = (
            f"{THINKV_CONTROL_URL}"
            f"?channel_id={CONTROL_CHANNEL_ID}"
            f"&api_key={CONTROL_API_KEY}"
            f"&field2={person_detected}"
        )
        response = requests.get(url)
        response.raise_for_status()
        print(f"[Sensor Push] Status: {response.status_code}, Detected: {person_detected}")
    except requests.RequestException as e:
        print(f"[Sensor Push] Error: {e}")

def camera_loop():
    global human_detected, frame
    while True:
        try:
            response = requests.get(NGROK_VIDEO_URL, stream=True, timeout=5)

            if not response.ok:
                print("Error: Could not access video feed from ngrok.")
                time.sleep(1)
                continue

            bytes_data = b""
            for chunk in response.iter_content(chunk_size=1024):
                bytes_data += chunk
                a = bytes_data.find(b"\xff\xd8")  # Start of JPEG
                b = bytes_data.find(b"\xff\xd9")  # End of JPEG

                if a != -1 and b != -1:
                    jpg_data = bytes_data[a:b + 2]
                    bytes_data = bytes_data[b + 2:]

                    img_np = np.frombuffer(jpg_data, dtype=np.uint8)
                    frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

                    # Process frame for human detection
                    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = pose.process(img_rgb)

                    # Detect if any pose landmarks are found
                    detected = results.pose_landmarks is not None

                    # Only update ThinkV if the detection status has changed
                    if detected != human_detected:
                        human_detected = detected
                        update_dashboard(1 if human_detected else 0)

                    # Draw pose landmarks on the frame if detected
                    if results.pose_landmarks:
                        mp_drawing.draw_landmarks(
                            frame,
                            results.pose_landmarks,
                            mp_pose.POSE_CONNECTIONS,
                            mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                            mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2)
                        )

            time.sleep(0.03)  # To roughly match 30 FPS

        except Exception as e:
            print(f"Camera loop error: {e}")
            time.sleep(1)  # Small wait before retry if error occurs

def generate_frames():
    global frame
    while True:
        if frame is None:
            continue

        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.on_event("startup")
def startup_event():
    threading.Thread(target=camera_loop, daemon=True).start()

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/detect_human/")
def detect_human():
    return JSONResponse(content={"human_detected": human_detected})
