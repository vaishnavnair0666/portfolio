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

@group(0) @binding(0)
var<uniform> globals: Globals;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>
};

@vertex
fn vs_main(
  @location(0) in_pos: vec2<f32>,
  @location(1) in_uv: vec2<f32>,
  @builtin(instance_index) instance: u32
) -> VSOut {

  var out: VSOut;

  let scaled = in_pos * 0.12;

  let edge = f32(instance / 50u);   // 50 per edge
  let index = f32(instance % 50u);

  let offset = index / 49.0;

  var angle: f32 = 0.0;

  if (edge == 0.0) {          // top
    angle = 0.0;
  }
  else if (edge == 1.0) {     // right
    angle = 1.570796;
  }
  else if (edge == 2.0) {     // bottom
    angle = 3.141592;
  }
  else {
    angle = -1.570796;
  }

  angle += globals.time * 0.5;

  let c = cos(angle);
  let s = sin(angle);

  let rotated = vec2<f32>(
    scaled.x * c - scaled.y * s,
    scaled.x * s + scaled.y * c
  );

  var x = rotated.x;
  var y = rotated.y;

  let bob = sin(globals.time * 3.0 + offset * 10.0) * 0.02;

  if (edge == 0.0) {
    y += 1.0 - 0.12;
    x += offset * 2.0 - 1.0;
  }
  else if (edge == 1.0) {
    x += 1.0 - 0.12;
    y += offset * 2.0 - 1.0;
  }
  else if (edge == 2.0) {
    y += -1.0 + 0.12;
    x += offset * 2.0 - 1.0;
  }
  else {
    x += -1.0 + 0.12;
    y += offset * 2.0 - 1.0;
  }

  x += bob;
  y += bob;

  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = in_uv;

  return out;
}

// @fragment
// fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
//   let tex = textureSample(assetTex, assetSampler, uv);
//   return vec4<f32>(tex.rgb, tex.a);
// }
@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(1.0, 0.3, 0.1, 1.0);
}
`;
