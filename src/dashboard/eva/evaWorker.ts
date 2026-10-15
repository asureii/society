import { drawEvaStageBackground, drawHandInkedRoadPuddle } from './background.ts';
import { drawEvaNeckLayer, drawEvaTorsoLayer } from './body.ts';
import { drawEvaDripsLayer } from './drips.ts';
import { drawEvaEyeLayer, drawEvaPupilLayer } from './eye.ts';
import { createEvaDrawOrderRecorder } from './evaSurface.ts';
import { drawEvaHeadLayer } from './head.ts';
import { drawEvaJawLayer } from './jaw.ts';

export interface EvaWorkerRequest {
  id: number;
  eyeGlint: boolean;
  isMobile: boolean;
}

export interface EvaWorkerResponse {
  id: number;
  backgroundBitmap: ImageBitmap;
  backgroundOrderBitmap: ImageBitmap;
  torsoBitmap: ImageBitmap;
  torsoOrderBitmap: ImageBitmap;
  neckBitmap: ImageBitmap;
  neckOrderBitmap: ImageBitmap;
  headBitmap: ImageBitmap;
  headOrderBitmap: ImageBitmap;
  jawBitmap: ImageBitmap;
  jawOrderBitmap: ImageBitmap;
  eyeBitmap: ImageBitmap;
  pupilBitmap: ImageBitmap;
  dripsBitmap: ImageBitmap;
  puddleBitmap: ImageBitmap;
}

function renderLayerWithOrder(
  size: number,
  drawFn: (
    ctx: OffscreenCanvasRenderingContext2D,
    canvas: OffscreenCanvas,
    recorder: ReturnType<typeof createEvaDrawOrderRecorder>
  ) => void
): { bitmap: ImageBitmap; orderBitmap: ImageBitmap } {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const recorder = createEvaDrawOrderRecorder(size, size, true);
  drawFn(ctx, canvas, recorder);
  const orderCanvas = recorder.finalizeCanvas() as OffscreenCanvas;
  return {
    bitmap: canvas.transferToImageBitmap(),
    orderBitmap: orderCanvas.transferToImageBitmap(),
  };
}

function renderSimpleLayer(
  size: number,
  drawFn: (ctx: OffscreenCanvasRenderingContext2D, canvas: OffscreenCanvas) => void
): ImageBitmap {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, canvas);
  return canvas.transferToImageBitmap();
}

const workerScope = self as unknown as {
  onmessage: ((ev: MessageEvent<EvaWorkerRequest>) => void) | null;
  postMessage: (message: EvaWorkerResponse, transfer: Transferable[]) => void;
};

workerScope.onmessage = (ev: MessageEvent<EvaWorkerRequest>) => {
  const { id, eyeGlint, isMobile } = ev.data;
  const bgSize = isMobile ? 768 : 1024;
  const primarySize = isMobile ? 512 : 768;
  const dripsSize = 512;
  const eyeSize = 256;

  const bg = renderLayerWithOrder(bgSize, (ctx, c, rec) =>
    drawEvaStageBackground(ctx, c, rec, 701)
  );
  const torso = renderLayerWithOrder(primarySize, (ctx, c, rec) =>
    drawEvaTorsoLayer(ctx, c, rec, 709)
  );
  const neck = renderLayerWithOrder(primarySize, (ctx, c, rec) =>
    drawEvaNeckLayer(ctx, c, rec, 707)
  );
  const head = renderLayerWithOrder(primarySize, (ctx, c, rec) =>
    drawEvaHeadLayer(ctx, c, rec, 719)
  );
  const jaw = renderLayerWithOrder(primarySize, (ctx, c, rec) =>
    drawEvaJawLayer(ctx, c, rec, 727)
  );
  const eyeBitmap = renderSimpleLayer(eyeSize, (ctx, c) =>
    drawEvaEyeLayer(ctx, c, 733)
  );
  const pupilBitmap = renderSimpleLayer(eyeSize, (ctx, c) =>
    drawEvaPupilLayer(ctx, c, eyeGlint, 739)
  );
  const dripsBitmap = renderSimpleLayer(dripsSize, (ctx, c) =>
    drawEvaDripsLayer(ctx, c, 743)
  );

  const puddleCanvas = new OffscreenCanvas(256, 128);
  const puddleCtx = puddleCanvas.getContext('2d')!;
  drawHandInkedRoadPuddle(puddleCtx, 128, 64, 96, 28, 715);
  const puddleBitmap = puddleCanvas.transferToImageBitmap();

  const response: EvaWorkerResponse = {
    id,
    backgroundBitmap: bg.bitmap,
    backgroundOrderBitmap: bg.orderBitmap,
    torsoBitmap: torso.bitmap,
    torsoOrderBitmap: torso.orderBitmap,
    neckBitmap: neck.bitmap,
    neckOrderBitmap: neck.orderBitmap,
    headBitmap: head.bitmap,
    headOrderBitmap: head.orderBitmap,
    jawBitmap: jaw.bitmap,
    jawOrderBitmap: jaw.orderBitmap,
    eyeBitmap,
    pupilBitmap,
    dripsBitmap,
    puddleBitmap,
  };

  workerScope.postMessage(response, [
    bg.bitmap,
    bg.orderBitmap,
    torso.bitmap,
    torso.orderBitmap,
    neck.bitmap,
    neck.orderBitmap,
    head.bitmap,
    head.orderBitmap,
    jaw.bitmap,
    jaw.orderBitmap,
    eyeBitmap,
    pupilBitmap,
    dripsBitmap,
    puddleBitmap,
  ]);
};
