export interface BorderAssetConfig {
  edge: 0 | 1 | 2 | 3;
  offset: number;
  size: number;

  rotationSpeed?: number;
  bobAmplitude?: number;
  bobFrequency?: number;
  opacity?: number;
}

export class AssetUniforms {
  readonly data = new Float32Array(8); // 2 vec4

  constructor(config: BorderAssetConfig) {
    this.data[0] = config.edge;
    this.data[1] = config.offset;
    this.data[2] = config.size;
    this.data[3] = 0.0; // phase

    this.data[4] = config.rotationSpeed ?? 1.0;
    this.data[5] = config.bobAmplitude ?? 0.0;
    this.data[6] = config.bobFrequency ?? 2.0;
    this.data[7] = config.opacity ?? 1.0;
  }
}

