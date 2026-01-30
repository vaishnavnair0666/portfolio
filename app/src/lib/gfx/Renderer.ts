export function createPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  pipelineLayout: GPUPipelineLayout
): GPURenderPipeline {
  const shader = device.createShaderModule({
    code: `
      @vertex
      fn vs_main(@builtin(vertex_index) i: u32)
        -> @builtin(position) vec4<f32> {
        var pos = array<vec2<f32>, 3>(
          vec2<f32>(-1.0, -1.0),
          vec2<f32>( 3.0, -1.0),
          vec2<f32>(-1.0,  3.0)
        );
        return vec4<f32>(pos[i], 0.0, 1.0);
      }

      struct Uniforms {
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

        _pad0: f32,
        _pad1: f32,
        _pad2: f32,
      };

      @group(0) @binding(0)
      var<uniform> u: Uniforms;

      @fragment
      fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
        let uv = pos.xy / vec2<f32>(u.width, u.height);

        let centered = uv * 2.0 - vec2<f32>(1.0);
        let aspect = u.width / u.height;
        let p = vec2<f32>(centered.x * aspect, centered.y);
        let d = length(p);

        let base = vec3<f32>(
          0.5 + 0.5 * sin(u.time),
          0.5 + 0.5 * cos(u.time),
          0.8
        );

        let mouse = vec2<f32>(u.mouse_x, u.mouse_y);
        let centered_uv = uv - mouse;
        let vignette_dist = length(centered_uv * vec2<f32>(aspect, 1.0));

        let vignette_strength = mix(
          u.vignette_outer,
          u.vignette_inner,
          clamp(u.interaction, 0.0, 1.0)
        );

        let vignette = smoothstep(
          vignette_strength,
          u.vignette_outer,
          vignette_dist
        );

        let edgeDist = min(
          min(uv.x, 1.0 - uv.x),
          min(uv.y, 1.0 - uv.y)
        );

        let borderMask = 1.0 - smoothstep(
          u.border_inner,
          u.border_outer,
          edgeDist
        );

        let wave = 0.5 + 0.5 * sin(
          u.time * u.border_speed +
            edgeDist * u.border_frequency
        );

        let borderBoost = 1.0 + u.interaction * 1.5;
        let borderColor = vec3<f32>(0.9, 0.9, 0.95) * wave * borderBoost;

        let color = base * vignette;
        let finalColor = mix(color, borderColor, borderMask);

        return vec4<f32>(finalColor, 1.0);
      }
    `
  });

  return device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shader,
      entryPoint: 'vs_main'
    },
    fragment: {
      module: shader,
      entryPoint: 'fs_main',
      targets: [{ format }]
    },
    primitive: {
      topology: 'triangle-list'
    }
  });
}

export class Renderer {
  constructor(
    readonly device: GPUDevice,
    readonly context: GPUCanvasContext,
    readonly pipeline: GPURenderPipeline,
    readonly bindGroup: GPUBindGroup
  ) { }

  draw() {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }]
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}
