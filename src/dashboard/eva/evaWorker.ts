import { drawEvaStageBackground } from './background';
import { drawEvaBodyLayer } from './body';
import { drawEvaDripsLayer } from './drips';
import { drawEvaEyeLayer, drawEvaPupilLayer } from './eye';
import { createEvaDrawOrderRecorder } from './evaSurface';
import { drawEvaHeadLayer } from './head';
import { drawEvaJawLayer } from './jaw';

export interface EvaWorkerRequest {
  id: number;
  eyeGlint: boolean;
  isMobile: boolean;
}

export interface EvaWorkerResponse {
  id: number;
  backgroundBitmap: ImageBitmap;
  backgroundOrderBitmap: ImageBitmap;
  bodyBitmap: ImageBitmap;
  bodyOrderBitmap: ImageBitmap;
  headBitmap: ImageBitmap;
  headOrderBitmap: ImageBitmap;
  jawBitmap: ImageBitmap;
  jawOrderBitmap: ImageBitmap;
  eyeBitmap: ImageBitmap;
  pupilBitmap: ImageBitmap;
  dripsBitmap: ImageBitmap;
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
  const mainSize = isMobile ? 768 : 1024;
  const dripsSize = 512;
  const eyeSize = 256;

  const bg = renderLayerWithOrder(mainSize, (ctx, c, rec) =>
    drawEvaStageBackground(ctx, c, rec, 701)
  );
  const body = renderLayerWithOrder(mainSize, (ctx, c, rec) =>
    drawEvaBodyLayer(ctx, c, rec, 709)
  );
  const head = renderLayerWithOrder(mainSize, (ctx, c, rec) =>
    drawEvaHeadLayer(ctx, c, rec, 719)
  );
  const jaw = renderLayerWithOrder(mainSize, (ctx, c, rec) =>
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

  const response: EvaWorkerResponse = {
    id,
    backgroundBitmap: bg.bitmap,
    backgroundOrderBitmap: bg.orderBitmap,
    bodyBitmap: body.bitmap,
    bodyOrderBitmap: body.orderBitmap,
    headBitmap: head.bitmap,
    headOrderBitmap: head.orderBitmap,
    jawBitmap: jaw.bitmap,
    jawOrderBitmap: jaw.orderBitmap,
    eyeBitmap,
    pupilBitmap,
    dripsBitmap,
  };

  workerScope.postMessage(response, [
    bg.bitmap,
    bg.orderBitmap,
    body.bitmap,
    body.orderBitmap,
    head.bitmap,
    head.orderBitmap,
    jaw.bitmap,
    jaw.orderBitmap,
    eyeBitmap,
    pupilBitmap,
    dripsBitmap,
  ]);
};
