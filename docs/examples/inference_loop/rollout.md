
# Closed-Loop VLA Rollout in a Gaussian-Splat Scene

Drive a **vision-language navigation policy** (OmniVLA) through a **3D
Gaussian-Splat** scene and watch it roll a trajectory -- in the browser. Type a
language prompt, drag the start gizmo, hit **Run rollout**, and the policy
walks the scene step by step while a robot's-eye panel streams its egocentric
view.

**Full example:**
[vuer-examples/vuer-omnivla-rollout-demo](https://github.com/vuer-examples/vuer-omnivla-rollout-demo)
-- the OmniVLA weights, the GPU backend, this viewer, and a one-command deploy.

Here is the full demo in action -- dragging the start gizmo, running a
12-step rollout for the prompt *"go to the bookshelf"*, with the robot's-eye
view streaming in the corner panel:

```{eval-rst}
.. video:: ../../_static/inference_loop_rollout.mp4
    :alt: Closed-loop OmniVLA rollout in a Gaussian-splat scene with Vuer
    :autoplay:
    :nocontrols:
    :loop:
    :muted:
    :preload: auto
    :width: 100%
```

## How it works

The design that makes this possible is a **file-IPC seam**: the GPU backend
and the vuer viewer never import each other, they only share a directory of
files. The viewer imports neither the model nor torch.

```
  GPU backend (run.py)                 shared ipc/ dir              browser viewer (viewer.py)
  conda: omnivla                      ┌──────────────┐             conda: omnivla-vuer, GPU-free
  ────────────────────                │ scene.json   │◀── writes ── describe scene (splat, up, start)
  load 3DGS + OmniVLA                 │ scene.splat  │◀── writes ── the gaussians, served over HTTP
       ▲     │                        │ preview_req  │── reads ───▶ drag gizmo -> ask for one frame
       │     ▼                        │ view.png     │◀── writes ── egocentric frame  ── shows it
   serve_ipc()  ◀── polls/writes ───▶ │ request.json │── reads ───▶ Run -> pose + prompt
                                      │ result.json  │◀── writes ── streamed trajectory ── draws it
                                      └──────────────┘
```

Dragging the start gizmo writes `preview_req.json` and gets a fresh `view.png`
back; hitting **Run rollout** writes `request.json`, and the backend steps the
policy inside a gsplat render of the scene, appending each step to
`result.json`. Swapping the policy is just pointing the viewer at another
folder.

## Inside the viewer

The excerpts below are lifted (lightly trimmed) from the demo's
[`viewer.py`](https://github.com/vuer-examples/vuer-omnivla-rollout-demo);
they are the three pieces that make the page above work.

### Stand the scene upright

A splat comes out of structure-from-motion in a tilted frame -- its `up` is
some slanted unit vector, not `+Y`. Compute the one rotation that sends `up`
onto `+Y`, then wrap the whole scene (splat + gizmo + trajectory) in a single
`Group` carrying it, so the backend can stay in the scene's native
coordinates.

```python
def _up_to_euler_xyz(up) -> list:
    a = np.asarray(up, float)
    a = a / (np.linalg.norm(a) + 1e-12)
    b = np.array([0.0, 1.0, 0.0])
    v = np.cross(a, b)
    c = float(a @ b)
    if c < -1.0 + 1e-8:  # up points straight down: 180 deg about X
        R = np.diag([1.0, -1.0, -1.0])
    else:
        vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
        R = np.eye(3) + vx + vx @ vx * (1.0 / (1.0 + c))
    ...  # read three.js 'XYZ' Euler angles off R
    return [x, y, z]

scene_rot = _up_to_euler_xyz(spec.up)
```

### The scene: splat + a draggable start gizmo

`src` is `scene.json`'s `splat_url` resolved against `/workspace`, the route
vuer serves the shared ipc directory at -- the browser fetches the gaussians by
URL. The `Movable` is the draggable start handle; the viewer turns a drag into
a `preview_req.json` for the backend.

```python
sess.set @ DefaultScene(
    # One Group rotates the whole native scene upright (+Y up). The splat, the
    # start gizmo, and the rollout trajectory/robot all live inside it.
    Group(
        Splat(key="scene", src=src, flipCoords=args.flip),
        Movable(key="start", position=list(state["pos"]), scale=1.0),
        key=SCENE_GROUP,
        rotation=scene_rot,
    ),
    up=[0.0, 1.0, 0.0],
    grid=True,
)
```

### Grow the trajectory, stream the robot's eye

Each backend step appends a waypoint to `result.json`; on every poll the
viewer re-upserts the whole path as a red `Line` with a `Sphere` robot at its
head (the growth you see is the file growing), and refreshes the egocentric
`view.png` into a floating `Img` panel. Both go INTO the scene group (`to=`)
so they are stood upright together with the splat.

```python
traj = result.get("traj", [])
if len(traj) >= 2:
    sess.upsert(Line(key="traj", points=traj, color="red", lineWidth=4),
                to=SCENE_GROUP)
if len(traj) >= 1:
    sess.upsert(Sphere(key="robot", args=[0.15, 16, 16], position=traj[-1],
                       color="red"), to=SCENE_GROUP)
```

## Run it yourself

The viewer side needs no GPU, but the policy does -- so the runnable demo
lives in its own repo with a one-command deploy:

```bash
git clone https://github.com/vuer-examples/vuer-omnivla-rollout-demo
```

See that repo's README for the GPU requirements, the model weights, and
`demo.sh`.
