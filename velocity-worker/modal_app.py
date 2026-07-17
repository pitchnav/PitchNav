"""Pitch Nav automatic video-estimated velocity worker.

This is a conservative single-camera estimator, not radar and not laboratory
biomechanics. It returns `unavailable` instead of guessing whenever frame rate,
marker detection, or ball tracking does not pass strict checks.
"""

from __future__ import annotations

import json
import math
import os
import subprocess
import tempfile
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path
from typing import Any

import modal

IMAGE = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .uv_pip_install(
        "fastapi[standard]==0.135.2",
        "numpy==2.4.3",
        "opencv-python-headless==4.13.0.92",
        "requests==2.32.5",
    )
)

# Imports inside this context are resolved from the Modal container image while
# still providing FastAPI with the concrete Request annotation it needs.
with IMAGE.imports():
    from fastapi import HTTPException, Request

app = modal.App(
    "pitch-nav-automatic-velocity",
    image=IMAGE,
    secrets=[modal.Secret.from_name("pitch-nav-video-worker")],
)

# The same payload is embedded in public/velocity-calibration-marker.svg.
MARKER_PAYLOAD = [
    [1, 0, 1, 1, 0, 0, 1, 0],
    [0, 1, 0, 0, 1, 1, 0, 1],
    [1, 1, 0, 1, 0, 1, 0, 0],
    [0, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 1, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 0, 1, 0, 1, 1, 0, 1],
    [0, 1, 0, 1, 0, 0, 1, 1],
]


def callback(payload: dict[str, Any], status: str, **fields: Any) -> None:
    import requests

    requests.post(
        payload["callback_url"],
        json={"job_id": payload["job_id"], "status": status, **fields},
        headers={"Authorization": f"Bearer {os.environ['VIDEO_WORKER_SECRET']}"},
        timeout=30,
    ).raise_for_status()


def parse_rate(value: str | None) -> float | None:
    if not value or value in {"0/0", "N/A"}:
        return None
    try:
        return float(Fraction(value))
    except (ValueError, ZeroDivisionError):
        return None


def probe_video(path: Path) -> dict[str, Any]:
    command = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries",
        "stream=width,height,avg_frame_rate,r_frame_rate,nb_frames,duration:format=duration",
        "-of", "json", str(path),
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    stream = (data.get("streams") or [{}])[0]
    duration = stream.get("duration") or (data.get("format") or {}).get("duration")
    return {
        "width": int(stream.get("width") or 0),
        "height": int(stream.get("height") or 0),
        "avg_fps": parse_rate(stream.get("avg_frame_rate")),
        "nominal_fps": parse_rate(stream.get("r_frame_rate")),
        "duration": float(duration or 0),
        "nb_frames": int(stream["nb_frames"]) if str(stream.get("nb_frames", "")).isdigit() else None,
    }


def ordered_quad(points: Any) -> Any:
    import numpy as np

    pts = np.asarray(points, dtype=np.float32).reshape(4, 2)
    sums = pts.sum(axis=1)
    diffs = np.diff(pts, axis=1).reshape(-1)
    return np.array([
        pts[np.argmin(sums)],
        pts[np.argmin(diffs)],
        pts[np.argmax(sums)],
        pts[np.argmax(diffs)],
    ], dtype=np.float32)


def rotated_payloads() -> list[Any]:
    import numpy as np

    base = np.asarray(MARKER_PAYLOAD, dtype=np.uint8)
    return [np.rot90(base, k) for k in range(4)]


def detect_marker(gray: Any) -> dict[str, Any] | None:
    import cv2
    import numpy as np

    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    height, width = gray.shape[:2]
    min_area = max(600.0, width * height * 0.0004)
    targets = rotated_payloads()
    best: dict[str, Any] | None = None

    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:80]:
        area = cv2.contourArea(contour)
        if area < min_area or area > width * height * 0.35:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.025 * perimeter, True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue

        source = ordered_quad(approx.reshape(4, 2))
        side_lengths = [
            float(np.linalg.norm(source[(index + 1) % 4] - source[index]))
            for index in range(4)
        ]
        mean_side = float(np.mean(side_lengths))
        if mean_side < 28 or max(side_lengths) / max(min(side_lengths), 1) > 1.8:
            continue

        destination = np.array([[0, 0], [499, 0], [499, 499], [0, 499]], dtype=np.float32)
        matrix = cv2.getPerspectiveTransform(source, destination)
        warped = cv2.warpPerspective(gray, matrix, (500, 500))
        bits = np.zeros((10, 10), dtype=np.uint8)
        for row in range(10):
            for col in range(10):
                cell = warped[row * 50 + 10: (row + 1) * 50 - 10, col * 50 + 10: (col + 1) * 50 - 10]
                bits[row, col] = 1 if float(cell.mean()) < 128 else 0

        border = np.concatenate([bits[0, :], bits[-1, :], bits[1:-1, 0], bits[1:-1, -1]])
        border_score = float(border.mean())
        payload_bits = bits[1:9, 1:9]
        mismatch = min(float(np.mean(payload_bits != target)) for target in targets)
        score = border_score * 0.55 + (1.0 - mismatch) * 0.45
        if border_score >= 0.86 and mismatch <= 0.16 and (best is None or score > best["score"]):
            best = {
                "score": score,
                "side_px": mean_side,
                "center": source.mean(axis=0).tolist(),
                "corners": source.tolist(),
                "perspective_ratio": max(side_lengths) / max(min(side_lengths), 1),
            }
    return best


