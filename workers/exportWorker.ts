/// <reference lib="webworker" />

import JSZip from 'jszip';

type WorkerAction = 'bundleZip';

interface WorkerRequest {
  id: string;
  action: WorkerAction;
  payload: Record<string, unknown>;
}

interface BundleZipPayload {
  files: Array<{ name: string; blob: Blob }>;
}

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, action, payload } = event.data;

  try {
    switch (action) {
      case 'bundleZip': {
        const { files } = payload as BundleZipPayload;
        const zip = new JSZip();
        for (const file of files) {
          zip.file(file.name, file.blob);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        ctx.postMessage({ id, success: true, blob });
        break;
      }
      default:
        throw new Error(`Unknown worker action: ${action}`);
    }
  } catch (error) {
    ctx.postMessage({ id, success: false, error: (error as Error).message });
  }
};

