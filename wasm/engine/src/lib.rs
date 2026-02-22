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
    pub target: [f32; 3],
    pub yaw: f32,
    pub pitch: f32,
    pub distance: f32,

    pub fov: f32,
    pub near: f32,
    pub far: f32,
    pub aspect: f32,
}

#[derive(Clone, Copy)]
struct DragRay {
    origin: [f32; 3],
    dir: [f32; 3],
}

#[wasm_bindgen]
pub struct Engine {
    time: f32,
    delta: f32,

    next_entity: Entity,

    transforms: Vec<Option<Transform>>,
    velocities: Vec<Option<Velocity>>,

    selected: Vec<bool>,
    dragging: Vec<bool>,
    drag_offset: Vec<[f32; 3]>,
    current_drag_ray: Option<DragRay>,

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
            selected: Vec::new(),
            dragging: Vec::new(),
            drag_offset: Vec::new(),
            current_drag_ray: None,
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
        self.update_drag_system();
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
    fn orbit_position(cam: &Camera) -> [f32; 3] {
        let x = cam.distance * cam.pitch.cos() * cam.yaw.sin();
        let y = cam.distance * cam.pitch.sin();
        let z = cam.distance * cam.pitch.cos() * cam.yaw.cos();

        [cam.target[0] + x, cam.target[1] + y, cam.target[2] + z]
    }
    pub fn camera_orbit(&mut self, dx: f32, dy: f32) {
        if let Some(ref mut cam) = self.camera {
            cam.yaw += dx;
            cam.pitch += dy;

            cam.pitch = cam.pitch.clamp(-1.5, 1.5);
        }
    }

    pub fn camera_zoom(&mut self, delta: f32) {
        if let Some(ref mut cam) = self.camera {
            cam.distance += delta;
            cam.distance = cam.distance.clamp(1.5, 50.0);
        }
    }

    pub fn camera_pan(&mut self, dx: f32, dy: f32) {
        if let Some(ref mut cam) = self.camera {
            cam.target[0] += dx;
            cam.target[1] += dy;
        }
    }

    fn update_camera(&mut self) {
        if let Some(cam) = self.camera {
            let eye = Self::orbit_position(&cam);

            let proj = Self::perspective(cam.fov, cam.aspect, cam.near, cam.far);

            let view = Self::view_matrix(eye, cam.target);

            self.view_proj = Self::mul_mat4(proj, view);
        }
    }
    fn view_matrix(eye: [f32; 3], target: [f32; 3]) -> [f32; 16] {
        let fx = target[0] - eye[0];
        let fy = target[1] - eye[1];
        let fz = target[2] - eye[2];

        let fl = (fx * fx + fy * fy + fz * fz).sqrt();
        let fx = fx / fl;
        let fy = fy / fl;
        let fz = fz / fl;

        let up = [0.0, 1.0, 0.0];

        let sx = fy * up[2] - fz * up[1];
        let sy = fz * up[0] - fx * up[2];
        let sz = fx * up[1] - fy * up[0];

        let sl = (sx * sx + sy * sy + sz * sz).sqrt();
        let sx = sx / sl;
        let sy = sy / sl;
        let sz = sz / sl;

        let ux = sy * fz - sz * fy;
        let uy = sz * fx - sx * fz;
        let uz = sx * fy - sy * fx;

        [
            sx,
            ux,
            -fx,
            0.0,
            sy,
            uy,
            -fy,
            0.0,
            sz,
            uz,
            -fz,
            0.0,
            -(sx * eye[0] + sy * eye[1] + sz * eye[2]),
            -(ux * eye[0] + uy * eye[1] + uz * eye[2]),
            fx * eye[0] + fy * eye[1] + fz * eye[2],
            1.0,
        ]
    }

