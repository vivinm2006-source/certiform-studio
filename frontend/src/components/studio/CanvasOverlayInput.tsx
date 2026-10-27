import React, { useState, useEffect, useRef } from 'react';
import { CanvasElement } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';

interface CanvasOverlayInputProps {
  element: CanvasElement;
  canvasWidthPx: number;
  canvasHeightPx: number;
  zoom: number;
}

export const CanvasOverlayInput: React.FC<CanvasOverlayInputProps> = ({
  element,
  canvasWidthPx,
  canvasHeightPx,
  zoom,
}) => {
  const { recipients, activeRecipientIndex, updateActiveRecipientData } = useProjectStore();
  const { setEditingElementId, updateElementProps } = useCanvasStore();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const activeRec = recipients[activeRecipientIndex];
  const bKey = element.binding_key;
  
  // If it's a dynamic variable, edit the recipient's bound field; if static, edit element content!
  const initialValue = bKey 
    ? (activeRec?.data?.[bKey] ?? element.content ?? '') 
    : (element.content ?? '');

  const [val, setVal] = useState(initialValue);
  const isMultiline = val.includes('\n') || (element.max_lines && element.max_lines > 1);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setVal(newVal);
    if (bKey) {
      updateActiveRecipientData(bKey, newVal);
    } else {
      updateElementProps(element.id, { content: newVal });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditingElementId(null);
    } else if (e.key === 'Enter' && !isMultiline) {
      e.preventDefault();
      setEditingElementId(null);
    }
  };

  const handleBlur = () => {
    setEditingElementId(null);
  };

  // Convert normalized element coordinates (0.0 to 1.0) into canvas pixel position
  const left = element.x * canvasWidthPx * zoom;
  const top = element.y * canvasHeightPx * zoom;
  const width = element.width * canvasWidthPx * zoom;
  const height = element.height * canvasHeightPx * zoom;

  const scaledFontSize = Math.max(10, element.font_size * zoom * (canvasWidthPx / 841.89));

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 50,
      }}
      className="flex items-center justify-center pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {isMultiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={val}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full h-full bg-white/95 border-2 border-brand-500 rounded shadow-lg p-2 outline-none resize-none leading-relaxed"
          style={{
            fontFamily: element.font_family,
            fontSize: `${scaledFontSize}px`,
            fontWeight: element.font_weight,
            color: element.color,
            textAlign: element.text_align,
            textTransform: element.uppercase ? 'uppercase' : 'none',
          }}
          autoFocus
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={val}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full h-full bg-white/95 border-2 border-brand-500 rounded shadow-lg px-2 outline-none"
          style={{
            fontFamily: element.font_family,
            fontSize: `${scaledFontSize}px`,
            fontWeight: element.font_weight,
            color: element.color,
            textAlign: element.text_align,
            textTransform: element.uppercase ? 'uppercase' : 'none',
          }}
          autoFocus
        />
      )}
    </div>
  );
};
