# Shader Playground

A collection of WebGL shader experiments.

## Ocean Sparkles

A standalone recreation of the ocean sparkle effect from [farayan.me/sparkles](https://farayan.me/sparkles).

**Features:**
- Raymarched ocean with FBM waves
- Multi-pass rendering (ocean → blur → sparkle mask → composite)
- Grid-based sparkle system with 5 species (BASE, SPIKY, SPECKLE, GLINT, CIRCLE)
- Temporal accumulation for persistent sparkle trails
- FM halftone post-processing
- ACES tonemapping

**Run locally:**
```bash
python3 -m http.server 8765
# Open http://localhost:8765/ocean-shader.html
```
