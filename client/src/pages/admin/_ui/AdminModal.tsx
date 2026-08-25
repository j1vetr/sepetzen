import { type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { titleCaseTr } from './AdminUI';

type AdminModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: AdminModalSize;
  footer?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  testId?: string;
  closeOnOutsideClick?: boolean;
}

const SIZE_CLASS: Record<AdminModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
  xl: 'sm:max-w-6xl',
};

export default function AdminModal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  headerActions,
  children,
  testId,
  closeOnOutsideClick = true,
}: AdminModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && closeOnOutsideClick) onClose();
      }}
    >
      <DialogContent
        className={`admin-modal admin-content bg-white text-neutral-900 border-neutral-200 shadow-[0_20px_60px_rgba(15,23,42,0.16)] ${SIZE_CLASS[size]} max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 max-sm:!left-0 max-sm:!top-auto max-sm:!bottom-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!w-full max-sm:!max-w-none max-sm:!max-h-[95vh] max-sm:!rounded-t-2xl max-sm:!rounded-b-none max-sm:!border-x-0 max-sm:!border-b-0 max-sm:data-[state=open]:!slide-in-from-bottom max-sm:data-[state=closed]:!slide-out-to-bottom`}
        data-testid={testId}
        onInteractOutside={(e) => {
          if (!closeOnOutsideClick) e.preventDefault();
        }}
      >
        <DialogHeader className="px-5 sm:px-6 py-4 border-b border-neutral-200 bg-white shrink-0 flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[15px] font-semibold tracking-tight text-neutral-900 flex items-center gap-2">
              {typeof title === 'string' ? titleCaseTr(title) : title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-[12px] text-neutral-600 mt-0.5">
                {description}
              </DialogDescription>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-auto px-5 sm:px-6 py-5 bg-white">{children}</div>

        {footer ? (
          <div className="px-5 sm:px-6 py-3 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
