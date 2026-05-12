"""
02_virtual_camera_snapshot.py — Server-initiated single-frame capture.

This tutorial shows how to grab a one-shot rendered image from a virtual
camera in the browser. The python server calls ``sess.capture_image(key)``;
the browser re-renders that camera at the requested resolution and ships
back the encoded image bytes (PNG or JPEG).

Use this when you need on-demand stills for ML inference, dataset logging,
or periodic snapshots — *not* a continuous video feed (see
``03_virtual_camera_stream.py`` for that).

Three concurrent asyncio tasks run for the lifetime of each session:
  * `animate_box`    — rotates the box at 30Hz (so successive snapshots differ)
  * `animate_camera` — orbits the camera around the origin at 30Hz
  * the main loop    — calls `await sess.capture_image()` at 10Hz target

They share the event loop cooperatively. Each `await` yields, so none
blocks the others. See the README for the explanation in detail.

The 10Hz capture rate is intentionally aggressive — the loop logs the
actual achieved throughput and average per-capture wall time once per
second so you can see whether the browser keeps up. If the browser is
slow (e.g. heavy scene, low-end GPU), the loop runs at the achievable
rate rather than queuing up.

Setup::

    pip install vuer

Run::

    python 02_virtual_camera_snapshot.py

Open the printed URL in a browser. While the page is open, the server
captures snapshots at ~10Hz and writes them to
``/tmp/vuer-snap-<session>-<n>.jpg``.
"""

import asyncio
import math
import time

from vuer import Vuer, VuerSession
from vuer.schemas import Box, DefaultScene, PerspectiveCamera

app = Vuer()


@app.spawn(start=True)
async def main(sess: VuerSession):
    sess.set @ DefaultScene(
        Box(
            key="box",
            args=[1, 1, 1],
            position=[0, 0.5, 0],
            material=dict(color="#ff8c42", roughness=0.4),
        ),
        # No `stream=True` — we don't open a WebRTC pipe for snapshots.
        # capture_image is RPC-style: each call re-renders the camera at
        # the requested resolution and returns the bytes once.
        PerspectiveCamera(
            key="cam-front",
            position=[3, 2, 5],
            fov=60,
            aspect=16 / 9,
        ),
        up=[0, 1, 0],
    )

    # Rotate the box at 30Hz so snapshots taken seconds apart visibly
    # differ. `sess.upsert @ Box(...)` does a partial merge: only the
    # `rotation` prop changes, the rest of the box is preserved.
    async def animate_box():
        n = 0
        try:
            while True:
                sess.upsert @ Box(key="box", rotation=[0, n * 0.05, 0])
                n += 1
                await asyncio.sleep(1 / 30)
        except asyncio.CancelledError:
            pass

    # Orbit the camera around the origin at 30Hz. Updating only `position`
    # via upsert leaves all other props intact — including any locked
    # streaming props if this scene also had streaming enabled.
    async def animate_camera():
        n = 0
        try:
            while True:
                angle = n * 0.02  # ~360° in ~10 seconds
                x = 5 * math.cos(angle)
                z = 5 * math.sin(angle)
                sess.upsert @ PerspectiveCamera(
                    key="cam-front",
                    position=[x, 2, z],
                )
                n += 1
                await asyncio.sleep(1 / 30)
        except asyncio.CancelledError:
            pass

    box_task = asyncio.create_task(animate_box())
    cam_task = asyncio.create_task(animate_camera())

    # Give the browser a moment to mount the camera before the first
    # capture, so the request doesn't race the React mount.
    await asyncio.sleep(2.0)

    # Target 10 captures per second. Whether we actually hit that rate
    # depends on the browser-side capture cost (FBO render + readback +
    # JPEG encode + websocket round-trip). For 720p JPEG that's typically
    # 30-80 ms per call on a desktop GPU, so 10 Hz is achievable. The
    # per-capture wall-time is logged below so you can see where you land.
    target_interval = 0.1
    print(
        f"[main] capturing at ~10Hz → /tmp/vuer-snap-{sess.CURRENT_WS_ID}-N.jpg"
    )
    print(
        "[main] note: at this rate a 1-min run produces ~600 jpgs."
    )
    print("[main] open the URL above in a browser. Ctrl+C to stop.")

    n = 0
    window_start = time.monotonic()
    window_capture_ms = 0.0
    LOG_EVERY = 10  # one summary line per second at 10Hz

    try:
        while True:
            out_path = f"/tmp/vuer-snap-{sess.CURRENT_WS_ID}-{n:03d}.jpg"
            t0 = time.monotonic()

            # `await` yields to the event loop while we wait for the
            # browser's response — animate_box and animate_camera keep
            # running normally during this window. They don't block each
            # other or this loop.
            try:
                rsp = await sess.capture_image(
                    "cam-front",
                    height=720,
                    format="jpeg",
                    quality=0.90,
                )
            except asyncio.TimeoutError:
                print(f"[snap #{n}] timed out — browser may be unresponsive")
                await asyncio.sleep(target_interval)
                continue

            capture_ms = (time.monotonic() - t0) * 1000.0
            window_capture_ms += capture_ms

            value = rsp.value or {}
            if "error" in value:
                # The browser couldn't fulfill the capture (camera not
                # registered, capture-in-flight, etc.). The await still
                # resolved, so the loop keeps running.
                print(f"[snap #{n}] error: {value['error']}")
            else:
                with open(out_path, "wb") as f:
                    f.write(value["frame"])

            n += 1

            # Summarize every LOG_EVERY captures so 10Hz logging doesn't
            # overwhelm the console. Reports the average per-capture
            # browser cost AND the actual achieved throughput (which may
            # be lower than target if captures take longer than the sleep).
            if n % LOG_EVERY == 0:
                now = time.monotonic()
                wall_elapsed = now - window_start
                avg_capture = window_capture_ms / LOG_EVERY
                actual_rate = LOG_EVERY / wall_elapsed if wall_elapsed > 0 else 0.0
                size_kb = len(value.get("frame", b"")) // 1024
                print(
                    f"[snap @ #{n}] avg capture {avg_capture:6.1f} ms,"
                    f" throughput {actual_rate:5.2f}/s,"
                    f" last frame {size_kb} KB"
                )
                window_start = now
                window_capture_ms = 0.0

            # Rate-limit to target. If `capture_image` itself took longer
            # than target_interval, this sleep is a no-op (negative arg
            # clamped to 0) and we just go as fast as captures allow.
            elapsed = time.monotonic() - t0
            await asyncio.sleep(max(0.0, target_interval - elapsed))
    except asyncio.CancelledError:
        box_task.cancel()
        cam_task.cancel()
        print("[main] session ended")
        raise
