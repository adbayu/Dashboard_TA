import React from 'react';

export default function SlideOverDrawer({ isOpen, onClose, title, subtitle, icon = 'sensors', children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white/95 dark:bg-[#1c221e]/95 backdrop-blur-2xl shadow-2xl flex flex-col border-l border-outline-variant/30 text-on-surface">
          {/* Drawer Header */}
          <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/40 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl fill">{icon}</span>
              </div>
              <div>
                <h3 className="font-headline-md text-base font-bold text-on-surface">{title}</h3>
                {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 transition-colors"
              title="Tutup"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5 custom-scrollbar">
            {children}
          </div>

          {/* Drawer Footer */}
          {footer && (
            <div className="p-5 border-t border-outline-variant/20 bg-surface-container-low/50 dark:bg-white/5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