@dataclass
class Candidate:
    frame: int
    x: float
    y: float
    score: float
    area: float


@dataclass
class Track:
    points: list[Candidate]


def ball_candidates(previous: Any, current: Any, marker_side_px: float, marker_center: tuple[float, float]) -> list[Candidate]:
    import cv2
    import numpy as np

    previous_gray = cv2.cvtColor(previous, cv2.COLOR_BGR2GRAY)
    current_gray = cv2.cvtColor(current, cv2.COLOR_BGR2GRAY)
    difference = cv2.absdiff(previous_gray, current_gray)
    _, moving = cv2.threshold(difference, 22, 255, cv2.THRESH_BINARY)
    moving = cv2.morphologyEx(moving, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    moving = cv2.dilate(moving, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(moving, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    expected_diameter = max(3.0, marker_side_px * (2.9 / 8.0))
    expected_area = math.pi * (expected_diameter / 2.0) ** 2
    output: list[Candidate] = []
    for contour in contours:
        area = float(cv2.contourArea(contour))
        if area < max(2.0, expected_area * 0.05) or area > expected_area * 5.5:
            continue
        x, y, width, height = cv2.boundingRect(contour)
        center_x = x + width / 2.0
        center_y = y + height / 2.0
        if math.dist((center_x, center_y), marker_center) < marker_side_px * 0.85:
            continue
        patch = current_gray[max(0, y): y + height, max(0, x): x + width]
        brightness = float(patch.mean()) if patch.size else 0.0
        if brightness < 105:
            continue
        perimeter = cv2.arcLength(contour, True)
        circularity = 4 * math.pi * area / max(perimeter * perimeter, 1.0)
        area_fit = math.exp(-abs(math.log(max(area, 1) / max(expected_area, 1))))
        score = min(1.0, brightness / 230.0) * 0.45 + min(1.0, circularity) * 0.25 + area_fit * 0.30
        output.append(Candidate(-1, center_x, center_y, score, area))
    return sorted(output, key=lambda item: item.score, reverse=True)[:18]


def track_ball(frames: list[Any], marker_side_px: float, marker_center: tuple[float, float], fps: float) -> tuple[Track | None, dict[str, Any]]:
    px_per_foot = marker_side_px / (8.0 / 12.0)
    min_step = 28.0 / 0.681818 / fps * px_per_foot
    max_step = 125.0 / 0.681818 / fps * px_per_foot
    tracks: list[Track] = []

    for frame_index in range(1, len(frames)):
        candidates = ball_candidates(frames[frame_index - 1], frames[frame_index], marker_side_px, marker_center)
        for candidate in candidates:
            candidate.frame = frame_index
            best_track: Track | None = None
            best_cost = float("inf")
            for track in tracks:
                last = track.points[-1]
                if frame_index - last.frame > 2:
                    continue
                distance = math.dist((candidate.x, candidate.y), (last.x, last.y))
                gap = frame_index - last.frame
                if distance < min_step * gap * 0.35 or distance > max_step * gap * 1.35:
                    continue
                cost = distance / gap - (candidate.score * 5)
                if len(track.points) >= 2:
                    prior = track.points[-2]
                    prior_dx = last.x - prior.x
                    prior_dy = last.y - prior.y
                    current_dx = (candidate.x - last.x) / gap
                    current_dy = (candidate.y - last.y) / gap
                    prior_norm = math.hypot(prior_dx, prior_dy)
                    current_norm = math.hypot(current_dx, current_dy)
                    if prior_norm and current_norm:
                        cosine = (prior_dx * current_dx + prior_dy * current_dy) / (prior_norm * current_norm)
                        if cosine < 0.72:
                            continue
                        cost += (1.0 - cosine) * max_step
                if cost < best_cost:
                    best_cost = cost
                    best_track = track
            if best_track is None:
                tracks.append(Track([candidate]))
            else:
                best_track.points.append(candidate)

    evaluated: list[tuple[float, Track, list[float]]] = []
    for track in tracks:
        if len(track.points) < 3:
            continue
        speeds: list[float] = []
        dx_total = track.points[-1].x - track.points[0].x
        dy_total = track.points[-1].y - track.points[0].y
        horizontal_ratio = abs(dx_total) / max(math.hypot(dx_total, dy_total), 1.0)
        if horizontal_ratio < 0.52:
            continue
        for first, second in zip(track.points, track.points[1:]):
            frame_gap = second.frame - first.frame
            feet_per_second = (math.dist((first.x, first.y), (second.x, second.y)) / px_per_foot) * fps / frame_gap
            speeds.append(feet_per_second * 0.681818)
        median = sorted(speeds)[len(speeds) // 2]
        if not 35 <= median <= 110:
            continue
        mean = sum(speeds) / len(speeds)
        variation = (sum((speed - mean) ** 2 for speed in speeds) / len(speeds)) ** 0.5 / max(mean, 1)
        if variation > 0.52:
            continue
        score = len(track.points) * 2.0 + sum(point.score for point in track.points) - variation * 7 + horizontal_ratio * 3
        evaluated.append((score, track, speeds))

    if not evaluated:
        return None, {"candidate_tracks": len(tracks), "qualified_tracks": 0}
    evaluated.sort(key=lambda item: item[0], reverse=True)
    score, best, speeds = evaluated[0]
    return best, {
        "candidate_tracks": len(tracks),
        "qualified_tracks": len(evaluated),
        "selected_track_score": round(score, 3),
        "step_speeds_mph": [round(value, 2) for value in speeds],
    }


def result_unavailable(payload: dict[str, Any], metadata: dict[str, Any], reason: str, **extra: Any) -> dict[str, Any]:
    fields = {
        "detected_playback_fps": metadata.get("avg_fps"),
        "declared_capture_fps": payload.get("declared_capture_fps"),
        "effective_capture_fps": extra.pop("effective_capture_fps", None),
        "width": metadata.get("width"),
        "height": metadata.get("height"),
        "duration_secs": metadata.get("duration"),
        "trim_start_secs": payload.get("trim_start_secs", 0),
        "trim_end_secs": payload.get("trim_end_secs"),
        "calibration_detected": extra.pop("calibration_detected", False),
        "calibration_method": extra.pop("calibration_method", None),
        "ball_track_frames": extra.pop("ball_track_frames", 0),
        "confidence": "Unavailable",
        "rejection_reason": reason,
        "diagnostics": extra,
    }
    callback(payload, "unavailable", **fields)
    return {"status": "unavailable", "reason": reason}


@app.function(timeout=15 * 60, retries=1, max_containers=10)
def process_velocity(payload: dict[str, Any]) -> dict[str, Any]:
    import cv2
    import numpy as np
    import requests

    callback(payload, "processing")
    with tempfile.TemporaryDirectory() as temporary:
        source = Path(temporary) / "source-video"
        with requests.get(payload["source_url"], stream=True, timeout=60) as response:
            response.raise_for_status()
            with source.open("wb") as handle:
                for chunk in response.iter_content(1024 * 1024):
                    handle.write(chunk)

        metadata = probe_video(source)
        declared = payload.get("declared_capture_fps")
        detected = metadata.get("avg_fps")
        effective_fps = float(declared) if declared in (120, 240) else (float(detected) if detected and detected >= 100 else None)
        if effective_fps is None or effective_fps < 100:
            return result_unavailable(
                payload, metadata,
                "Capture frame rate could not be verified at 120 or 240 FPS. Normal-speed or 60 FPS video is mechanics-only.",
                effective_capture_fps=effective_fps,
                fps_metadata_conflict=bool(declared and detected and abs(float(declared) - float(detected)) > 10),
            )

        capture = cv2.VideoCapture(str(source))
        if not capture.isOpened():
            return result_unavailable(payload, metadata, "The worker could not decode this video.", effective_capture_fps=effective_fps)

        start = max(0.0, float(payload.get("trim_start_secs") or 0.0))
        end = payload.get("trim_end_secs")
        end = float(end) if end is not None else float(metadata.get("duration") or 0)
        if end <= start:
            capture.release()
            return result_unavailable(payload, metadata, "The saved trim range is invalid.", effective_capture_fps=effective_fps)

        capture.set(cv2.CAP_PROP_POS_MSEC, start * 1000)
        frames: list[Any] = []
        max_frames = min(1800, int((end - start) * effective_fps) + 2)
        while len(frames) < max_frames:
            ok, frame = capture.read()
            if not ok:
                break
            timestamp = float(capture.get(cv2.CAP_PROP_POS_MSEC)) / 1000.0
            if timestamp > end + 0.02:
                break
            frames.append(frame)
        capture.release()
        if len(frames) < 8:
            return result_unavailable(payload, metadata, "Too few decodable frames were found inside the trim range.", effective_capture_fps=effective_fps)

        marker_detections: list[dict[str, Any]] = []
        marker_stride = max(1, len(frames) // 40)
        for frame in frames[::marker_stride]:
            marker = detect_marker(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
            if marker:
                marker_detections.append(marker)
        if len(marker_detections) < 3:
            return result_unavailable(
                payload, metadata,
                "The 8-inch Pitch Nav calibration marker was not visible clearly enough throughout the delivery.",
                effective_capture_fps=effective_fps,
                marker_detection_count=len(marker_detections),
            )

        side_values = sorted(float(item["side_px"]) for item in marker_detections)
        side_px = side_values[len(side_values) // 2]
        centers = np.asarray([item["center"] for item in marker_detections], dtype=float)
        marker_center = tuple(np.median(centers, axis=0).tolist())
        side_mean = sum(side_values) / len(side_values)
        side_cv = (sum((value - side_mean) ** 2 for value in side_values) / len(side_values)) ** 0.5 / max(side_mean, 1)
        if side_cv > 0.20:
            return result_unavailable(
                payload, metadata,
                "Calibration scale changed too much during the clip; keep the camera and marker stationary.",
                effective_capture_fps=effective_fps,
                calibration_detected=True,
                calibration_method="Pitch Nav 8-inch planar marker",
                marker_scale_variation=side_cv,
            )

        track, tracking = track_ball(frames, side_px, marker_center, effective_fps)
        if track is None:
            return result_unavailable(
                payload, metadata,
                "A unique baseball path could not be separated from body motion. Staff can use radar evidence or request a clearer clip.",
                effective_capture_fps=effective_fps,
                calibration_detected=True,
                calibration_method="Pitch Nav 8-inch planar marker",
                marker_detection_count=len(marker_detections),
                marker_scale_variation=round(side_cv, 4),
                **tracking,
            )

        speeds = tracking["step_speeds_mph"]
        center = float(np.median(np.asarray(speeds, dtype=float)))
        uncertainty = 0.10 if effective_fps >= 200 and len(track.points) >= 5 and side_cv < 0.08 else 0.17
        low = max(0.0, center * (1.0 - uncertainty))
        high = center * (1.0 + uncertainty)
        confidence = "Moderate" if uncertainty <= 0.10 else "Low"
        px_per_foot = side_px / (float(payload.get("calibration_marker_size_inches") or 8.0) / 12.0)
        diagnostics = {
            **tracking,
            "marker_detection_count": len(marker_detections),
            "marker_side_px_median": round(side_px, 3),
            "marker_scale_variation": round(side_cv, 4),
            "selected_track": [[point.frame, round(point.x, 2), round(point.y, 2)] for point in track.points],
            "uncertainty_fraction": uncertainty,
            "validation_state": "prototype_requires_radar_benchmarking",
            "assumptions": [
                "The marker and baseball path are in approximately the same image plane.",
                "The declared capture frame rate is correct.",
                "The selected moving object is the baseball and not a body landmark or background object.",
                "Single-camera projection measures only visible 2D displacement.",
            ],
        }
        callback(
            payload, "completed",
            detected_playback_fps=detected,
            declared_capture_fps=declared,
            effective_capture_fps=effective_fps,
            width=metadata.get("width"),
            height=metadata.get("height"),
            duration_secs=metadata.get("duration"),
            trim_start_secs=start,
            trim_end_secs=end,
            calibration_detected=True,
            calibration_method="Pitch Nav 8-inch planar marker",
            calibration_scale_px_per_foot=px_per_foot,
            ball_track_frames=len(track.points),
            estimate_low_mph=round(low, 2),
            estimate_high_mph=round(high, 2),
            estimate_center_mph=round(center, 2),
            confidence=confidence,
            rejection_reason=None,
            diagnostics=diagnostics,
        )
        return {"status": "completed", "estimate_low_mph": low, "estimate_high_mph": high, "confidence": confidence}


@app.function(timeout=60)
@modal.fastapi_endpoint(method="POST", docs=True)
async def enqueue(request: Request) -> dict[str, str]:
    authorization = request.headers.get("authorization")
    expected = os.environ.get("VIDEO_WORKER_SECRET")
    if not expected or authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = await request.json()
    required = {"job_id", "source_url", "callback_url"}
    if not required.issubset(payload):
        raise HTTPException(status_code=400, detail="Missing required fields")
    call = await process_velocity.spawn.aio(payload)
    return {"call_id": call.object_id}
