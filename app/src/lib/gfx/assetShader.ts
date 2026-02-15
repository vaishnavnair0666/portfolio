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
  phase: f32
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

  // Scale quad
  let scaled = in_pos * asset.size;

  // Position along edge (simple version first)
  var x = scaled.x;
  var y = scaled.y;

  if (asset.edge == 0.0) {         // top
    y += 1.0 - asset.size;
    x += asset.offset * 2.0 - 1.0;
  }
  else if (asset.edge == 1.0) {    // right
    x += 1.0 - asset.size;
    y += asset.offset * 2.0 - 1.0;
  }
  else if (asset.edge == 2.0) {    // bottom
    y += -1.0 + asset.size;
    x += asset.offset * 2.0 - 1.0;
  }
  else {                           // left
    x += -1.0 + asset.size;
    y += asset.offset * 2.0 - 1.0;
  }

  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = in_uv;

  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let tex = textureSample(assetTex, assetSampler, uv);
  return vec4<f32>(tex.rgb, 1.0);
}
`;
