import React from 'react';
import { Home } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NotFoundPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20 space-y-4">
      <h1 className="text-8xl sm:text-[10rem] font-medium tracking-tight text-[#e9ecef] leading-none select-none drop-shadow-xl">
        404
      </h1>
      <span className="text-base sm:text-lg text-[#b2b1ad] font-light">
        Page not found.
      </span>
      <div className="pt-2">
        <button
          onClick={() => navigateTo('home')}
          className="bg-gradient-flixer hover:opacity-95 text-white font-semibold text-sm sm:text-base px-8 py-3 rounded-full flex items-center gap-2 shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Back to home page</span>
        </button>
      </div>
    </div>
  );
};
