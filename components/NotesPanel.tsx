import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { TFunction } from 'i18next';
import Download from 'lucide-react/icons/download';
import Trash2 from 'lucide-react/icons/trash-2';
import Pencil from 'lucide-react/icons/pencil';
import X from 'lucide-react/icons/x';
import Check from 'lucide-react/icons/check';
import Plus from 'lucide-react/icons/plus';
import ImageIcon from 'lucide-react/icons/image';
import { Note } from '../types';

const DEFAULT_ROW_HEIGHT = 180;

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
  formatTime: (seconds: number) => string;
}

type ListItemData = {
  notes: Note[];
  editingNoteId: string | null;
  editText: string;
  formatTime: (seconds: number) => string;
  t: TFunction;
  onStartEdit: (note: Note) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onImageClick: (url: string | null) => void;
  onEditTextChange: (value: string) => void;
};

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
  formatTime,
}) => {
  const listRef = useRef<VariableSizeList<ListItemData>>(null);
  const sizeMapRef = useRef<Record<string, number>>({});
  const isInputDisabled = !isRecordingActive && notes.length === 0 && !audioBlob;

  const getItemSize = useCallback(
    (index: number) => {
      const note = notes[index];
      if (!note) return DEFAULT_ROW_HEIGHT;
      return sizeMapRef.current[note.id] ?? DEFAULT_ROW_HEIGHT;
    },
    [notes]
  );

  const setSize = useCallback((index: number, id: string, size: number) => {
    if (sizeMapRef.current[id] !== size) {
      sizeMapRef.current[id] = size;
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  useEffect(() => {
    if (notes.length) {
      listRef.current?.scrollToItem(notes.length - 1, 'end');
    }
  }, [notes.length]);

  const listData = useMemo<ListItemData>(
    () => ({
      notes,
      editingNoteId,
      editText,
      formatTime,
      t,
      onStartEdit,
      onCancelEdit,
      onSaveEdit,
      onDeleteNote,
      onImageClick,
      onEditTextChange,
    }),
    [
      notes,
      editingNoteId,
      editText,
      formatTime,
      t,
      onStartEdit,
      onCancelEdit,
      onSaveEdit,
      onDeleteNote,
      onImageClick,
      onEditTextChange,
    ]
  );

  const renderRow = useCallback(
    ({ index, style, data }: ListChildComponentProps<ListItemData>) => {
      const note = data.notes[index];
      if (!note) return null;

      const measureRef = (node: HTMLDivElement | null) => {
        if (node) {
          const height = node.getBoundingClientRect().height;
          setSize(index, note.id, height);
        }
      };

      return (
        <div style={style}>
          <div ref={measureRef} className="relative group pl-10 pr-4 py-1 min-h-[2rem] hover:bg-yellow-100/30 transition-colors">
            <div className="absolute left-1 top-2 font-mono text-[8px] text-gray-400">
              {data.formatTime(note.timestamp / 1000)}
            </div>

            {note.imageUrl ? (
              <div className="my-2 p-1 bg-white shadow-sm border border-gray-200 inline-block transform -rotate-1 relative group">
                <img
                  src={note.imageUrl}
                  alt="Attachment"
                  loading="lazy"
                  className="max-h-32 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => data.onImageClick(note.imageUrl || null)}
                />
                <button
                  onClick={e => {
                    e.stopPropagation();
                    data.onDeleteNote(note.id);
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity shadow-md z-10"
                  title={data.t('common.delete')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : null}

            {note.text.trim() && (
              <>
                {data.editingNoteId === note.id ? (
                  <div className="relative z-20 mt-1">
                    <textarea
                      value={data.editText}
                      onChange={e => data.onEditTextChange(e.target.value)}
                      className="w-full bg-white/80 p-1 font-serif text-base leading-8 border border-blue-300 outline-none shadow-sm rounded-sm"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={data.onCancelEdit} className="p-1 hover:bg-gray-200 rounded">
                        <X size={14} />
                      </button>
                      <button onClick={() => data.onSaveEdit(note.id)} className="p-1 text-green-600 hover:bg-green-100 rounded">
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <p className="font-serif text-base text-gray-800 leading-[2rem] break-words whitespace-pre-wrap">{note.text}</p>
                    <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-10">
                      <button
                        onClick={() => data.onStartEdit(note)}
                        className="text-gray-400 hover:text-blue-600 p-1 bg-white/90 rounded shadow-sm"
                        title={data.t('common.edit')}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => data.onDeleteNote(note.id)}
                        className="text-gray-400 hover:text-red-600 p-1 bg-white/90 rounded shadow-sm"
                        title={data.t('common.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    },
    [setSize]
  );

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

        {notes.length === 0 ? (
          <div className="flex-1 pt-10 text-center font-serif italic text-gray-400 pl-8 pr-4 text-sm">
            {t('common.startTakingNotes')}
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <AutoSizer>
              {({ height, width }) => (
                <VariableSizeList
                  height={height}
                  width={width}
                  itemCount={notes.length}
                  itemSize={getItemSize}
                  estimatedItemSize={DEFAULT_ROW_HEIGHT}
                  ref={listRef}
                  overscanCount={3}
                  itemData={listData}
                >
                  {renderRow}
                </VariableSizeList>
              )}
            </AutoSizer>
          </div>
        )}
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

