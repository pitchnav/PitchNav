# Pitch Nav automatic velocity worker

This Modal worker runs FFprobe and OpenCV outside the browser. It automatically:

1. reads video metadata and the saved trim range;
2. verifies 120 or 240 FPS eligibility;
3. detects the printable 8-inch Pitch Nav marker;
4. searches for one physically plausible high-speed baseball trajectory;
5. returns a video-estimated range or `unavailable`;
6. stores results through the authenticated website callback.

It intentionally refuses to guess. The estimate is not radar verified, laboratory-grade, medical, or suitable for injury-risk decisions. Benchmark it against a large radar-labeled test set before selling it as a validated feature.

## Deploy

```bash
python3 -m pip install -r requirements.txt
python3 -m modal setup
modal secret create pitch-nav-video-worker VIDEO_WORKER_SECRET="YOUR_LONG_RANDOM_SECRET"
modal deploy modal_app.py
```

Copy the deployed `enqueue` URL into Vercel as `VIDEO_WORKER_URL`. Put the same random secret into Vercel as `VIDEO_WORKER_SECRET`, then set `AUTO_VELOCITY_ENABLED=true`.
