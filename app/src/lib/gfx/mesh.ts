export function createQuadVertexBuffer(device: GPUDevice): GPUBuffer {
  // 2 triangles (6 vertices)
  // position (vec2) + uv (vec2)
  const vertices = new Float32Array([
    // x, y,   u, v
    -1, -1, 0, 1,
    1, -1, 1, 1,
    -1, 1, 0, 0,

    -1, 1, 0, 0,
    1, -1, 1, 1,
    1, 1, 1, 0,
  ]);

  const buffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  device.queue.writeBuffer(buffer, 0, vertices);

  return buffer;
}

