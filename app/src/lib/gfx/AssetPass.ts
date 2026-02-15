import type { RenderPassLayer } from './RenderPass';
import type { BorderAsset } from './BorderAsset';

export class AssetPass implements RenderPassLayer {
  private assets: BorderAsset[] = [];

  constructor(
    private pipeline: GPURenderPipeline,
    private globalBindGroup: GPUBindGroup
  ) { }

  addAsset(asset: BorderAsset) {
    this.assets.push(asset);
  }

  draw(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);

    for (const asset of this.assets) {
      asset.draw(pass);
    }
  }
}

