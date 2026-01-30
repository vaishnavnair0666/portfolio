export class Interaction {
  mouseX = 0.5;
  mouseY = 0.5;
  interaction = 0.0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width;
      this.mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
      this.interaction = 1.0;
    });
  }

  update() {
    if (this.interaction > 0.005) {
      this.interaction *= 0.9;
    }
  }
}

