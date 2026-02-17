import type { RenderPassLayer } from './RenderPass';

export class AssetPass implements RenderPassLayer {
  private instanceCount: number;

  constructor(
    private pipeline: GPURenderPipeline,
    private globalBindGroup: GPUBindGroup,
    private quadVertexBuffer: GPUBuffer,
    instanceCount: number
  ) {
    this.instanceCount = instanceCount;
  }

  draw(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);

    pass.draw(6, this.instanceCount);
  }
}
