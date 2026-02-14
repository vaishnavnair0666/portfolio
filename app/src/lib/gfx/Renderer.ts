import type { RenderPassLayer } from './RenderPass';

export class Renderer {
  private layers: RenderPassLayer[] = [];

  constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext
  ) { }

  addLayer(layer: RenderPassLayer) {
    this.layers.push(layer);
  }

  draw() {
    const encoder = this.device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 0 }
      }]
    });

    for (const layer of this.layers) {
      layer.draw(pass);
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
