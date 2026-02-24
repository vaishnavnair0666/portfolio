import { initWasm } from '$lib/gfx/wasm';
import { mat4, vec4, vec3 } from "gl-matrix";

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
let activeEntity = -1;
let lastX = 0;
let lastY = 0;
let mouseDownX = 0;
let mouseDownY = 0;
let mode: "idle" | "orbit" | "potential-drag" | "drag" = "idle";
const DRAG_THRESHOLD = 5;

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
      color: vec4<f32>,
    };

    @group(0) @binding(0)
    var<storage, read> models: array<Model>;

    @group(1) @binding(0)
    var<uniform> view_proj: mat4x4<f32>;

    struct VSOut {
      @builtin(position) pos: vec4<f32>,
      @location(0) normal: vec3<f32>,
      @location(1) color: vec4<f32>,
    };

    @vertex
    fn vs_main(
      @location(0) in_pos: vec3<f32>,
      @location(1) in_normal: vec3<f32>,
      @builtin(instance_index) instance: u32
    ) -> VSOut {

      var out: VSOut;

      let modelMatrix = models[instance].model;
      out.color = models[instance].color;

      let world = modelMatrix * vec4<f32>(in_pos, 1.0);
      out.pos = view_proj * world;

      let normalWorld = (modelMatrix * vec4<f32>(in_normal, 0.0)).xyz;
      out.normal = normalize(normalWorld);

      return out;
    }

    @fragment
    fn fs_main(
      @location(0) normal: vec3<f32>,
      @location(1) color: vec4<f32>
    ) -> @location(0) vec4<f32> {

      let N = normalize(normal);
      let lightDir = normalize(vec3<f32>(-1.0, -2.0, -1.0));
      let diffuse = max(dot(N, -lightDir), 0.0);

      let ambient = 0.2;

      let finalColor = color.rgb * (ambient + diffuse);

      return vec4<f32>(finalColor, 1.0);
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

  function buildRay(clientX: number, clientY: number) {

    const rect = canvas.getBoundingClientRect();

    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    const vpPtr = engine.view_proj_ptr();
    const vp = new Float32Array(memory.buffer, vpPtr, 16);

    const invVP = mat4.create();
    mat4.invert(invVP, vp);

    const nearPoint = vec4.fromValues(ndcX, ndcY, -1, 1);
    const farPoint = vec4.fromValues(ndcX, ndcY, 1, 1);

    vec4.transformMat4(nearPoint, nearPoint, invVP);
    vec4.transformMat4(farPoint, farPoint, invVP);

    for (let i = 0; i < 3; i++) {
      nearPoint[i] /= nearPoint[3];
      farPoint[i] /= farPoint[3];
    }

    const rayOrigin = vec3.fromValues(
      nearPoint[0],
      nearPoint[1],
      nearPoint[2]
    );

    const rayDir = vec3.create();
    vec3.subtract(rayDir,
      vec3.fromValues(farPoint[0], farPoint[1], farPoint[2]),
      rayOrigin
    );

    vec3.normalize(rayDir, rayDir);

    return { rayOrigin, rayDir };
  }


  createDepthTexture();

  const wasm = await initWasm();
  engine = wasm.engine;
  memory = wasm.memory;


  canvas.addEventListener("mousedown", (e) => {

    engine.update(0);

    const { rayOrigin, rayDir } = buildRay(e.clientX, e.clientY);

    const hit = engine.pick(
      rayOrigin[0], rayOrigin[1], rayOrigin[2],
      rayDir[0], rayDir[1], rayDir[2],
      e.shiftKey,
      e.ctrlKey
    );

    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (hit >= 0) {
      mode = "potential-drag";
      activeEntity = hit;
    } else {
      mode = "orbit";
    }
  });

  window.addEventListener("mousemove", (e) => {

    if (mode === "orbit") {

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      lastX = e.clientX;
      lastY = e.clientY;

      engine.camera_orbit(dx * 0.005, dy * 0.005);
    }

    else if (mode === "potential-drag") {

      const dx = e.clientX - mouseDownX;
      const dy = e.clientY - mouseDownY;

      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {

        mode = "drag";

        const { rayOrigin, rayDir } = buildRay(e.clientX, e.clientY);

        engine.begin_drag(
          activeEntity,
          rayOrigin[0], rayOrigin[1], rayOrigin[2],
          rayDir[0], rayDir[1], rayDir[2]
        );
      }
    }

    else if (mode === "drag") {

      engine.update(0);

      const { rayOrigin, rayDir } = buildRay(e.clientX, e.clientY);

      engine.update_drag_ray(
        rayOrigin[0], rayOrigin[1], rayOrigin[2],
        rayDir[0], rayDir[1], rayDir[2]
      );
    }
  });

  window.addEventListener("mouseup", () => {

    if (mode === "drag") {
      engine.end_drag();
    }

    mode = "idle";
  });

  canvas.addEventListener("wheel", (e) => {
    engine.camera_zoom(e.deltaY * 0.01);
  });
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
  engine.set_camera(
    0,
    5,
    10,
    1.2,
    canvas.width / canvas.height,
    0.1,
    100
  );

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

    const instanceCount = len / 20;

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
