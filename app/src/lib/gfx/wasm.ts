let engine: any;
let uniforms: Float32Array;

export async function initWasm() {
  const pkg = await import('../../../../wasm/engine/pkg/engine.js');

  const init = pkg.default;
  const wasm = await init();

  const { Engine } = pkg;
  const { memory } = wasm;

  engine = new Engine();

  const ptr = engine.uniforms_ptr();
  const len = engine.uniforms_len();

  uniforms = new Float32Array(memory.buffer, ptr, len);

  return {
    update: (t: number) => engine.update(t),
    uniforms
  };
}
