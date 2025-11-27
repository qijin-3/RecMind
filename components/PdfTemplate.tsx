import React from 'react';
import { TFunction } from 'i18next';
import { Note } from '../types';

interface PdfTemplateProps {
  t: TFunction;
  notes: Note[];
  formatTime: (seconds: number) => string;
}

/**
 * 隐藏的 PDF 导出模板，与 html2canvas 协同生成高保真页面。
 */
const PdfTemplate: React.FC<PdfTemplateProps> = ({ t, notes, formatTime }) => (
  <div
    id="pdf-export-content"
    className="fixed top-0 left-[-9999px] w-[595px] bg-white p-10 font-serif text-gray-900 pointer-events-none"
  >
    <h1 className="text-3xl font-bold mb-4 text-gray-800 border-b-2 border-gray-800 pb-2">{t('common.meetingMinutes')}</h1>
    <p className="text-sm font-mono text-gray-500 mb-8">
      {t('common.date')}: {new Date().toLocaleDateString()}
    </p>

    <div className="space-y-6">
      {notes.map(note => (
        <div key={note.id} className="flex gap-4">
          <div className="w-16 pt-1 font-mono text-xs font-bold text-gray-500 shrink-0">{formatTime(note.timestamp / 1000)}</div>
          <div className="flex-1">
            <p className="text-base leading-relaxed whitespace-pre-wrap mb-2 font-serif">{note.text}</p>
            {note.imageUrl && (
              <img
                src={note.imageUrl}
                className="w-full max-w-full border border-gray-800 rounded-sm shadow-sm"
                style={{ objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default React.memo(PdfTemplate);

