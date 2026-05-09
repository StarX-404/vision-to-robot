import json
import os

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google import genai

app = FastAPI(title="Line-Following Robot Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "gemini-3-flash"


@app.post("/api/optimize")
async def optimize_track(image: UploadFile = File(...)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    np_image = np.frombuffer(image_bytes, np.uint8)
    decoded = cv2.imdecode(np_image, cv2.IMREAD_COLOR)
    if decoded is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    gray = cv2.cvtColor(decoded, cv2.COLOR_BGR2GRAY)
    _, thresholded = cv2.threshold(gray, 120, 255, cv2.THRESH_BINARY)
    success, encoded = cv2.imencode(".png", thresholded)
    if not success:
        raise HTTPException(status_code=500, detail="Image preprocessing failed.")

    client = genai.Client(api_key=api_key)

    prompt = (
        "You are analyzing a line-following robot track image. "
        "Identify sections with sharp turns versus long straights, estimate steering aggressiveness needs, "
        "and return ONLY valid JSON with keys: kp, ki, kd, base_speed, explanation. "
        "Use numeric values for kp, ki, kd, base_speed and a short explanation string."
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                prompt,
                {
                    "mime_type": "image/png",
                    "data": encoded.tobytes(),
                },
            ],
        )
        raw_text = response.text.strip()
        parsed = json.loads(raw_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini inference failed: {exc}") from exc

    required = {"kp", "ki", "kd", "base_speed", "explanation"}
    if not required.issubset(parsed):
        raise HTTPException(status_code=500, detail="Model response missing required fields.")

    optimized_code = f'''# Optimized PID constants from Gemini analysis\nKP = {parsed["kp"]}\nKI = {parsed["ki"]}\nKD = {parsed["kd"]}\nBASE_SPEED = {parsed["base_speed"]}\n\n# Example control loop usage\nerror = sensor_center_offset()\nintegral += error\nderivative = error - prev_error\nturn = KP * error + KI * integral + KD * derivative\nleft_motor = BASE_SPEED - turn\nright_motor = BASE_SPEED + turn\nset_motor_speeds(left_motor, right_motor)\nprev_error = error\n'''

    return JSONResponse(
        {
            "kp": parsed["kp"],
            "ki": parsed["ki"],
            "kd": parsed["kd"],
            "base_speed": parsed["base_speed"],
            "explanation": parsed["explanation"],
            "optimized_code": optimized_code,
        }
    )
