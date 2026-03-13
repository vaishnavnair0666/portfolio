use wasm_bindgen::prelude::*;

struct Storage<T> {
    dense: Vec<T>,
    dense_entities: Vec<u32>,
    sparse: Vec<Option<usize>>,
}
impl<T> Storage<T> {
    fn new() -> Self {
        Self {
            dense: Vec::new(),
            dense_entities: Vec::new(),
            sparse: Vec::new(),
        }
    }
    fn clear(&mut self) {
        for &entity_index in &self.dense_entities {
            if let Some(slot) = self.sparse.get_mut(entity_index as usize) {
                *slot = None;
            }
        }

        self.dense.clear();
        self.dense_entities.clear();
    }
    fn contains(&self, entity: Entity) -> bool {
        self.sparse
            .get(entity.index as usize)
            .and_then(|o| *o)
            .is_some()
    }
    fn insert(&mut self, entity: Entity, component: T) {
        let index = entity.index as usize;

        if index >= self.sparse.len() {
            self.sparse.resize(index + 1, None);
        }

        if let Some(dense_index) = self.sparse[index] {
            self.dense[dense_index] = component;
            return;
        }

        let dense_index = self.dense.len();

        self.dense.push(component);
        self.dense_entities.push(entity.index);
        self.sparse[index] = Some(dense_index);
    }
    fn remove_entity(&mut self, entity: Entity) {
        let index = entity.index as usize;

        if index >= self.sparse.len() {
            return;
        }

        let Some(dense_index) = self.sparse[index] else {
            return;
        };

        let last_dense = self.dense.len() - 1;

        self.dense.swap(dense_index, last_dense);
        self.dense_entities.swap(dense_index, last_dense);

        let moved_entity = self.dense_entities[dense_index];
        self.sparse[moved_entity as usize] = Some(dense_index);

        self.dense.pop();
        self.dense_entities.pop();
        self.sparse[index] = None;
    }
    fn get_mut(&mut self, entity: Entity) -> Option<&mut T> {
        let index = entity.index as usize;

        if index >= self.sparse.len() {
            return None;
        }

        let dense_index = self.sparse[index]?;
        self.dense.get_mut(dense_index)
    }
    fn get(&self, entity: Entity) -> Option<&T> {
        let index = entity.index as usize;

        if index >= self.sparse.len() {
            return None;
        }

        let dense_index = self.sparse[index]?;
        self.dense.get(dense_index)
    }
    fn iter(&self) -> impl Iterator<Item = (u32, &T)> {
        self.dense_entities.iter().copied().zip(self.dense.iter())
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Entity {
    index: u32,
    generation: u32,
}
#[derive(Clone, Copy)]
pub struct Color {
    pub rgb: [f32; 3],
}
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
    static_objects: Storage<()>,
    generations: Vec<u32>,
    free_indices: Vec<u32>,
    colors: Storage<Color>,
    transforms: Storage<Transform>,
    velocities: Storage<Velocity>,
    selected: Storage<()>,
    dragging: Storage<[f32; 3]>, // offset stored directly
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
            static_objects: Storage::new(),
            generations: Vec::new(),
            free_indices: Vec::new(),
            colors: Storage::new(),
            transforms: Storage::new(),
            velocities: Storage::new(),
            selected: Storage::new(),
            dragging: Storage::new(),
            current_drag_ray: None,
            camera: None,
            render_buffer: Vec::new(),
            view_proj: [0.0; 16],
        }
    }

    pub fn entity_count(&self) -> usize {
        self.transforms.dense.len()
    }
    pub fn selected_count(&self) -> usize {
        self.selected.dense.len()
    }
    pub fn update(&mut self, delta: f32) {
        self.delta = delta;
        self.time += delta;

        self.update_drag_system();
        self.integrate_velocity();
        self.update_camera();
        self.build_render_buffer();
    }

    fn make_entity(&self, index: u32) -> Option<Entity> {
        let idx = index as usize;

        if idx >= self.generations.len() {
            return None;
        }

        Some(Entity {
            index,
            generation: self.generations[idx],
        })
    }
    pub fn set_static(&mut self, index: u32) {
        if let Some(entity) = self.make_entity(index) {
            self.static_objects.insert(entity, ());
        }
    }
    pub fn set_position(&mut self, index: u32, x: f32, y: f32, z: f32) {
        if let Some(entity) = self.make_entity(index) {
            if let Some(transform) = self.transforms.get_mut(entity) {
                transform.position = [x, y, z];
            }
        }
    }
    pub fn set_scale(&mut self, index: u32, sx: f32, sy: f32, sz: f32) {
        if let Some(entity) = self.make_entity(index) {
            if let Some(t) = self.transforms.get_mut(entity) {
                t.scale = [sx, sy, sz];
            }
        }
    }
    pub fn add_color(&mut self, index: u32, r: f32, g: f32, b: f32) {
        if let Some(entity) = self.make_entity(index) {
            self.colors.insert(entity, Color { rgb: [r, g, b] });
        }
    }
    pub fn set_selected_color(&mut self, r: f32, g: f32, b: f32) {
        for (entity_index, _) in self.selected.iter() {
            let entity = Entity {
                index: entity_index,
                generation: self.generations[entity_index as usize],
            };

            if let Some(color) = self.colors.get_mut(entity) {
                color.rgb = [r, g, b];
            }
        }
    }
    fn integrate_velocity(&mut self) {
        for (entity_index, velocity) in self.velocities.iter() {
            let entity = Entity {
                index: entity_index,
                generation: self.generations[entity_index as usize],
            };
            if self.static_objects.contains(entity) {
                continue;
            }
            if let Some(transform) = self.transforms.get_mut(entity) {
                transform.position[0] += velocity.linear[0] * self.delta;
                transform.position[1] += velocity.linear[1] * self.delta;
                transform.position[2] += velocity.linear[2] * self.delta;
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

        for (entity_index, transform) in self.transforms.iter() {
            let entity = Entity {
                index: entity_index,
                generation: self.generations[entity_index as usize],
            };

            let model = Self::model_matrix(*transform);
            self.render_buffer.extend_from_slice(&model);

            let mut color = if let Some(c) = self.colors.get(entity) {
                [c.rgb[0], c.rgb[1], c.rgb[2], 1.0]
            } else {
                [0.2, 0.7, 1.0, 1.0] // fallback default
            };

            if self.selected.contains(entity) {
                // brighten selected cubes slightly
                color[0] = (color[0] + 0.3).min(1.0);
                color[1] = (color[1] + 0.3).min(1.0);
                color[2] = (color[2] + 0.3).min(1.0);
            }

            self.render_buffer.extend_from_slice(&color);
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

    // ===== ENTITY =====
    fn ray_aabb(origin: [f32; 3], dir: [f32; 3]) -> Option<f32> {
        let min = [-0.5, -0.5, -0.5];
        let max = [0.5, 0.5, 0.5];

        let mut tmin = f32::NEG_INFINITY;
        let mut tmax = f32::INFINITY;

        for i in 0..3 {
            if dir[i].abs() < 1e-6 {
                if origin[i] < min[i] || origin[i] > max[i] {
                    return None;
                }
            } else {
                let inv = 1.0 / dir[i];
                let mut t1 = (min[i] - origin[i]) * inv;
                let mut t2 = (max[i] - origin[i]) * inv;

                if t1 > t2 {
                    std::mem::swap(&mut t1, &mut t2);
                }

                tmin = tmin.max(t1);
                tmax = tmax.min(t2);

                if tmin > tmax {
                    return None;
                }
            }
        }

        if tmax < 0.0 {
            None
        } else {
            Some(tmin.max(0.0))
        }
    }
    pub fn focus_selected(&mut self) {
        if let Some(ref mut cam) = self.camera {
            let mut count = 0;
            let mut center = [0.0, 0.0, 0.0];

            for (entity_index, _) in self.selected.iter() {
                let entity = Entity {
                    index: entity_index,
                    generation: self.generations[entity_index as usize],
                };

                if let Some(transform) = self.transforms.get_mut(entity) {
                    center[0] += transform.position[0];
                    center[1] += transform.position[1];
                    center[2] += transform.position[2];
                    count += 1;
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

    pub fn create_entity(&mut self) -> u32 {
        if let Some(index) = self.free_indices.pop() {
            index
        } else {
            let index = self.generations.len() as u32;
            self.generations.push(0);
            index
        }
    }
    pub fn destroy_entity(&mut self, index: u32) {
        let Some(entity) = self.make_entity(index) else {
            return;
        };

        let idx = entity.index as usize;

        if self.generations[idx] != entity.generation {
            return;
        }

        self.generations[idx] += 1;
        self.free_indices.push(index);

        self.transforms.remove_entity(entity);
        self.velocities.remove_entity(entity);
        self.selected.remove_entity(entity);
        self.dragging.remove_entity(entity);
    }
    pub fn add_transform(
        &mut self,
        index: u32,
        px: f32,
        py: f32,
        pz: f32,
        rx: f32,
        ry: f32,
        rz: f32,
    ) {
        if let Some(entity) = self.make_entity(index) {
            self.transforms.insert(
                entity,
                Transform {
                    position: [px, py, pz],
                    rotation: [rx, ry, rz],
                    scale: [0.5, 0.5, 0.5],
                },
            );
        }
    }
    pub fn add_velocity(&mut self, index: u32, vx: f32, vy: f32, vz: f32) {
        if let Some(entity) = self.make_entity(index) {
            self.velocities.insert(
                entity,
                Velocity {
                    linear: [vx, vy, vz],
                },
            );
        }
    }

    pub fn begin_drag(&mut self, ox: f32, oy: f32, oz: f32, dx: f32, dy: f32, dz: f32) {
        let origin = [ox, oy, oz];
        let dir = [dx, dy, dz];

        if let Some(hit_point) = Self::ray_plane_intersection(origin, dir, 0.0) {
            for (entity_index, _) in self.selected.iter() {
                let entity = Entity {
                    index: entity_index,
                    generation: self.generations[entity_index as usize],
                };
                if self.static_objects.contains(entity) {
                    continue;
                }
                if let Some(transform) = self.transforms.get_mut(entity) {
                    let offset = [
                        transform.position[0] - hit_point[0],
                        transform.position[1] - hit_point[1],
                        transform.position[2] - hit_point[2],
                    ];

                    self.dragging.insert(entity, offset);
                }
            }
        }
    }
    pub fn end_drag(&mut self) {
        self.dragging.clear();
        self.current_drag_ray = None;
    }

    fn update_drag_system(&mut self) {
        if let Some(ray) = self.current_drag_ray {
            if let Some(hit_point) = Self::ray_plane_intersection(ray.origin, ray.dir, 0.0) {
                for (entity_index, offset) in self.dragging.iter() {
                    let entity = Entity {
                        index: entity_index,
                        generation: self.generations[entity_index as usize],
                    };

                    if let Some(transform) = self.transforms.get_mut(entity) {
                        transform.position[0] = hit_point[0] + offset[0];
                        transform.position[1] = hit_point[1] + offset[1];
                        transform.position[2] = hit_point[2] + offset[2];
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

        let mut closest_entity: Option<Entity> = None;
        let mut closest_t = f32::MAX;

        // Iterate only entities with Transform
        for (entity_index, transform) in self.transforms.iter() {
            let entity = Entity {
                index: entity_index,
                generation: self.generations[entity_index as usize],
            };

            let inv_model = Self::invert_model(*transform);

            let local_origin = Self::transform_point(inv_model, origin);
            let local_dir = Self::transform_dir(inv_model, dir);

            if let Some(t_hit) = Self::ray_aabb(local_origin, local_dir) {
                if t_hit < closest_t {
                    closest_t = t_hit;
                    closest_entity = Some(entity);
                }
            }
        }

        if let Some(entity) = closest_entity {
            let is_selected = self.selected.contains(entity);

            if toggle {
                if is_selected {
                    self.selected.remove_entity(entity);
                } else {
                    self.selected.insert(entity, ());
                }
            } else if additive {
                self.selected.insert(entity, ());
            } else {
                // Clear previous selection
                self.selected.clear();
                self.selected.insert(entity, ());
            }

            return entity.index as i32;
        }

        -1
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
