# WebGPU
## Parameters

| Index | Name             | Meaning             |
| ----: | ---------------- | ------------------- |
|     0 | time             | Seconds since start |
|     1 | width            | Canvas width (px)   |
|     2 | height           | Canvas height (px)  |
|     3 | dpr              | Device pixel ratio  |
|     4 | vignette_inner   | Inner radius        |
|     5 | vignette_outer   | Outer radius        |
|     6 | border_inner     | Border start        |
|     7 | border_outer     | Border end          |
|     8 | border_speed     | Animation speed     |
|     9 | border_frequency | Wave density        |
|    10 | mouse_x          | Normalized [0–1]    |
|    11 | mouse_y          | Normalized [0–1]    |
|    12 | interaction      | Impulse decay       |
|    13 | scroll           | Raw scroll          |
|    14 | scroll_smooth    | Eased scroll        |
|    15 | section          | Discrete section id |


## Data flow
User input (mouse / scroll)
        ⬇️
Interaction (CPU-side logic)
        ⬇️
Uniforms (structured memory buffer)
        ⬇️
WebGPU (render pipeline)
        ⬇️
WGSL shader (pure math, no state)

## File purpose
### Interaction.ts
Responsibilities:
* Mouse position
* Interaction Impulse
* Scroll (Raw + Eased)
* Section logic

### Uniforms.ts 
Responsibilities:
* Exact memory layout
* Knows where each value lives

### Renderer.ts
Responsibilities:
* Begin render pass
* Bind pipeline + uniforms
* Issue draw call

### pipeline.ts
Responsibilities:
* WGSL source
* Bind group layout
* Render pipeline creation

### webgpu.ts
Responsibilities:
* Setup device & context
* Instantiate Interaction / Uniforms / Renderer
* Frame loop
* Resize handling


