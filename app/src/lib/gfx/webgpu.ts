import { initWasm } from '$lib/gfx/wasm';

let device: GPUDevice;
let context: GPUCanvasContext;
let format: GPUTextureFormat;

let pipeline: GPURenderPipeline;

let modelStorageBuffer: GPUBuffer;
let cameraUniformBuffer: GPUBuffer;

let modelBindGroup: GPUBindGroup;
let cameraBindGroup: GPUBindGroup;

let depthTexture: GPUTexture;

let engine: any;
let memory: WebAssembly.Memory;

let animationFrameId: number | null = null;

function resizeCanvas(canvas: HTMLCanvasElement): boolean {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}

function createDepthTexture() {
  depthTexture = device.createTexture({
    size: [context.canvas.width, context.canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
}

function createCubeVertexBuffer(device: GPUDevice): GPUBuffer {

  const vertices = new Float32Array([
    // position          // normal

    // Front
    -0.5, -0.5, 0.5,   /**/ 0, 0, 1,
    0.5, -0.5, 0.5,   /**/ 0, 0, 1,
    0.5, 0.5, 0.5,   /**/ 0, 0, 1,
    -0.5, -0.5, 0.5,   /**/ 0, 0, 1,
    0.5, 0.5, 0.5,   /**/ 0, 0, 1,
    -0.5, 0.5, 0.5,   /**/ 0, 0, 1,

    // Back
    -0.5, -0.5, -0.5,   /**/ 0, 0, -1,
    0.5, 0.5, -0.5,   /**/ 0, 0, -1,
    0.5, -0.5, -0.5,   /**/ 0, 0, -1,
    -0.5, -0.5, -0.5,   /**/ 0, 0, -1,
    -0.5, 0.5, -0.5,   /**/ 0, 0, -1,
    0.5, 0.5, -0.5,   /**/ 0, 0, -1,

    // Left
    -0.5, -0.5, -0.5,   /**/ -1, 0, 0,
    -0.5, -0.5, 0.5,   /**/ -1, 0, 0,
    -0.5, 0.5, 0.5,   /**/ -1, 0, 0,
    -0.5, -0.5, -0.5,   /**/ -1, 0, 0,
    -0.5, 0.5, 0.5,   /**/ -1, 0, 0,
    -0.5, 0.5, -0.5,   /**/ -1, 0, 0,

    // Right
    0.5, -0.5, -0.5,   /**/ 1, 0, 0,
    0.5, 0.5, 0.5,   /**/ 1, 0, 0,
    0.5, -0.5, 0.5,   /**/ 1, 0, 0,
    0.5, -0.5, -0.5,   /**/ 1, 0, 0,
    0.5, 0.5, -0.5,   /**/ 1, 0, 0,
    0.5, 0.5, 0.5,   /**/ 1, 0, 0,

    // Top
    -0.5, 0.5, -0.5,   /**/ 0, 1, 0,
    -0.5, 0.5, 0.5,   /**/ 0, 1, 0,
    0.5, 0.5, 0.5,   /**/ 0, 1, 0,
    -0.5, 0.5, -0.5,   /**/ 0, 1, 0,
    0.5, 0.5, 0.5,   /**/ 0, 1, 0,
    0.5, 0.5, -0.5,   /**/ 0, 1, 0,

    // Bottom
    -0.5, -0.5, -0.5,   /**/ 0, -1, 0,
    0.5, -0.5, 0.5,   /**/ 0, -1, 0,
    -0.5, -0.5, 0.5,   /**/ 0, -1, 0,
    -0.5, -0.5, -0.5,   /**/ 0, -1, 0,
    0.5, -0.5, -0.5,   /**/ 0, -1, 0,
    0.5, -0.5, 0.5,   /**/ 0, -1, 0,
  ]);

  const buffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  device.queue.writeBuffer(buffer, 0, vertices);
  return buffer;
}

function createPipeline(
  modelLayout: GPUBindGroupLayout,
  cameraLayout: GPUBindGroupLayout
): GPURenderPipeline {

  const shader = device.createShaderModule({
    code: `
    struct Model {
      model: mat4x4<f32>,
    };

    @group(0) @binding(0)
    var<storage, read> models: array<Model>;

    @group(1) @binding(0)
    var<uniform> view_proj: mat4x4<f32>;

    struct VSOut {
      @builtin(position) pos: vec4<f32>,
      @location(0) normal: vec3<f32>,
    };

    @vertex
    fn vs_main(
      @location(0) in_pos: vec3<f32>,
      @location(1) in_normal: vec3<f32>,
      @builtin(instance_index) instance: u32
    ) -> VSOut {

      var out: VSOut;

      let modelMatrix = models[instance].model;

      let world = modelMatrix * vec4<f32>(in_pos, 1.0);
      out.pos = view_proj * world;

      let normalWorld = (modelMatrix * vec4<f32>(in_normal, 0.0)).xyz;
      out.normal = normalize(normalWorld);

      return out;
    }

    @fragment
    fn fs_main(
      @location(0) normal: vec3<f32>
    ) -> @location(0) vec4<f32> {

      let lightDir = normalize(vec3<f32>(-1.0, -2.0, -1.0));
      let diffuse = max(dot(normal, -lightDir), 0.0);

      let baseColor = vec3<f32>(0.2, 0.7, 1.0);

      let color = baseColor * diffuse;

      return vec4<f32>(color, 1.0);
    }
`
  });

  const layout = device.createPipelineLayout({
    bindGroupLayouts: [modelLayout, cameraLayout]
  });

  return device.createRenderPipeline({
    layout,
    vertex: {
      module: shader,
      entryPoint: 'vs_main',
      buffers: [{
        arrayStride: 6 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' }
        ]
      }]
    },
    fragment: {
      module: shader,
      entryPoint: 'fs_main',
      targets: [{ format }]
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back'
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less'
    }
  });
}

export async function startWebGPU(canvas: HTMLCanvasElement) {

  const adapter = await navigator.gpu.requestAdapter();
  device = await adapter!.requestDevice();

  context = canvas.getContext('webgpu')!;
  format = navigator.gpu.getPreferredCanvasFormat();

  resizeCanvas(canvas);

  context.configure({
    device,
    format,
    alphaMode: 'opaque'
  });

  createDepthTexture();

  const wasm = await initWasm();
  engine = wasm.engine;
  memory = wasm.memory;

  engine.set_camera(0, 6, 15, 1.2, canvas.width / canvas.height, 0.1, 100);

  const gridSize = 10;
  const spacing = 1.2;

  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {

      const e = engine.create_entity();

      const px = (x - gridSize / 2) * spacing;
      const pz = (z - gridSize / 2) * spacing;

      engine.add_transform(e, px, 0, pz);

      // optional: slight movement or none
      engine.add_velocity(e, 0.0, 0.0, 0.0);
    }
  }

  modelStorageBuffer = device.createBuffer({
    size: 1024 * 64,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  cameraUniformBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const modelLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: { type: 'read-only-storage' }
    }]
  });

  const cameraLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: { type: 'uniform' }
    }]
  });

  modelBindGroup = device.createBindGroup({
    layout: modelLayout,
    entries: [{ binding: 0, resource: { buffer: modelStorageBuffer } }]
  });

  cameraBindGroup = device.createBindGroup({
    layout: cameraLayout,
    entries: [{ binding: 0, resource: { buffer: cameraUniformBuffer } }]
  });

  pipeline = createPipeline(modelLayout, cameraLayout);

  const vertexBuffer = createCubeVertexBuffer(device);

  let lastTime = performance.now();

  function frame(now: number) {

    if (resizeCanvas(canvas)) {
      context.configure({ device, format, alphaMode: 'opaque' });
      createDepthTexture();
    }

    const delta = (now - lastTime) * 0.001;
    lastTime = now;

    engine.update(delta);

    const ptr = engine.render_buffer_ptr();
    const len = engine.render_buffer_len();

    const renderData = new Float32Array(memory.buffer, ptr, len);

    device.queue.writeBuffer(
      modelStorageBuffer,
      0,
      renderData.buffer,
      renderData.byteOffset,
      renderData.byteLength
    );

    const vpPtr = engine.view_proj_ptr();
    const vpData = new Float32Array(memory.buffer, vpPtr, 16);

    device.queue.writeBuffer(
      cameraUniformBuffer,
      0,
      vpData.buffer,
      vpData.byteOffset,
      vpData.byteLength
    );

    const instanceCount = len / 16;

    const encoder = device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1 }
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        depthClearValue: 1.0
      }
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, modelBindGroup);
    pass.setBindGroup(1, cameraBindGroup);
    pass.setVertexBuffer(0, vertexBuffer);

    pass.draw(36, instanceCount);

    pass.end();
    device.queue.submit([encoder.finish()]);

    animationFrameId = requestAnimationFrame(frame);
  }

  animationFrameId = requestAnimationFrame(frame);

  return () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    device.destroy();
  };
}
