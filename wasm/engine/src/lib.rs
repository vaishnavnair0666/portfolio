use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine {
    uniforms: [f32; 4],
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        Engine { uniforms: [0.0; 4] }
    }

    pub fn update(&mut self, time: f32) {
        self.uniforms[0] = time;
    }

    pub fn uniforms_ptr(&self) -> *const f32 {
        self.uniforms.as_ptr()
    }

    pub fn uniforms_len(&self) -> usize {
        self.uniforms.len()
    }
}
