import React from 'react';
import { Mic, Volume2, ArrowRight } from 'lucide-react';

export const GuidanceArrow = ({ active }) => {
  if (!active) return null;
  return (
    <div className="absolute -left-12 top-1/2 transform -translate-y-1/2 animate-pulse text-amber-500 hidden md:block">
      <ArrowRight size={40} strokeWidth={4} />
    </div>
  );
};

export const VoiceControl = ({ onSpeak, onListen, listening }) => {
  return (
    <div className="flex flex-col gap-3 absolute -right-14 top-1/2 transform -translate-y-1/2 hidden md:flex">
        {/* Speak Button (Text to Speech) */}
        <button 
            onClick={onSpeak}
            type="button"
            className="p-3 bg-blue-50 rounded-full text-blue-600 hover:bg-blue-100 shadow-sm transition-all active:scale-95"
            title="Listen to instruction"
        >
            <Volume2 size={24} />
        </button>

        {/* Listen Button (Speech to Text) */}
        <button 
            onClick={onListen}
            type="button"
            className={`p-3 rounded-full shadow-sm transition-all active:scale-95 ${
                listening 
                ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' 
                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            title="Speak your answer"
        >
            <Mic size={24} />
        </button>
    </div>
  );
};

export const VoiceInput = ({ 
    value, 
    onChange, 
    placeholder, 
    active, 
    onFocus,
    onSpeak,
    onListen,
    listening,
    type = "text"
}) => {
  return (
    <div className={`relative w-full max-w-md mx-auto transition-all duration-300 my-4 ${active ? 'scale-105 opacity-100 z-10' : 'opacity-50 scale-95 blur-[1px]'}`}>
      <GuidanceArrow active={active} />
      
      <div className="relative">
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            placeholder={placeholder}
            className={`w-full text-2xl p-6 rounded-2xl border-2 shadow-lg text-center outline-none transition-all font-bold
                ${active 
                    ? 'border-amber-400 bg-white ring-4 ring-amber-100 text-gray-800' 
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                }
            `}
          />
      </div>

      <VoiceControl 
        onSpeak={onSpeak} 
        onListen={onListen}
        listening={listening}
      />
      
      {/* Mobile Voice Controls (Visible only on small screens) */}
      {active && (
        <div className="flex justify-between mt-2 md:hidden px-4">
             <button onClick={onSpeak} type="button" className="flex items-center gap-1 text-blue-600 font-bold text-sm bg-blue-50 px-3 py-2 rounded-full">
                <Volume2 size={16} /> Explain
             </button>
             <button onClick={onListen} type="button" className={`flex items-center gap-1 font-bold text-sm px-3 py-2 rounded-full ${listening ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>
                <Mic size={16} /> Speak
             </button>
        </div>
      )}
    </div>
  );
};

export const VoiceHeader = ({ title, step, subtitle }) => {
  return (
    <div className="text-center mb-8 pt-4">
      <div className="flex items-center justify-center gap-2 text-amber-600 font-bold mb-2 uppercase tracking-wide text-xs">
         <span>Step {step}</span>
         <span>•</span>
         <span>{subtitle}</span>
      </div>
      <h1 className="text-3xl font-black text-gray-800">{title}</h1>
    </div>
  );
};

export const ActionButton = ({ onClick, children, primary = true, disabled = false }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:scale-100
            ${primary 
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200' 
                : 'bg-white text-gray-600 border-2 border-gray-100'
            }
        `}
    >
        {children}
    </button>
);
