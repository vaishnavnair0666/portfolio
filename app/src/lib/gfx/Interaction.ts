export class Interaction {
  mouseX = 0.5;
  mouseY = 0.5;
  interaction = 0.0;

  section = 0;
  sectionProgress = 0;

  scroll = 0.0;
  scrollSmooth = 0.0;
  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('mousemove', (e) => {
      this.mouseX=e.clientX/window.innerWidth;
      this.mouseY=e.clientY/window.innerHeight;
      this.interaction = 1.0;
    });

    window.addEventListener('scroll', () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;

      this.scroll = max > 0 ? window.scrollY / max : 0.0;
      this.scroll = Math.min(Math.max(this.scroll, 0.0), 1.0);
    });
  }

  update() {
    if (this.interaction > 0.005) {
      this.interaction *= 0.9;
    }

    const eased = easeInOut(this.scroll);
    this.scrollSmooth += (eased - this.scrollSmooth) * 0.08;

    const s = this.scrollSmooth;

    if (s < 0.25) {
      this.section = 0;
      this.sectionProgress = s / 0.25;
    } else if (s < 0.55) {
      this.section = 1;
      this.sectionProgress = (s - 0.25) / (0.55 - 0.25);
    } else if (s < 0.80) {
      this.section = 2;
      this.sectionProgress = (s - 0.55) / (0.80 - 0.55);
    } else {
      this.section = 3;
      this.sectionProgress = (s - 0.80) / (1.0 - 0.80);
    }
  }
}
function easeInOut(t: number): number {
  return t * t * (3.0 - 2.0 * t);
}

