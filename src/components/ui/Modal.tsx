import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
}

const MAX_WIDTH_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = 'lg',
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
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
        className={`surface-luxe max-h-[90vh] w-full ${MAX_WIDTH_MAP[maxWidth]} flex flex-col overflow-hidden rounded-2xl border border-[#104E35]/22 bg-[#F0F5F2] text-[#091911] dark:border-[#2A6F52]/42 dark:bg-[#060D09] dark:text-[#DDF2E7]`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#104E35]/16 px-6 py-4 dark:border-[#2A6F52]/32">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-[#059669] dark:text-[#34D399]">{icon}</span>}
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

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'destructive' | 'primary';
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
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
    <p className="text-sm leading-relaxed text-[#466153] dark:text-[#8EAD9E]">{description}</p>
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
