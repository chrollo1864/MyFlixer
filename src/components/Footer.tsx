import React from 'react';
import { Film, Shield, Smartphone, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { navigateTo, openModal, themeOptions } = useApp();
  const hf = themeOptions.headerFooter;
  const currentYear = new Date().getFullYear();
  const copyrightText = (hf?.copyrightText || '© {year} MyFlixer. All rights reserved.')
    .replace(/\{year\}/gi, String(currentYear))
    .replace(/(©\s*)\d{4}(?:\s*[–-]\s*\d{4})?/, `$1${currentYear}`);
  const defaultDisclaimer = 'This site does not store any files on our server, we only linked to the media which is hosted on 3rd party services.';
  const disclaimerText = !hf?.disclaimerText
    || hf.disclaimerText === 'Playback sources must be content you own or are authorized to stream.'
    ? defaultDisclaimer
    : hf.disclaimerText;

  return (
    <footer className="w-full bg-[#1e2129] text-center mt-16 pt-8 pb-12 border-t border-[#242832]">
      <div className="max-w-[1460px] mx-auto px-4 sm:px-6">
        
        {/* Top Card Box (.footer .f-top) */}
        <div className="bg-[#292d38] rounded-3xl p-1 border border-[#242832] shadow-xl">
          <div className="p-6 sm:p-10 border-2 border-[#1e2129] rounded-3xl space-y-6">
            
            {/* Logo */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#db6937] to-[#4f83d3] flex items-center justify-center shadow">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-['Poppins']">
                {themeOptions.general.siteName || 'MyFlixer'}
              </span>
            </div>

            {/* Navigation Links Mirror */}
            <ul className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#b2b1ad]">
              <li>
                <button 
                  onClick={() => navigateTo('home')} 
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo('browse', undefined, { type: 'movie' })} 
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Movies
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo('browse', undefined, { type: 'tv' })} 
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  TV Shows
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateTo('browse', undefined, { sort: 'rating' })} 
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Top IMDb
                </button>
              </li>
              <li>
                <button 
                  onClick={() => openModal('contact')} 
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
              <li>
                <button 
                  onClick={() => openModal('request')} 
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Request
                </button>
              </li>
              {hf?.customLinks?.map((l: { label: string; url: string }, idx: number) => (
                <li key={idx}>
                  <a 
                    href={l.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Disclaimer Text */}
            <p className="max-w-3xl mx-auto text-xs text-[#b2b1ad] leading-relaxed font-light">
              {disclaimerText}
            </p>
          </div>
        </div>

        {/* Bottom Bar (.footer .f-bottom) */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#b2b1ad] font-light">
          <div>
            {copyrightText}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigateTo('terms')} className="hover:text-white transition-colors cursor-pointer">
              Terms of Service
            </button>
            <span>•</span>
            <button onClick={() => navigateTo('privacy')} className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#4f83d3]">
              <Smartphone className="w-3.5 h-3.5" />
              <span>PWA Ready</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
