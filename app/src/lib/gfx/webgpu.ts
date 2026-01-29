import { initWasm } from '$lib/gfx/wasm';

export async function startWebGPU(canvas: HTMLCanvasElement): Promise<void> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No GPU adapter');
  }

  const device = await adapter.requestDevice();
  const { update, uniforms } = await initWasm();
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  if (!context) {
    throw new Error('Failed to get WebGPU context');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();

  const uniformBuffer = device.createBuffer({
    size: 4 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }
    }]
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
  });

  context.configure({
    device,
    format,
    alphaMode: 'opaque'
  });

  const pipeline = createPipeline(device, format, pipelineLayout);

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{
      binding: 0,
      resource: { buffer: uniformBuffer }
    }]
  });

  device.queue.writeBuffer(
    uniformBuffer,
    0,
    new Float32Array([1.0, 0.0, 0.0, 0.0])
  );

  let start = performance.now();

  function frame(now: number) {
    const t = (now - start) * 0.001;

    update(t);

    device.queue.writeBuffer(
      uniformBuffer,
      0,
      uniforms.buffer,
      uniforms.byteOffset,
      uniforms.byteLength
    );

    renderFrame(device, context, format, pipeline, bindGroup);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function createPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  pipelineLayout: GPUPipelineLayout
) {
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
        pad1: f32,
        pad2: f32,
        pad3: f32,
      };

      @group(0) @binding(0)
      var<uniform> u: Uniforms;

      @fragment
      fn fs_main() -> @location(0) vec4<f32> {
        let t = u.time;
        return vec4<f32>(
          0.5 + 0.5 * sin(t),
          0.5 + 0.5 * cos(t),
          0.8,
          1.0
        );
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
function renderFrame(
  device: GPUDevice,
  context: GPUCanvasContext,
  format: GPUTextureFormat,
  pipeline: GPURenderPipeline,
  bindGroup: GPUBindGroup
) {
  const encoder = device.createCommandEncoder();

  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: 'clear',
      storeOp: 'store',
      clearValue: { r: 0, g: 0, b: 0, a: 1 }
    }]
  });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup); // <-- NEW
  pass.draw(3);
  pass.end();

  device.queue.submit([encoder.finish()]);
}

