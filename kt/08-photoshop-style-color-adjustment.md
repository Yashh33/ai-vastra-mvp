# Photoshop-style "Prominent Colors" + Hue/Saturation/Lightness in AI Vastra

## What Photoshop is doing (conceptually)
When you use **Hue/Saturation** with **Prominent Colors**, Photoshop typically does:

1. Convert image into an editable color space (HSL/HSV-like workflow).
2. Detect dominant color groups (cluster/histogram based).
3. Build soft masks for each color range.
4. Apply Hue/Saturation/Lightness changes only to selected range.
5. Blend smoothly (feathering, clamping) to avoid artifacts.

---

## Your requirement (updated)
You want sliders **after Gemini output is generated** (post-process), not on the fabric input.

So the feature should run on the **final generated output image**.

---

## How to implement in AI Vastra (post-output workflow)

### A) UX flow (recommended)
1. User generates image via `/generate` (existing flow).
2. On `output` screen, show:
   - Prominent color swatches detected from final output.
   - Sliders: Hue, Saturation, Lightness.
3. User tweaks sliders and previews instantly.
4. User taps **Save Variant**.
5. App stores edited result as a new output variant and shows in history.

### B) Where to add in current app
- Primary UI location: `mobile/app/output.tsx`.
- Optional access from history viewer (`mobile/app/history.tsx`) as "Edit Colors".

### C) Backend APIs to add

#### 1) `POST /analyze-colors`
Input:
- `image_key` (the Gemini output key)
- optional `num_colors` (default 6)

Output:
- swatches with id/hex/h/s/l/coverage

#### 2) `POST /adjust-output-colors`
Input:
- `image_key` (Gemini output image)
- `target_color_id` (or `global=true`)
- `hue_delta`, `sat_delta`, `light_delta`
- optional `feather`, `protect_skin`, `protect_background`

Output:
- `adjusted_key`, `adjusted_url`, metadata

#### 3) History compatibility
Store adjusted result under a new prefix, e.g.:
- `shops/{shop_id}/output-variants/{YYYYMMDD}/{job_id}_{variant_id}.jpg`

And include relation in history record:
- `source_output_key`
- `variant_of_job_id`

---

## Processing algorithm for final output (MVP quality)

### 1) Dominant color extraction
- Load output image.
- Downsample for analysis (e.g., max 512 px).
- Convert RGB→Lab or HSV.
- Run k-means (k=5..8), return top clusters by coverage.

### 2) Build color mask
For selected swatch:
- Compute circular hue distance per pixel.
- Soft mask via tolerance + feather (smoothstep/gaussian falloff).
- Reduce effect on near-gray pixels (low saturation).

### 3) Apply H/S/L transform
For masked pixels:
- `H' = wrap(H + hue_delta)`
- `S' = clamp(S * (1 + sat_delta/100), 0, 1)`
- `L' = clamp(L + light_delta/100, 0, 1)`
- Blend using mask weight.

### 4) Optional protection masks (important on final output)
Because edits are on full generated image, add guards to avoid unnatural skin/background shifts:
- **Skin protection**: skin-tone range mask to reduce strength.
- **Background protection**: segmentation/depth/subject mask (if available) or simple low-detail/background heuristic.
- **Highlight/shadow protection**: reduce edits in extreme luminance regions.

---

## Why post-output editing needs protection
If you edit after generation, color changes can affect face/skin/walls/background. Photoshop handles this with precise masks. For AI Vastra, add soft protection masks so edits mostly affect garment regions.

---

## Practical phased rollout

### Phase 1 (quick win)
- Global H/S/L sliders on final output.
- No swatches, no masking.
- Good for proving UX.

### Phase 2
- Prominent color swatches + per-swatch masking.
- Save as output variants.

### Phase 3
- Add skin/background protection toggles.
- Add before/after compare slider.

### Phase 4
- Auto-suggest color presets (Warm/Cool/Vibrant/Muted).
- Batch variant generation (3–5 one-click options).

---

## Suggested defaults
- Swatches: 6
- Hue range tolerance: 28°
- Feather: 12°
- Saturation floor: 0.08
- Slider ranges:
  - Hue: -180..180
  - Saturation: -100..100
  - Lightness: -100..100

---

## Proposed contracts (post-output)

### `POST /analyze-colors`
```json
{
  "image_key": "shops/shop_1/output/20260208/job123.png",
  "num_colors": 6
}
```

```json
{
  "colors": [
    {"id":"c1","hex":"#8C3B2A","coverage":0.29,"h":14,"s":0.54,"l":0.36},
    {"id":"c2","hex":"#B58A6A","coverage":0.18,"h":28,"s":0.33,"l":0.56}
  ]
}
```

### `POST /adjust-output-colors`
```json
{
  "image_key": "shops/shop_1/output/20260208/job123.png",
  "target_color_id": "c1",
  "hue_delta": -12,
  "sat_delta": 18,
  "light_delta": -6,
  "feather": 12,
  "protect_skin": true,
  "protect_background": true
}
```

```json
{
  "adjusted_key": "shops/shop_1/output-variants/20260208/job123_v2.jpg",
  "adjusted_url": "https://...",
  "source_output_key": "shops/shop_1/output/20260208/job123.png"
}
```

---

## Recommendation for your stack
Given your FastAPI + R2 architecture, start with **backend post-processing on final outputs**. It keeps color behavior consistent across devices and integrates cleanly with your current output/history flow.
