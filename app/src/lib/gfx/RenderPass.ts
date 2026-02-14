export interface RenderPassLayer {
  draw(pass: GPURenderPassEncoder): void;
}

