import React from 'react';
import { useApp } from '../context/AppContext';

const LETTERS = [
  'All', '0-9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 
  'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

interface A2ZFilterProps {
  currentLetter?: string;
  onSelectLetter: (letter: string) => void;
}

export const A2ZFilter: React.FC<A2ZFilterProps> = ({ currentLetter = 'All', onSelectLetter }) => {
  return (
    <div className="w-full bg-[#242832] rounded-2xl p-3 border border-[#2e3442] shadow-sm">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#b2b1ad]">
          A-Z Alphabetical Directory
        </span>
      </div>
      <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center">
        {LETTERS.map((letter) => {
          const isActive = (letter === 'All' && (!currentLetter || currentLetter === 'All')) || currentLetter === letter;
          return (
            <button
              key={letter}
              onClick={() => onSelectLetter(letter === 'All' ? '' : letter)}
              className={`min-w-[2rem] sm:min-w-[2.2rem] h-8 px-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-flixer text-white shadow-md scale-105'
                  : 'bg-[#1a1c23] text-[#b2b1ad] hover:text-white hover:bg-[#4f83d3]'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
};
