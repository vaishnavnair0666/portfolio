import type { RenderPassLayer } from './RenderPass';

export class BackgroundPass implements RenderPassLayer {
  private pipeline: GPURenderPipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    globalBindGroupLayout: GPUBindGroupLayout,
    globalBindGroup: GPUBindGroup
  ) {
    this.bindGroup = globalBindGroup;

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [globalBindGroupLayout]
    });

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

          scroll: f32,
          scroll_smooth: f32,
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

          let warm = vec3<f32>(0.9, 0.6, 0.4);
          let cool = vec3<f32>(0.4, 0.6, 0.9);

          let scrollColor = mix(cool, warm, u.scroll_smooth);

          let base = scrollColor * (0.5 + 0.5 * sin(u.time));

          let mouse = vec2<f32>(u.mouse_x, u.mouse_y);
          let centered_uv = uv - mouse;
          let vignette_dist = length(centered_uv * vec2<f32>(aspect, 1.0));

          let vignette_strength = mix(
            u.vignette_outer,
            u.vignette_inner,
            clamp(u.interaction + u.scroll_smooth * 0.6, 0.0, 1.0)
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

          let alpha = mix(0.4, 0.85, vignette);

          let color = base * vignette;
          let finalColor = mix(color, borderColor, borderMask);

          return vec4<f32>(finalColor, alpha);
        }
      `
    });

    this.pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shader,
        entryPoint: 'vs_main'
      },
      fragment: {
        module: shader,
        entryPoint: 'fs_main',
        targets: [{
          format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });
  }

  draw(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
  }
}
