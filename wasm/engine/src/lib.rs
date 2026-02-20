use wasm_bindgen::prelude::*;

pub type Entity = u32;

#[derive(Clone, Copy)]
pub struct Transform {
    pub position: [f32; 3],
    pub rotation: [f32; 3],
    pub scale: [f32; 3],
}

#[derive(Clone, Copy)]
pub struct Velocity {
    pub linear: [f32; 3],
}

#[derive(Clone, Copy)]
pub struct Camera {
    pub position: [f32; 3],
    pub fov: f32,
    pub near: f32,
    pub far: f32,
    pub aspect: f32,
}

#[wasm_bindgen]
pub struct Engine {
    time: f32,
    delta: f32,

    next_entity: Entity,
    selected: Option<Entity>,

    transforms: Vec<Option<Transform>>,
    velocities: Vec<Option<Velocity>>,

    camera: Option<Camera>,

    render_buffer: Vec<f32>,
    view_proj: [f32; 16],
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        Engine {
            time: 0.0,
            delta: 0.0,
            next_entity: 0,
            selected: None,
            transforms: Vec::new(),
            velocities: Vec::new(),
            camera: None,
            render_buffer: Vec::new(),
            view_proj: [0.0; 16],
        }
    }

    pub fn update(&mut self, delta: f32) {
        self.delta = delta;
        self.time += delta;

        self.integrate_velocity();
        self.update_camera();
        self.build_render_buffer();
    }

    fn integrate_velocity(&mut self) {
        for i in 0..self.transforms.len() {
            if let (Some(mut t), Some(v)) = (self.transforms[i], self.velocities[i]) {
                t.position[0] += v.linear[0] * self.delta;
                t.position[1] += v.linear[1] * self.delta;
                t.position[2] += v.linear[2] * self.delta;

                // simple Y rotation so we see real 3D
                t.rotation[1] += self.delta;

                self.transforms[i] = Some(t);
            }
        }
    }

    fn update_camera(&mut self) {
        if let Some(cam) = self.camera {
            let proj = Self::perspective(cam.fov, cam.aspect, cam.near, cam.far);
            let view = Self::view_matrix(cam.position);

            self.view_proj = Self::mul_mat4(proj, view);
        }
    }

    fn view_matrix(pos: [f32; 3]) -> [f32; 16] {
        // Column-major
        [
            1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -pos[0], -pos[1], -pos[2],
            1.0,
        ]
    }

    fn perspective(fov: f32, aspect: f32, near: f32, far: f32) -> [f32; 16] {
        let f = 1.0 / (fov / 2.0).tan();

        [
            f / aspect,
            0.0,
            0.0,
            0.0,
            0.0,
            f,
            0.0,
            0.0,
            0.0,
            0.0,
            far / (near - far),
            -1.0,
            0.0,
            0.0,
            (near * far) / (near - far),
            0.0,
        ]
    }

    fn mul_mat4(a: [f32; 16], b: [f32; 16]) -> [f32; 16] {
        let mut r = [0.0; 16];

        for col in 0..4 {
            for row in 0..4 {
                r[col * 4 + row] = a[0 * 4 + row] * b[col * 4 + 0]
                    + a[1 * 4 + row] * b[col * 4 + 1]
                    + a[2 * 4 + row] * b[col * 4 + 2]
                    + a[3 * 4 + row] * b[col * 4 + 3];
            }
        }

        r
    }

    fn model_matrix(t: Transform) -> [f32; 16] {
        let sx = t.scale[0];
        let sy = t.scale[1];
        let sz = t.scale[2];

        let px = t.position[0];
        let py = t.position[1];
        let pz = t.position[2];

        let ry = t.rotation[1];
        let c = ry.cos();
        let s = ry.sin();

        [
            sx * c,
            0.0,
            -sz * s,
            0.0,
            0.0,
            sy,
            0.0,
            0.0,
            sx * s,
            0.0,
            sz * c,
            0.0,
            px,
            py,
            pz,
            1.0,
        ]
    }

    fn build_render_buffer(&mut self) {
        self.render_buffer.clear();

        for (i, transform) in self.transforms.iter().enumerate() {
            if let Some(t) = transform {
                let model = Self::model_matrix(*t);
                self.render_buffer.extend_from_slice(&model);

                // Color (vec4)
                if Some(i as u32) == self.selected {
                    self.render_buffer.extend_from_slice(&[1.0, 0.3, 0.1, 1.0]); // highlight
                } else {
                    self.render_buffer.extend_from_slice(&[0.2, 0.7, 1.0, 1.0]); // default
                }
            }
        }
    }

    fn ray_intersects_cube(ray_origin: [f32; 3], ray_dir: [f32; 3], t: Transform) -> Option<f32> {
        let min = [
            t.position[0] - t.scale[0],
            t.position[1] - t.scale[1],
            t.position[2] - t.scale[2],
        ];

        let max = [
            t.position[0] + t.scale[0],
            t.position[1] + t.scale[1],
            t.position[2] + t.scale[2],
        ];

        let mut tmin = (min[0] - ray_origin[0]) / ray_dir[0];
        let mut tmax = (max[0] - ray_origin[0]) / ray_dir[0];

        if tmin > tmax {
            std::mem::swap(&mut tmin, &mut tmax);
        }

        for i in 1..3 {
            let mut t1 = (min[i] - ray_origin[i]) / ray_dir[i];
            let mut t2 = (max[i] - ray_origin[i]) / ray_dir[i];

            if t1 > t2 {
                std::mem::swap(&mut t1, &mut t2);
            }

            tmin = tmin.max(t1);
            tmax = tmax.min(t2);

            if tmin > tmax {
                return None;
            }
        }

        Some(tmin)
    }
    // ===== ENTITY =====

    pub fn create_entity(&mut self) -> Entity {
        let id = self.next_entity;
        self.next_entity += 1;

        self.transforms.push(None);
        self.velocities.push(None);

        id
    }

    pub fn add_transform(&mut self, entity: Entity, px: f32, py: f32, pz: f32) {
        self.transforms[entity as usize] = Some(Transform {
            position: [px, py, pz],
            rotation: [0.0, 0.0, 0.0],
            scale: [0.5, 0.5, 0.5],
        });
    }

    pub fn add_velocity(&mut self, entity: Entity, vx: f32, vy: f32, vz: f32) {
        self.velocities[entity as usize] = Some(Velocity {
            linear: [vx, vy, vz],
        });
    }

    pub fn set_camera(
        &mut self,
        px: f32,
        py: f32,
        pz: f32,
        fov: f32,
        aspect: f32,
        near: f32,
        far: f32,
    ) {
        self.camera = Some(Camera {
            position: [px, py, pz],
            fov,
            aspect,
            near,
            far,
        });
    }
    // ===== Ray Picking =====
    pub fn pick(&mut self, ox: f32, oy: f32, oz: f32, dx: f32, dy: f32, dz: f32) -> i32 {
        let ray_origin = [ox, oy, oz];
        let ray_dir = [dx, dy, dz];

        let mut closest = -1;
        let mut closest_dist = f32::MAX;

        for (i, transform) in self.transforms.iter().enumerate() {
            if let Some(t) = transform {
                if let Some(dist) = Self::ray_intersects_cube(ray_origin, ray_dir, *t) {
                    if dist < closest_dist {
                        closest_dist = dist;
                        closest = i as i32;
                    }
                }
            }
        }

        self.selected = if closest >= 0 {
            Some(closest as u32)
        } else {
            None
        };

        closest
    }

    // ===== RENDER EXTRACTION =====

    pub fn render_buffer_ptr(&self) -> *const f32 {
        self.render_buffer.as_ptr()
    }

    pub fn render_buffer_len(&self) -> usize {
        self.render_buffer.len()
    }

    pub fn view_proj_ptr(&self) -> *const f32 {
        self.view_proj.as_ptr()
    }
}
