import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  currentLanguage: 'zh' | 'en';
  onChange: (lang: 'zh' | 'en') => void;
}

/**
 * 语言切换组件，内部维护下拉展开状态并在点击外部时自动收起。
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLanguage, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getLanguageLabel = () => (currentLanguage === 'zh' ? '中' : 'EN');

  return (
    <div className="relative z-[100]" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 text-[10px] rounded transition-colors font-mono flex items-center gap-1 ${
          isOpen ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title={currentLanguage === 'zh' ? '中文' : 'English'}
      >
        <span>{getLanguageLabel()}</span>
        <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[100] min-w-[60px] overflow-visible">
          <button
            onClick={() => {
              onChange('zh');
              setIsOpen(false);
            }}
            className={`w-full px-2 py-1.5 text-[10px] font-mono text-left hover:bg-gray-100 transition-colors first:rounded-t-md last:rounded-b-md ${
              currentLanguage === 'zh' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
            }`}
          >
            中文
          </button>
          <button
            onClick={() => {
              onChange('en');
              setIsOpen(false);
            }}
            className={`w-full px-2 py-1.5 text-[10px] font-mono text-left hover:bg-gray-100 transition-colors first:rounded-t-md last:rounded-b-md ${
              currentLanguage === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
            }`}
          >
            English
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

