"""
03_virtual_camera_stream.py — Continuous WebRTC video stream from a virtual camera.

This tutorial shows how to receive a live video feed from a virtual camera
in the browser via WebRTC. The pipe opens automatically when the user
mounts ``<PerspectiveCamera stream={True}/>``; the python server registers
a per-session handler that consumes the inbound aiortc ``MediaStreamTrack``
and writes its frames to an mp4.

Use this for continuous feeds — robotics teleoperation, dataset capture,
live ML pipelines. For one-shot stills see ``02_virtual_camera_snapshot.py``.

Setup::

    pip install 'vuer[webrtc]'

Run::

    python 03_virtual_camera_stream.py

Open the printed URL in a browser. While the page is open, frames are
recorded to ``/tmp/vuer-stream-<session>.mp4``. Close the tab — or Ctrl+C
the server — and the recording is finalized cleanly (mp4 moov atom
written in the ``finally`` block).

Two browsers can connect at the same time — each gets its own
``VuerSession``, its own peer connection, and writes to a separate file.
"""

import asyncio
import math
from fractions import Fraction

import av

from vuer import Vuer, VuerSession
from vuer.schemas import Box, DefaultScene, PerspectiveCamera

app = Vuer()


@app.spawn(start=True)
async def main(sess: VuerSession):
    output_path = f"/tmp/vuer-stream-{sess.CURRENT_WS_ID}.mp4"

    sess.set @ DefaultScene(
        Box(
            key="rotating-box",
            args=[1, 1, 1],
            position=[0, 0.5, 0],
            material=dict(color="#ff8c42", roughness=0.4),
        ),
        PerspectiveCamera(
            key="cam-front",
            position=[3, 2, 5],
            fov=60,
            aspect=16 / 9,
            # Streaming controls — flipping `stream` to False at runtime
            # (e.g. via `sess.update @ PerspectiveCamera(key='cam-front',
            # stream=False)`) tears down the WebRTC connection cleanly.
            # streamSizeH mirrors renderSizeH (preview FBO height); both
            # default to 1024.
            stream=True,
            streamFps=30,
            streamSizeH=1024,
        ),
        up=[0, 1, 0],
    )

    # Background animations: rotate the box AND orbit the camera at 30Hz
    # so the recorded mp4 has visible motion in both the subject and the
    # viewpoint. Drop or comment out for a static scene.
    #
    # `sess.upsert @ Foo(key=..., partial_props)` does a partial merge:
    # only the listed props change, the rest are preserved. So updating
    # the camera's position 30 times a second does NOT touch its `stream`,
    # `streamFps`, or `streamSizeH` props — WebRTC stays connected.
    async def animate_box():
        n = 0
        try:
            while True:
                sess.upsert @ Box(key="rotating-box", rotation=[0, n * 0.05, 0])
                n += 1
                await asyncio.sleep(1 / 30)
        except asyncio.CancelledError:
            pass

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

    # Per-session video track handler. Registered inside @app.spawn so the
    # closure captures `sess` — output paths, encoder state, etc. are all
    # naturally scoped to this client. When the browser disconnects, the
    # track raises MediaStreamError on `recv()`; the try/finally writes
    # the trailing packets and closes the container.
    @sess.on_camera_stream("cam-front")
    async def record(track):
        target_fps = 30
        target_interval = 1.0 / target_fps
        encoder_tb = Fraction(1, target_fps)

        print(f"[cam-front] track received → {output_path}")

        # Fragmented MP4 (fMP4): the muxer flushes a self-contained
        # fragment at every keyframe instead of writing the whole moov
        # index only at close(). If the python script crashes / is
        # killed mid-recording, the file is still playable up to the
        # last completed fragment — at worst we lose ~1 keyframe interval
        # of frames (1 second with `g=30` below).
        container = av.open(
            output_path,
            mode="w",
            options={
                "movflags": "frag_keyframe+empty_moov+default_base_moof",
            },
        )
        # Browser renders at streamSizeH × aspect = 1024 × (16/9) ≈ 1820×1024.
        # Match those dimensions in the encoder; aiortc decodes each inbound
        # frame to av.VideoFrame, which we feed straight into the encoder.
        out_stream = container.add_stream("h264", rate=target_fps)
        out_stream.width = 1820
        out_stream.height = 1024
        out_stream.pix_fmt = "yuv420p"
        # Encoder options:
        #   preset=medium    — better quality than 'ultrafast', still
        #     real-time on modern CPUs at 1080p30.
        #   tune=zerolatency — no B-frame lookahead; each input frame
        #     produces an output packet immediately (paired with fMP4
        #     fragmentation, this is what gives crash-safety).
        #   crf=18 — Constant Rate Factor; 18 is visually lossless.
        #   g=30   — keyframe every 30 frames (1 sec). Smaller GOPs make
        #     fMP4 fragments shorter → less data lost on crash, slightly
        #     bigger files.
        out_stream.options = {
            "preset": "medium",
            "tune": "zerolatency",
            "crf": "18",
            "g": str(target_fps),
        }

        # ── Latest-frame buffer + decoupled writer ─────────────────────
        # The browser's WebRTC encoder doesn't always deliver a clean 30
        # fps — under heavy motion / CPU pressure it drops fps. If we wrote
        # one mp4 frame per arrival (one-to-one), uneven arrivals would
        # produce uneven mp4 timing.
        #
        # Instead: a receiver task overwrites a single `latest_frame` slot
        # as new frames arrive (latest-wins, no queuing). A writer task
        # ticks at exactly 30 Hz wall-clock and encodes whatever is in the
        # slot. Browser delivers slow → writer repeats the previous frame
        # (frame hold). Browser delivers fast → only the newest frame
        # survives until the next tick. mp4 always has 30 fps × wall
        # seconds = correct duration.
        latest_frame = None
        track_alive = True

        async def receive():
            nonlocal latest_frame, track_alive
            try:
                while True:
                    frame = await track.recv()
                    latest_frame = frame  # overwrite — older one drops
            except Exception as e:
                # MediaStreamError when the browser closes the peer connection.
                print(f"[cam-front] track ended: {type(e).__name__}: {e}")
            finally:
                track_alive = False

        receiver_task = asyncio.create_task(receive())

        # Wait for the first frame to arrive before starting the writer
        # clock. Otherwise pts=0 would correspond to "before any video
        # data," and the mp4 would have leading dead time.
        while latest_frame is None and track_alive:
            await asyncio.sleep(0.01)

        try:
            if not track_alive:
                return

            print(
                f"[cam-front] first frame received, writing at {target_fps} fps"
            )
            loop = asyncio.get_running_loop()
            next_deadline = loop.time()
            n = 0
            muxed = 0

            while track_alive:
                # Take a stable reference; receiver may overwrite the
                # slot at any await point.
                frame = latest_frame
                frame.pts = n
                frame.time_base = encoder_tb
                for pkt in out_stream.encode(frame):
                    container.mux(pkt)
                    muxed += 1
                n += 1

                if n % 30 == 0:
                    print(
                        f"[cam-front] {n} frames written, {muxed} packets muxed"
                    )

                # Tick on a wall-clock schedule, not "interval since last
                # iteration." Lets us tolerate the encoder occasionally
                # taking a bit longer without drifting cumulatively.
                next_deadline += target_interval
                sleep_for = next_deadline - loop.time()
                if sleep_for > 0:
                    await asyncio.sleep(sleep_for)
                elif sleep_for < -1.0:
                    # Fell more than 1s behind (machine paused?). Reset
                    # the clock so we don't burst-encode trying to catch up.
                    next_deadline = loop.time()
        finally:
            receiver_task.cancel()
            try:
                for pkt in out_stream.encode():
                    container.mux(pkt)
            except Exception as e:
                print(f"[cam-front] flush warning: {type(e).__name__}: {e}")
            container.close()
            print(f"[cam-front] {output_path} closed cleanly")

    print(f"[main] writing recorded video to {output_path}")
    print("[main] open the URL above in a browser. Ctrl+C to stop.")

    # Keep the spawn task alive while the websocket is connected. When the
    # browser disconnects, Vuer.close_ws cancels this task AND calls
    # sess._cleanup_all_recv() which closes the recv pc — the record()
    # task above wakes up via MediaStreamError and runs its finally block.
    try:
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        box_task.cancel()
        cam_task.cancel()
        print("[main] session ended")
        raise
