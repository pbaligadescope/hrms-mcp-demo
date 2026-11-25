# Explainer video

A 4-minute narrated walkthrough of the three demo stages. Animated scenes show the Claude prompts and results from [DEMO.md](../../DEMO.md), and a recording of the Descope console (MCP server, scopes, consent flow, RBAC and access policy) is cut in after the Stage 3 concept.

- `matrix-mcp-explainer.mp4`: 1280×720, 30 fps, AAC narration
- `matrix-mcp-explainer-preview.gif`: silent preview for the README, 720 px wide, 8 fps, 3× speed (console section skipped)
- `matrix-mcp-explainer.srt`: captions
- `script.md`: narration script with timestamps

## Re-render

The animated scenes are an HTML page (`source/index.html`) with a `render(t)` function, captured frame by frame with Playwright. `source/plan.json` lists every scene: its narration line and either a time range in the animation (`anim`) or segments of the console recording (`clip`). Narration uses the [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) TTS model, voice `am_michael`.

Needs Node with Playwright, Python with `kokoro-onnx` and `soundfile`, and ffmpeg. Run from `source/`:

```bash
python3 tts.py <kokoro-model-dir>        # vo_NN.wav per scene + plan_t.json with durations
node render.js                           # animated scenes -> seg_NN.mp4, console captions -> cap_NN.png
python3 clips.py <console-recording.mp4> # console scenes -> seg_NN.mp4
python3 assemble.py                      # concat + mix narration -> matrix-mcp-explainer-v2.mp4 and .srt
```

The console recording is not in the repo; `clips.py` crops it to hide the browser bar and account name. Preview GIF:

```bash
ffmpeg -i matrix-mcp-explainer.mp4 -filter_complex "[0:v]trim=0:98,setpts=(PTS-STARTPTS)/3[a];[0:v]trim=186:239.5,setpts=(PTS-STARTPTS)/3[b];[a][b]concat=n=2:v=1,fps=8,scale=720:-1:flags=lanczos,split[x][y];[x]palettegen=max_colors=128[p];[y][p]paletteuse=dither=bayer:bayer_scale=4" matrix-mcp-explainer-preview.gif
```

The Claude mark is from [Simple Icons](https://simpleicons.org) (CC0); the Descope logo was supplied by the project owner.
