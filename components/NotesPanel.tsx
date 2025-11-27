import React from 'react';
import { TFunction } from 'i18next';
import { Download, Trash2, Pencil, X, Check, Plus, Image as ImageIcon } from 'lucide-react';
import { Note } from '../types';

interface NotesPanelProps {
  t: TFunction;
  notes: Note[];
  editingNoteId: string | null;
  editText: string;
  currentNote: string;
  isRecordingActive: boolean;
  audioBlob: Blob | null;
  onExport: () => void;
  onStartEdit: (note: Note) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onImageClick: (url: string | null) => void;
  onAddNote: (event?: React.FormEvent<HTMLFormElement>) => void;
  onEditTextChange: (value: string) => void;
  onCurrentNoteChange: (value: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  notesEndRef: React.RefObject<HTMLDivElement>;
  formatTime: (seconds: number) => string;
}

/**
 * 笔记面板，展示录音过程中的文字与图片笔记，并提供编辑与导出功能。
 */
const NotesPanel: React.FC<NotesPanelProps> = ({
  t,
  notes,
  editingNoteId,
  editText,
  currentNote,
  isRecordingActive,
  audioBlob,
  onExport,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteNote,
  onImageClick,
  onAddNote,
  onEditTextChange,
  onCurrentNoteChange,
  onImageUpload,
  fileInputRef,
  notesEndRef,
  formatTime,
}) => {
  const isInputDisabled = !isRecordingActive && notes.length === 0 && !audioBlob;

  return (
    <div className="flex-1 w-full relative flex flex-col shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)] z-10 animate-in fade-in slide-in-from-top-4 duration-300 min-h-0 overflow-hidden">
      <div className="h-8 bg-[#fef3c7] border-b border-[#e5e7eb] flex items-center justify-between px-4 shrink-0 shadow-sm relative z-10 border-t border-gray-300">
        <div className="absolute top-[-6px] left-0 right-0 h-1.5 flex justify-between overflow-hidden px-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#1f2937] opacity-20"></div>
          ))}
        </div>

        <div className="text-red-400 font-serif italic font-bold text-xs">{t('common.notes')}</div>
        {notes.length > 0 && (
          <button
            onClick={onExport}
            className="text-[10px] font-serif italic flex items-center gap-1 px-2 py-0.5 text-gray-600 hover:text-gray-900 transition-colors bg-white/50 rounded"
          >
            <Download size={10} />
            {t('common.pdf')}
          </button>
        )}
      </div>

      <div className="flex-1 bg-[#fefce8] relative flex flex-col min-h-0 overflow-hidden">
        <div className="absolute inset-0 paper-lines pointer-events-none opacity-80" />
        <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-red-200/50 pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-0 relative min-h-0">
          <div className="min-h-full pb-16">
            {notes.length === 0 && (
              <div className="pt-10 text-center font-serif italic text-gray-400 pl-8 pr-4 text-sm">
                {t('common.startTakingNotes')}
              </div>
            )}
            {notes.map(note => (
              <div key={note.id} className="relative group pl-10 pr-4 py-1 min-h-[2rem] hover:bg-yellow-100/30 transition-colors">
                <div className="absolute left-1 top-2 font-mono text-[8px] text-gray-400">
                  {formatTime(note.timestamp / 1000)}
                </div>

                {note.imageUrl ? (
                  <div className="my-2 p-1 bg-white shadow-sm border border-gray-200 inline-block transform -rotate-1 relative group">
                    <img
                      src={note.imageUrl}
                      alt="Attachment"
                      className="max-h-32 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onImageClick(note.imageUrl || null)}
                    />
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity shadow-md z-10"
                      title={t('common.delete')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : null}

                {note.text.trim() && (
                  <>
                    {editingNoteId === note.id ? (
                      <div className="relative z-20 mt-1">
                        <textarea
                          value={editText}
                          onChange={e => onEditTextChange(e.target.value)}
                          className="w-full bg-white/80 p-1 font-serif text-base leading-8 border border-blue-300 outline-none shadow-sm rounded-sm"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={onCancelEdit} className="p-1 hover:bg-gray-200 rounded">
                            <X size={14} />
                          </button>
                          <button onClick={() => onSaveEdit(note.id)} className="p-1 text-green-600 hover:bg-green-100 rounded">
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <p className="font-serif text-base text-gray-800 leading-[2rem] break-words whitespace-pre-wrap">{note.text}</p>
                        <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-10">
                          <button
                            onClick={() => onStartEdit(note)}
                            className="text-gray-400 hover:text-blue-600 p-1 bg-white/90 rounded shadow-sm"
                            title={t('common.edit')}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="text-gray-400 hover:text-red-600 p-1 bg-white/90 rounded shadow-sm"
                            title={t('common.delete')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <div ref={notesEndRef} />
          </div>
        </div>
      </div>

      <div
        className={`p-3 border-t-2 border-[#e5e7eb] bg-[#fefce8] relative z-20 ${
          isInputDisabled ? 'opacity-50 pointer-events-none grayscale' : ''
        }`}
      >
        <form onSubmit={onAddNote} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => (isRecordingActive || audioBlob) && fileInputRef.current?.click()}
            className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
            disabled={!isRecordingActive && !audioBlob}
          >
            <ImageIcon size={18} />
          </button>
          <input type="file" ref={fileInputRef} onChange={onImageUpload} accept="image/*" className="hidden" />

          <div className="flex-1 relative">
            <input
              type="text"
              value={currentNote}
              onChange={e => onCurrentNoteChange(e.target.value)}
              placeholder={t('common.placeholder')}
              className="w-full bg-transparent border-b border-gray-300 font-serif text-base focus:border-blue-400 focus:outline-none placeholder:italic placeholder:text-gray-300 py-1"
            />
          </div>

          <button type="submit" disabled={!currentNote.trim()} className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-0 transition-all">
            <Plus size={20} strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default React.memo(NotesPanel);

