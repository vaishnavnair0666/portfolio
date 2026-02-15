export class Uniforms {
  readonly data: Float32Array;

  constructor(buffer: ArrayBufferLike, length = 16) {
    this.data = new Float32Array(buffer, 0, length);
  }

  setResolution(w: number, h: number, dpr: number) {
    this.data[1] = w;
    this.data[2] = h;
    this.data[3] = dpr;
  }

  setDesign() {
    this.data[4] = 0.4;
    this.data[5] = 1.0;
    this.data[6] = 0.02;
    this.data[7] = 0.05;
    this.data[8] = 2.0;
    this.data[9] = 80.0;
  }

  setInteraction(x: number, y: number, i: number) {
    this.data[10] = x;
    this.data[11] = y;
    this.data[12] = i;
  }

  setScroll(scroll: number, scrollSmooth: number) {
    this.data[13] = scroll;
    this.data[14] = scrollSmooth;
  }
  setSection(section: number, progress: number) {
    this.data[15] = section;
    // this.data[16] = progress;
  }
}
