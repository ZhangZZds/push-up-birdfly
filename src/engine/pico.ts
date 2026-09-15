/**
 * Pico.js face detection algorithm ported to TypeScript.
 * Extremely lightweight (<200 lines, 0 WASM, 0 GPU requirements).
 * Runs Viola-Jones style pixel cascades at ~1-2ms per frame in JS.
 * Reference: https://github.com/tehnokv/picojs
 */

export type ClassifyRegionFn = (
  r: number,
  c: number,
  s: number,
  pixels: Uint8Array,
  ldim: number
) => number;

export interface CascadeParams {
  shiftfactor: number;
  minsize: number;
  maxsize: number;
  scalefactor: number;
}

export interface GrayImage {
  pixels: Uint8Array;
  nrows: number;
  ncols: number;
  ldim: number;
}

// Detection: [row(y), col(x), size(diameter), score]
export type Detection = [number, number, number, number];

export function unpackCascade(bytes: Int8Array | Uint8Array): ClassifyRegionFn {
  const dview = new DataView(new ArrayBuffer(4));
  let p = 8;

  // Read the depth (size) of each tree: 32-bit signed integer
  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p += 4;

  // Read the number of trees in the cascade: 32-bit signed integer
  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p += 4;

  const tcodesList: number[] = [];
  const tpredsList: number[] = [];
  const threshList: number[] = [];

  const pow2tdepth = Math.pow(2, tdepth);

  for (let t = 0; t < ntrees; ++t) {
    // 4 dummy zeros for tree root index alignment
    tcodesList.push(0, 0, 0, 0);
    const codeCount = 4 * pow2tdepth - 4;
    for (let c = 0; c < codeCount; ++c) {
      tcodesList.push(bytes[p + c]);
    }
    p += codeCount;

    // Read prediction in leaf nodes
    for (let i = 0; i < pow2tdepth; ++i) {
      dview.setUint8(0, bytes[p + 0]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpredsList.push(dview.getFloat32(0, true));
      p += 4;
    }

    // Read threshold
    dview.setUint8(0, bytes[p + 0]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    threshList.push(dview.getFloat32(0, true));
    p += 4;
  }

  const tcodes = new Int8Array(tcodesList);
  const tpreds = new Float32Array(tpredsList);
  const thresh = new Float32Array(threshList);

  function classifyRegion(
    r: number,
    c: number,
    s: number,
    pixels: Uint8Array,
    ldim: number
  ): number {
    const scaledR = 256 * r;
    const scaledC = 256 * c;
    let root = 0;
    let o = 0.0;
    const pow2 = pow2tdepth >> 0;

    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        const r1 = (scaledR + tcodes[root + 4 * idx + 0] * s) >> 8;
        const c1 = (scaledC + tcodes[root + 4 * idx + 1] * s) >> 8;
        const r2 = (scaledR + tcodes[root + 4 * idx + 2] * s) >> 8;
        const c2 = (scaledC + tcodes[root + 4 * idx + 3] * s) >> 8;

        const pix1 = pixels[r1 * ldim + c1];
        const pix2 = pixels[r2 * ldim + c2];
        idx = 2 * idx + (pix1 <= pix2 ? 1 : 0);
      }

      o += tpreds[pow2 * i + idx - pow2];
      if (o <= thresh[i]) {
        return -1;
      }
      root += 4 * pow2;
    }

    return o - thresh[ntrees - 1];
  }

  return classifyRegion;
}

export function runCascade(
  image: GrayImage,
  classifyRegion: ClassifyRegionFn,
  params: CascadeParams
): Detection[] {
  const { pixels, nrows, ncols, ldim } = image;
  const { shiftfactor, minsize, maxsize, scalefactor } = params;

  let scale = minsize;
  const detections: Detection[] = [];

  while (scale <= maxsize) {
    const step = Math.max((shiftfactor * scale) >> 0, 1);
    const offset = (scale / 2 + 1) >> 0;

    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ldim);
        if (q > 0.0) {
          detections.push([r, c, scale, q]);
        }
      }
    }
    scale *= scalefactor;
  }

  return detections;
}

function calculateIoU(det1: Detection, det2: Detection): number {
  const [r1, c1, s1] = det1;
  const [r2, c2, s2] = det2;

  const overr = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2));
  const overc = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2));

  return (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
}

export function clusterDetections(
  dets: Detection[],
  iouThreshold: number = 0.2
): Detection[] {
  dets.sort((a, b) => b[3] - a[3]);

  const assignments = new Uint8Array(dets.length);
  const clusters: Detection[] = [];

  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0.0;
      let c = 0.0;
      let s = 0.0;
      let q = 0.0;
      let n = 0;

      for (let j = i; j < dets.length; ++j) {
        if (calculateIoU(dets[i], dets[j]) > iouThreshold) {
          assignments[j] = 1;
          r += dets[j][0];
          c += dets[j][1];
          s += dets[j][2];
          q += dets[j][3];
          n += 1;
        }
      }

      clusters.push([r / n, c / n, s / n, q]);
    }
  }

  return clusters;
}

export function instantiateDetectionMemory(size: number) {
  let n = 0;
  const memory: Detection[][] = [];
  for (let i = 0; i < size; ++i) {
    memory.push([]);
  }

  return function updateMemory(dets: Detection[]): Detection[] {
    memory[n] = dets;
    n = (n + 1) % memory.length;
    let all: Detection[] = [];
    for (let i = 0; i < memory.length; ++i) {
      all = all.concat(memory[i]);
    }
    return all;
  };
}
