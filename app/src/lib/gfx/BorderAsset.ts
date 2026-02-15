import { AssetUniforms, type BorderAssetConfig } from "./AssetUniforms";

export class BorderAsset {
  private uniformBuffer: GPUBuffer;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    quadVertexBuffer: GPUBuffer,
    assetLayout: GPUBindGroupLayout,
    texture: GPUTexture,
    sampler: GPUSampler,
    config: BorderAssetConfig
  ) {
    const uniforms = new AssetUniforms(config);

    this.uniformBuffer = device.createBuffer({
      size: 256, // required alignment
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(this.uniformBuffer, 0, uniforms.data);

    this.bindGroup = device.createBindGroup({
      layout: assetLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: texture.createView() },
        { binding: 2, resource: sampler }
      ]
    });

    this.quadVertexBuffer = quadVertexBuffer;
  }

  private quadVertexBuffer: GPUBuffer;

  draw(pass: GPURenderPassEncoder) {
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setBindGroup(1, this.bindGroup);
    pass.draw(6);
  }
}

