let engine: any;
let memory: WebAssembly.Memory;

export async function initWasm() {
  const pkg = await import('../../../../wasm/engine/pkg/engine.js');
  const init = pkg.default;
  const wasm = await init();

  const { Engine } = pkg;
  memory = wasm.memory;

  engine = new Engine();

  return {
    engine,
    memory
  };
}
