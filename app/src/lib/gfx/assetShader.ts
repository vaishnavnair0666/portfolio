export const assetShader = `
struct Globals {
  time: f32,
  width: f32,
  height: f32,
  dpr: f32,
  vignette_inner: f32,
  vignette_outer: f32,
  border_inner: f32,
  border_outer: f32,
  border_speed: f32,
  border_frequency: f32,
  mouse_x: f32,
  mouse_y: f32,
  interaction: f32,
  scroll: f32,
  scroll_smooth: f32,
  _pad: f32
};

struct Asset {
  edge: f32,
  offset: f32,
  size: f32,
  phase: f32,

  rotationSpeed: f32,
  bobAmplitude: f32,
  bobFrequency: f32,
  opacity: f32
};

@group(0) @binding(0)
var<uniform> globals: Globals;

@group(1) @binding(0)
var<uniform> asset: Asset;

@group(1) @binding(1)
var assetTex: texture_2d<f32>;

@group(1) @binding(2)
var assetSampler: sampler;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>
};

@vertex
fn vs_main(
  @location(0) in_pos: vec2<f32>,
  @location(1) in_uv: vec2<f32>
) -> VSOut {

  var out: VSOut;

  let t = globals.time;
  let scaled = in_pos * asset.size;

  // --- EDGE ROTATION ---
  var angle: f32 = 0.0;

  if (asset.edge == 0.0) {          // top
    angle = 0.0;
  }
  else if (asset.edge == 1.0) {     // right
    angle = 1.570796;               // 90°
  }
  else if (asset.edge == 2.0) {     // bottom
    angle = 3.141592;               // 180°
  }
  else {                            // left
    angle = -1.570796;              // -90°
  }

  // --- Optional subtle energy rotation ---
  let energySpin = globals.time * globals.border_speed * 0.5;
  angle += energySpin;

  // --- 2D rotation ---
  let c = cos(angle);
  let s = sin(angle);

  let rotated = vec2<f32>(
    scaled.x * c - scaled.y * s,
    scaled.x * s + scaled.y * c
  );

  var x = rotated.x;
  var y = rotated.y;
  let bob = sin(globals.time * 4.0 + asset.offset * 10.0) * 0.02;
  x += bob * 1.0;
  
  y += bob * 1.0;

  if (asset.edge == 0.0) {
    y += 1.0 - asset.size + bob;
    x += asset.offset * 2.0 - 1.0;
  }
  else if (asset.edge == 1.0) {
    x += 1.0 - asset.size + bob;
    y += asset.offset * 2.0 - 1.0;
  }
  else if (asset.edge == 2.0) {
    y += -1.0 + asset.size - bob;
    x += asset.offset * 2.0 - 1.0;
  }
  else {
    x += -1.0 + asset.size - bob;
    y += asset.offset * 2.0 - 1.0;
  }

  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = in_uv;

  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let tex = textureSample(assetTex, assetSampler, uv);
  let glow = pow(length(tex.rgb), 2.0) * 0.2;
  return vec4<f32>(tex.rgb + glow, tex.a);
}
`;
