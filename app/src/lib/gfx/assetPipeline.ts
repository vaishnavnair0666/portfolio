import { assetShader } from "./assetShader";
export function createAssetBindGroupLayout(
  device: GPUDevice
): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      }
    ]
  });
}
export function createAssetPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout,
): GPURenderPipeline {

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [globalLayout]
  });

  const module = device.createShaderModule({ code: assetShader });

  return device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module,
      entryPoint: 'vs_main',
      buffers: [{
        arrayStride: 4 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x2' },
          { shaderLocation: 1, offset: 8, format: 'float32x2' }
        ]
      }]
    },
    fragment: {
      module,
      entryPoint: 'fs_main',
      targets: [{
        format,
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          }
        }
      }]
    },
    primitive: {
      topology: 'triangle-list'
    }
  });
}

