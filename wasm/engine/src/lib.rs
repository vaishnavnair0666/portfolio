use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine {
    uniforms: [f32; 16],
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        Engine {
            uniforms: [
                // time / resolution
                0.0, // 0 time
                0.0, // 1 width
                0.0, // 2 height
                1.0, // 3 dpr
                // vignette
                0.4, // 4 vignette_inner
                1.0, // 5 vignette_outer
                // border
                0.02, // 6 border_inner
                0.05, // 7 border_outer
                2.0,  // 8 border_speed
                80.0, // 9 border_frequency
                // interaction
                0.5, // 10 mouse_x
                0.5, // 11 mouse_y
                0.0, // 12 interaction
                // padding / future
                0.0, // 13
                0.0, // 14
                0.0, // 15
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
