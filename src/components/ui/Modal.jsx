import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Button';

const MAX_WIDTH_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = 'lg',
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={`surface-luxe max-h-[90vh] w-full ${MAX_WIDTH_MAP[maxWidth]} flex flex-col overflow-hidden rounded-2xl border border-[#272732]/22 bg-[#FFFFFF] text-[#0B0B0E] dark:border-[#2D2D3A]/42 dark:bg-[#121217] dark:text-[#F2F3F7]`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#272732]/16 px-6 py-4 dark:border-[#2D2D3A]/32">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-[#8A621C] dark:text-[#E8C987]">{icon}</span>}
            <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          </div>
          <Button
            variant="icon"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
            className="border-transparent bg-transparent dark:border-transparent dark:bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </motion.div>
    </div>
  );
};

export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'destructive',
  busy = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    icon={<AlertTriangle className="h-5 w-5 text-[#F97362]" />}
    maxWidth="sm"
  >
    <p className="text-sm leading-relaxed text-[#525463] dark:text-[#9497A6]">{description}</p>
    <div className="mt-6 flex items-center justify-end gap-2.5">
      <Button variant="outline" size="md" onClick={onCancel} disabled={busy}>
        {cancelLabel}
      </Button>
      <Button
        variant={tone === 'destructive' ? 'destructive' : 'primary'}
        size="md"
        loading={busy}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);
