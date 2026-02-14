import { initWasm } from '$lib/gfx/wasm';
import { Interaction } from './Interaction';
import { Uniforms } from './Uniforms';
import { Renderer } from './Renderer';
import { BackgroundPass } from './BackgroundPass';

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

export async function startWebGPU(canvas: HTMLCanvasElement) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();

  const { update, uniforms: wasmUniforms } = await initWasm();
  const interaction = new Interaction(canvas);
  const uniforms = new Uniforms(wasmUniforms.buffer);

  const context = canvas.getContext('webgpu')!;
  const format = navigator.gpu.getPreferredCanvasFormat();

  resizeCanvas(canvas);
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const uniformBuffer = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const globalBindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }
    }]
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [globalBindGroupLayout]
  });

  const globalBindGroup = device.createBindGroup({
    layout: globalBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  const renderer = new Renderer(device, context);

  const backgroundPass = new BackgroundPass(
    device,
    format,
    pipelineLayout,
    globalBindGroup
  );

  renderer.addLayer(backgroundPass);
  const start = performance.now();

  function frame(now: number) {
    if (resizeCanvas(canvas)) {
      context.configure({ device, format, alphaMode: 'opaque' });
    }

    const t = (now - start) * 0.001;
    update(t);

    interaction.update();
    uniforms.setResolution(canvas.width, canvas.height, window.devicePixelRatio || 1);
    uniforms.setDesign();
    uniforms.setInteraction(
      interaction.mouseX,
      interaction.mouseY,
      interaction.interaction
    );
    uniforms.setScroll(interaction.scroll, interaction.scrollSmooth)
    uniforms.setSection(
      interaction.section,
      interaction.sectionProgress
    );
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      uniforms.data.buffer,
      uniforms.data.byteOffset,
      uniforms.data.byteLength
    );

    renderer.draw();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
