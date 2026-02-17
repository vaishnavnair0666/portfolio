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

  let t = globals.time + asset.phase;

  // ---------- Rotation ----------
  let angle = t * asset.rotationSpeed;

  let c = cos(angle);
  let s = sin(angle);

  let rotated = vec2<f32>(
    in_pos.x * c - in_pos.y * s,
    in_pos.x * s + in_pos.y * c
  );

  // ---------- Scale ----------
  var p = rotated * asset.size;

  // ---------- Bobbing ----------
  let bob = sin(t * asset.bobFrequency) * asset.bobAmplitude;

  // ---------- Edge Placement ----------
  if (asset.edge == 0.0) {         // TOP
    p.y += 1.0 - asset.size;
    p.x += asset.offset * 2.0 - 1.0;
    p.y += bob;
  }
  else if (asset.edge == 1.0) {    // RIGHT
    p.x += 1.0 - asset.size;
    p.y += asset.offset * 2.0 - 1.0;
    p.x += bob;
  }
  else if (asset.edge == 2.0) {    // BOTTOM
    p.y += -1.0 + asset.size;
    p.x += asset.offset * 2.0 - 1.0;
    p.y -= bob;
  }
  else {                          // LEFT
    p.x += -1.0 + asset.size;
    p.y += asset.offset * 2.0 - 1.0;
    p.x -= bob;
  }

  out.pos = vec4<f32>(p, 0.0, 1.0);
  out.uv = in_uv;

  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let tex = textureSample(assetTex, assetSampler, uv);
  return vec4<f32>(tex.rgb, tex.a * asset.opacity);
}
`;
