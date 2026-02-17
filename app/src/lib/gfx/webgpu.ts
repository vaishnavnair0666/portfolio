import { initWasm } from '$lib/gfx/wasm';
import { Interaction } from './Interaction';
import { Uniforms } from './Uniforms';
import { Renderer } from './Renderer';
import { BackgroundPass } from './BackgroundPass';

import { createQuadVertexBuffer } from './mesh';
import { createAssetPipeline} from './assetPipeline';
import { AssetPass } from './AssetPass';

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

export async function startWebGPU(canvas: HTMLCanvasElement): Promise<() => void> {
  let animationId: number;

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
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }
    }]
  });

  const globalBindGroup = device.createBindGroup({
    layout: globalBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  const renderer = new Renderer(device, context);

  const backgroundPass = new BackgroundPass(
    device,
    format,
    globalBindGroupLayout,
    globalBindGroup
  );

  renderer.addLayer(backgroundPass);

  const assetPipeline = createAssetPipeline(
    device,
    format,
    globalBindGroupLayout,
  );

  const quad = createQuadVertexBuffer(device);
  const assetPass = new AssetPass(
    assetPipeline,
    globalBindGroup,
    quad,
    200
  );

  renderer.addLayer(assetPass);

  // const texture = await loadTexture(device, '/assets/test2.png');

  // const sampler = device.createSampler({
  //   magFilter: 'linear',
  //   minFilter: 'linear'
  // });

  const start = performance.now();

  function frame(now: number) {
    if (resizeCanvas(canvas)) {
      context.configure({ device, format, alphaMode: 'premultiplied' });
    }

    const t = (now - start) * 0.001;
    update(t);
    uniforms.setTime(t);
    interaction.update();

    uniforms.setResolution(
      canvas.width,
      canvas.height,
      window.devicePixelRatio || 1
    );

    uniforms.setDesign();

    uniforms.setInteraction(
      interaction.mouseX,
      interaction.mouseY,
      interaction.interaction
    );

    uniforms.setScroll(
      interaction.scroll,
      interaction.scrollSmooth
    );

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

    animationId = requestAnimationFrame(frame);
  }

  animationId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(animationId);
    device.destroy();
  };
}
