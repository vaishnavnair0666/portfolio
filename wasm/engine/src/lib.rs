use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine {
    uniforms: [f32; 12],
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        Engine {
            uniforms: [
                0.0, // time
                0.0, // width
                0.0, // height
                1.0, // dpr
                0.4, // vignette_inner
                1.0, // vignette_outer
                0.02, // border_inner
                0.05, // border_outer
                2.0, // border_speed
                80.0, // border_frequency
                0.0, 
                0.0,
            ],
        }
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
