'use client';

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { RiCloseLine } from '@remixicon/react';
import { noop } from 'lodash-es';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose = noop,
  title,
  description,
  children,
  className,
  wrapperClassName,
  showCloseButton = true,
}) => {

  return (
    <Dialog
      open={isOpen}
      as="div"
      onClose={onClose}
      className={cn("relative z-50", wrapperClassName)}
    >
      {/* 背景遮罩层 - 使用渐变过渡 */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* 内容容器 */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className={cn(
              "relative w-full max-w-lg",
              // 卡片样式 - 遵循设计规范
              "bg-white rounded-xl shadow-lg border border-slate-100",
              // 内边距
              "p-6",
              // 过渡动画
              "duration-300 ease-out",
              "data-[closed]:scale-95 data-[closed]:opacity-0",
              "data-[enter]:duration-300 data-[leave]:duration-200",
              className
            )}
          >
            {/* 关闭按钮 */}
            {showCloseButton && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className={cn(
                  "absolute right-4 top-4 z-10",
                  "flex h-8 w-8 items-center justify-center",
                  "rounded-lg",
                  "text-slate-400 hover:text-slate-600",
                  "hover:bg-slate-50 hover:border-slate-300",
                  "transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-100"
                )}
                aria-label="关闭弹窗"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            )}

            {/* 标题区域 */}
            {title && (
              <DialogTitle className="text-lg font-bold text-slate-800 pr-10">
                {title}
              </DialogTitle>
            )}

            {/* 描述文本 */}
            {description && (
              <Description className="mt-2 text-sm text-slate-600">
                {description}
              </Description>
            )}

            {/* 内容区域 */}
            <div className={cn(title || description ? "mt-4" : "")}>
              {children}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default Modal;