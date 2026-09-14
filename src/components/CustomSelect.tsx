import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string | string[];
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  multiple?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  className,
  multiple = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize selected values
  const selectedValues: string[] = Array.isArray(value) 
    ? value 
    : (value !== undefined && value !== null && value !== '' ? [value] : ['all']);

  const isAllSelected = selectedValues.includes('all') || selectedValues.length === 0;

  const isOptionSelected = (optVal: string) => {
    if (optVal === 'all') {
      return isAllSelected;
    }
    return !isAllSelected && selectedValues.includes(optVal);
  };

  const handleOptionClick = (optVal: string) => {
    if (!multiple) {
      onChange(optVal);
      setIsOpen(false);
      return;
    }

    // Multi-select logic
    if (optVal === 'all') {
      onChange(['all']);
      return;
    }

    if (isAllSelected) {
      // If was 'all', selecting a specific option narrows down to that option
      onChange([optVal]);
    } else {
      let newSelected: string[];
      if (selectedValues.includes(optVal)) {
        newSelected = selectedValues.filter(v => v !== optVal);
        if (newSelected.length === 0) {
          newSelected = ['all'];
        }
      } else {
        newSelected = [...selectedValues.filter(v => v !== 'all'), optVal];
        // If all non-'all' options are now selected, normalize to 'all'
        const nonAllOptions = options.filter(o => o.value !== 'all');
        if (nonAllOptions.length > 0 && newSelected.length === nonAllOptions.length) {
          newSelected = ['all'];
        }
      }
      onChange(newSelected);
    }
  };

  // Determine trigger label and icon
  const allOption = options.find(opt => opt.value === 'all');
  const matchedSelectedOptions = options.filter(opt => opt.value !== 'all' && selectedValues.includes(opt.value));

  let triggerIcon: React.ReactNode = undefined;
  let triggerLabel: React.ReactNode = placeholder || 'Select option';

  if (isAllSelected) {
    triggerIcon = allOption?.icon;
    triggerLabel = allOption ? allOption.label : (placeholder || 'All');
  } else if (matchedSelectedOptions.length === 1) {
    triggerIcon = matchedSelectedOptions[0].icon;
    triggerLabel = matchedSelectedOptions[0].label;
  } else if (matchedSelectedOptions.length > 1) {
    triggerIcon = matchedSelectedOptions[0]?.icon;
    triggerLabel = (
      <span className="multi-label-group">
        <span className="primary-text">{matchedSelectedOptions[0]?.label}</span>
        <span className="count-badge">+{matchedSelectedOptions.length - 1}</span>
      </span>
    );
  }

  return (
    <div className={`custom-select-container ${className || ''}`} ref={containerRef}>
      <div 
        className={`select-trigger glass ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="trigger-content">
          {triggerIcon && <span className="option-icon">{triggerIcon}</span>}
          <span className={selectedValues.length > 0 ? 'selected-label' : 'placeholder'}>
            {triggerLabel}
          </span>
        </div>
        <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="select-dropdown glass fade-in">
          {multiple && options.length > 3 && (
            <div className="dropdown-quick-actions">
              <button 
                type="button" 
                className="quick-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(['all']);
                }}
              >
                Reset to All
              </button>
            </div>
          )}

          <div className="options-scroll-list">
            {options.map((option) => {
              const selected = isOptionSelected(option.value);
              return (
                <div 
                  key={option.value} 
                  className={`select-option ${selected ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(option.value)}
                >
                  <div className="option-info">
                    {multiple && (
                      <div className={`custom-checkbox ${selected ? 'checked' : ''}`}>
                        {selected && <Check size={12} strokeWidth={3} />}
                      </div>
                    )}
                    {option.icon && <span className="option-icon">{option.icon}</span>}
                    <span className="option-label">{option.label}</span>
                  </div>
                  {!multiple && selected && <Check size={14} className="check-icon" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .custom-select-container {
          position: relative;
          min-width: 180px;
          user-select: none;
        }

        .select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--ink, #1a3d33);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .select-trigger:hover {
          background: white;
          box-shadow: 0 4px 12px rgba(26, 61, 51, 0.05);
          border-color: var(--ink, #1a3d33);
        }

        .select-trigger.open {
          border-color: var(--ink, #1a3d33);
          box-shadow: 0 0 0 4px rgba(26, 61, 51, 0.05);
        }

        .trigger-content {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }

        .selected-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
        }

        .multi-label-group {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .multi-label-group .primary-text {
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .count-badge {
          background: var(--ink, #1a3d33);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          line-height: 1.3;
        }

        .placeholder {
          color: var(--ink-soft, #5a736c);
          opacity: 0.5;
        }

        .chevron {
          transition: transform 0.3s ease;
          opacity: 0.6;
          flex-shrink: 0;
          margin-left: 8px;
        }

        .chevron.rotate {
          transform: rotate(180deg);
        }

        .select-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          min-width: 210px;
          z-index: 1100;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 18px;
          padding: 6px;
          box-shadow: 0 20px 50px rgba(26, 61, 51, 0.15);
        }

        .dropdown-quick-actions {
          display: flex;
          justify-content: flex-end;
          padding: 4px 8px 6px 8px;
          border-bottom: 1px solid rgba(26, 61, 51, 0.08);
          margin-bottom: 4px;
        }

        .quick-action-btn {
          background: none;
          border: none;
          color: var(--ink-soft, #5a736c);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .quick-action-btn:hover {
          color: var(--ink, #1a3d33);
          background: rgba(26, 61, 51, 0.05);
        }

        .options-scroll-list {
          max-height: 280px;
          overflow-y: auto;
        }

        .select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--ink-soft, #5a736c);
          font-weight: 600;
          font-size: 0.88rem;
        }

        .select-option:hover {
          background: rgba(26, 61, 51, 0.05);
          color: var(--ink, #1a3d33);
        }

        .select-option.selected {
          background: rgba(26, 61, 51, 0.07);
          color: var(--ink, #1a3d33);
        }

        .option-info {
          display: flex;
          align-items: center;
          gap: 9px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .custom-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid rgba(26, 61, 51, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          color: white;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .custom-checkbox.checked {
          background: var(--ink, #1a3d33);
          border-color: var(--ink, #1a3d33);
        }

        .check-icon {
          color: var(--gold, #d4af37);
        }

        .fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Custom Scrollbar */
        .options-scroll-list::-webkit-scrollbar {
          width: 6px;
        }
        .options-scroll-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .options-scroll-list::-webkit-scrollbar-thumb {
          background: rgba(26, 61, 51, 0.1);
          border-radius: 10px;
        }
        .options-scroll-list::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 61, 51, 0.2);
        }
      `}</style>
    </div>
  );
};

export default CustomSelect;