    fn perspective(fov: f32, aspect: f32, near: f32, far: f32) -> [f32; 16] {
        let f = 1.0 / (fov / 2.0).tan();
        let nf = 1.0 / (near - far);

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
            (far + near) * nf,
            -1.0,
            0.0,
            0.0,
            (2.0 * far * near) * nf,
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

        // Column-major
        [
            sx * c,
            0.0,
            sx * s,
            0.0,
            0.0,
            sy,
            0.0,
            0.0,
            -sz * s,
            0.0,
            sz * c,
            0.0,
            px,
            py,
            pz,
            1.0,
        ]
    }
    fn transform_point(m: [f32; 16], p: [f32; 3]) -> [f32; 3] {
        [
            m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
            m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
            m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
        ]
    }

    fn transform_dir(m: [f32; 16], d: [f32; 3]) -> [f32; 3] {
        [
            m[0] * d[0] + m[4] * d[1] + m[8] * d[2],
            m[1] * d[0] + m[5] * d[1] + m[9] * d[2],
            m[2] * d[0] + m[6] * d[1] + m[10] * d[2],
        ]
    }

    fn invert_model(t: Transform) -> [f32; 16] {
        let sx = t.scale[0];
        let sy = t.scale[1];
        let sz = t.scale[2];

        let px = t.position[0];
        let py = t.position[1];
        let pz = t.position[2];

        let ry = t.rotation[1];
        let c = ry.cos();
        let s = ry.sin();

        let isx = 1.0 / sx;
        let isy = 1.0 / sy;
        let isz = 1.0 / sz;

        // Column-major inverse
        [
            isx * c,
            0.0,
            -isz * s,
            0.0,
            0.0,
            isy,
            0.0,
            0.0,
            isx * s,
            0.0,
            isz * c,
            0.0,
            -(px * isx * c + pz * isx * s),
            -py * isy,
            -(-px * isz * s + pz * isz * c),
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
                if self.selected[i] {
                    self.render_buffer.extend_from_slice(&[1.0, 0.3, 0.1, 1.0]); // highlight
                } else {
                    self.render_buffer.extend_from_slice(&[0.2, 0.7, 1.0, 1.0]); // default
                }
            }
        }
    }

    fn ray_plane_intersection(
        ray_origin: [f32; 3],
        ray_dir: [f32; 3],
        plane_y: f32,
    ) -> Option<[f32; 3]> {
        if ray_dir[1].abs() < 0.0001 {
            return None; // parallel to plane
        }

        let t = (plane_y - ray_origin[1]) / ray_dir[1];

        if t < 0.0 {
            return None;
        }

        Some([
            ray_origin[0] + ray_dir[0] * t,
            plane_y,
            ray_origin[2] + ray_dir[2] * t,
        ])
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
    fn ray_aabb(origin: [f32; 3], dir: [f32; 3]) -> Option<f32> {
        let min = [-0.5, -0.5, -0.5];
        let max = [0.5, 0.5, 0.5];

        let mut tmin = (min[0] - origin[0]) / dir[0];
        let mut tmax = (max[0] - origin[0]) / dir[0];

        if tmin > tmax {
            std::mem::swap(&mut tmin, &mut tmax);
        }

        for i in 1..3 {
            let mut t1 = (min[i] - origin[i]) / dir[i];
            let mut t2 = (max[i] - origin[i]) / dir[i];

            if t1 > t2 {
                std::mem::swap(&mut t1, &mut t2);
            }

            if tmin > t2 || t1 > tmax {
                return None;
            }

            tmin = tmin.max(t1);
            tmax = tmax.min(t2);
        }

        if tmin < 0.0 { None } else { Some(tmin) }
    }
    pub fn focus_selected(&mut self) {
        if let Some(ref mut cam) = self.camera {
            let mut count = 0;
            let mut center = [0.0, 0.0, 0.0];

            for (i, is_selected) in self.selected.iter().enumerate() {
                if *is_selected {
                    if let Some(t) = self.transforms[i] {
                        center[0] += t.position[0];
                        center[1] += t.position[1];
                        center[2] += t.position[2];
                        count += 1;
                    }
                }
            }

            if count > 0 {
                center[0] /= count as f32;
                center[1] /= count as f32;
                center[2] /= count as f32;

                cam.target = center;
            }
        }
    }

    pub fn create_entity(&mut self) -> Entity {
        let id = self.next_entity;
        self.next_entity += 1;

        self.transforms.push(None);
        self.velocities.push(None);
        self.selected.push(false);
        self.dragging.push(false);
        self.drag_offset.push([0.0, 0.0, 0.0]);

        id
    }

    pub fn begin_drag(
        &mut self,
        entity: u32,
        ox: f32,
        oy: f32,
        oz: f32,
        dx: f32,
        dy: f32,
        dz: f32,
    ) {
        let origin = [ox, oy, oz];
        let dir = [dx, dy, dz];

        if let Some(hit_point) = Self::ray_plane_intersection(origin, dir, 0.0) {
            // reference position = hit_point

            for (i, selected) in self.selected.iter().enumerate() {
                if *selected {
                    if let Some(t) = self.transforms[i] {
                        self.dragging[i] = true;

                        self.drag_offset[i] = [
                            t.position[0] - hit_point[0],
                            t.position[1] - hit_point[1],
                            t.position[2] - hit_point[2],
                        ];
                    }
                }
            }
        }
    }
    pub fn end_drag(&mut self) {
        for i in 0..self.dragging.len() {
            self.dragging[i] = false;
        }

        self.current_drag_ray = None;
    }

    fn update_drag_system(&mut self) {
        if let Some(ray) = self.current_drag_ray {
            if let Some(hit_point) = Self::ray_plane_intersection(ray.origin, ray.dir, 0.0) {
                for i in 0..self.transforms.len() {
                    if self.dragging[i] {
                        if let Some(mut t) = self.transforms[i] {
                            t.position[0] = hit_point[0] + self.drag_offset[i][0];
                            t.position[1] = hit_point[1] + self.drag_offset[i][1];
                            t.position[2] = hit_point[2] + self.drag_offset[i][2];

                            self.transforms[i] = Some(t);
                        }
                    }
                }
            }
        }
    }
    pub fn update_drag_ray(&mut self, ox: f32, oy: f32, oz: f32, dx: f32, dy: f32, dz: f32) {
        self.current_drag_ray = Some(DragRay {
            origin: [ox, oy, oz],
            dir: [dx, dy, dz],
        });
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
        // Default orbit target at origin
        let target = [0.0, 0.0, 0.0];

        // Compute vector from target → camera
        let dx = px - target[0];
        let dy = py - target[1];
        let dz = pz - target[2];

        let distance = (dx * dx + dy * dy + dz * dz).sqrt();

        // Prevent divide-by-zero
        let safe_distance = if distance < 0.0001 { 0.0001 } else { distance };

        let pitch = (dy / safe_distance).asin();
        let yaw = dx.atan2(dz);

        self.camera = Some(Camera {
            target,
            yaw,
            pitch,
            distance: safe_distance,
            fov,
            near,
            far,
            aspect,
        });
    }
    // ===== Ray Picking =====
    pub fn pick(
        &mut self,
        ox: f32,
        oy: f32,
        oz: f32,
        dx: f32,
        dy: f32,
        dz: f32,
        additive: bool,
        toggle: bool,
    ) -> i32 {
        let origin = [ox, oy, oz];
        let dir = [dx, dy, dz];

        let mut closest = -1;
        let mut closest_t = f32::MAX;

        for (i, transform) in self.transforms.iter().enumerate() {
            if let Some(t) = transform {
                let inv_model = Self::invert_model(*t);

                let local_origin = Self::transform_point(inv_model, origin);
                let local_dir = Self::transform_dir(inv_model, dir);

                if let Some(t_hit) = Self::ray_aabb(local_origin, local_dir) {
                    if t_hit < closest_t {
                        closest_t = t_hit;
                        closest = i as i32;
                    }
                }
            }
        }

        if closest >= 0 {
            let idx = closest as usize;

            if toggle {
                self.selected[idx] = !self.selected[idx];
            } else if additive {
                self.selected[idx] = true;
            } else {
                // normal click: clear everything then select one
                for s in self.selected.iter_mut() {
                    *s = false;
                }
                self.selected[idx] = true;
            }
        }
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
