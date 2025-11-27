import i18n from '../i18n';

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

interface PdfExportAttachment {
  id: string;
  imageUrl: string;
  timestampLabel?: string;
}

interface PdfExportOptions {
  attachments?: PdfExportAttachment[];
}

let html2canvasModulePromise: Promise<typeof import('html2canvas')> | null = null;
let jsPdfModulePromise: Promise<typeof import('jspdf')> | null = null;

/**
 * 懒加载 html2canvas，避免首屏同步引入重型渲染库。
 */
const loadHtml2Canvas = async () => {
  if (!html2canvasModulePromise) {
    html2canvasModulePromise = import('html2canvas');
  }
  const module = await html2canvasModulePromise;
  return module.default;
};

/**
 * 懒加载 jsPDF，导出时按需获取构造函数以减小主 bundle。
 */
const loadJsPDF = async () => {
  if (!jsPdfModulePromise) {
    jsPdfModulePromise = import('jspdf');
  }
  const module = await jsPdfModulePromise;
  return module.jsPDF;
};

/**
 * 根据 data URL 推断图片格式，默认为 PNG。
 */
const getImageFormatFromDataUrl = (dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' => {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG';
  }
  if (dataUrl.startsWith('data:image/webp')) {
    return 'WEBP';
  }
  return 'PNG';
};

/**
 * 异步获取图片的原始尺寸，用于在 PDF 中按比例缩放。
 */
const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  });
};

/**
 * 依据指定 DOM 元素生成 PDF Blob，并返回文件名以便由调用方自定义下载流程。
 */
export const exportNotesToPDF = async (elementId: string, title?: string, options?: PdfExportOptions) => {
  const defaultTitle = i18n.t('common.meetingMinutes');
  const finalTitle = title || defaultTitle;
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(i18n.t('errors.elementNotFound'));
  }

  const html2canvas = await loadHtml2Canvas();
  const jsPDF = await loadJsPDF();
  const deviceScale = Math.max(window.devicePixelRatio || 1, 2);
  const targetWidth = element.scrollWidth || element.offsetWidth || 595;
  const targetHeight = element.scrollHeight || element.offsetHeight || 842;

  // Generate canvas from the hidden HTML template with higher resolution to keep text sharp
  const canvas = await html2canvas(element, {
    scale: deviceScale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: targetWidth,
    height: targetHeight,
    windowWidth: targetWidth,
    windowHeight: targetHeight,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Additional pages
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  if (options?.attachments?.length) {
    const marginX = 12;
    const marginY = 20;
    const availableWidth = pdfWidth - marginX * 2;
    const availableHeight = pdfHeight - marginY * 2;
    for (const attachment of options.attachments) {
      try {
        const { width, height } = await getImageDimensions(attachment.imageUrl);
        const scale = Math.min(availableWidth / width, availableHeight / height, 1);
        const renderWidth = width * scale;
        const renderHeight = height * scale;
        pdf.addPage();
        pdf.setFontSize(12);
        const attachmentLabel = attachment.timestampLabel
          ? `${i18n.t('common.attachment', { defaultValue: 'Attachment' })} • ${attachment.timestampLabel}`
          : i18n.t('common.attachment', { defaultValue: 'Attachment' });
        pdf.text(attachmentLabel, marginX, marginY - 6);
        pdf.addImage(
          attachment.imageUrl,
          getImageFormatFromDataUrl(attachment.imageUrl),
          marginX,
          marginY,
          renderWidth,
          renderHeight,
          attachment.id,
          'FAST'
        );
      } catch (error) {
        console.error('Failed to embed attachment image', error);
      }
    }
  }

  const sanitizedTitle = title
    .replace(ILLEGAL_FILENAME_CHARS, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'RecMind_Notes';

  return {
    blob: pdf.output('blob') as Blob,
    fileName: `${sanitizedTitle}.pdf`,
  };
};