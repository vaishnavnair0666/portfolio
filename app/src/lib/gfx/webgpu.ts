export async function startWebGPU(canvas: HTMLCanvasElement):Promise<void> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No GPU adapter');
  }

  const device = await adapter.requestDevice();

  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  if (!context) {
    throw new Error('Failed to get WebGPU context');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format,
    alphaMode: 'opaque'
  });

  renderOnce(device, context, format);
}
function createPipeline(device: GPUDevice, format: GPUTextureFormat) {
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

      @fragment
      fn fs_main() -> @location(0) vec4<f32> {
        return vec4<f32>(0.2, 0.6, 0.9, 1.0);
      }
    `
  });

  return device.createRenderPipeline({
    layout: 'auto',
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
function renderOnce(
  device: GPUDevice,
  context: GPUCanvasContext,
  format: GPUTextureFormat
) {
  const pipeline = createPipeline(device, format);

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
  pass.draw(3);
  pass.end();

  device.queue.submit([encoder.finish()]);
}

