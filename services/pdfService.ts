import i18n from '../i18n';

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

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
 * 依据指定 DOM 元素生成 PDF Blob，并返回文件名以便由调用方自定义下载流程。
 */
export const exportNotesToPDF = async (elementId: string, title?: string) => {
  const defaultTitle = i18n.t('common.meetingMinutes');
  const finalTitle = title || defaultTitle;
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(i18n.t('errors.elementNotFound'));
  }

  const html2canvas = await loadHtml2Canvas();
  const jsPDF = await loadJsPDF();

  // Generate canvas from the hidden HTML template with higher resolution to keep text sharp
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
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