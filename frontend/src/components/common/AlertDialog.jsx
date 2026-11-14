import { useEffect, useRef } from 'react';

const AlertDialog = ({
  isOpen,
  title = 'Validation Error',
  message = 'Please correct the issues before proceeding.',
  errors = [],
  buttonText = 'OK',
  type = 'error', // 'error' | 'warning' | 'info'
  onClose,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e) => {
      e.preventDefault();
      onClose?.();
    };

    const handlePointerDown = (e) => {
      if (e.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!isInside) {
        onClose?.();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('pointerdown', handlePointerDown);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  const typeConfig = {
    error: {
      buttonBg: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm shadow-red-200',
      iconBg: 'bg-red-100 text-red-600',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    warning: {
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-sm shadow-amber-200',
      iconBg: 'bg-amber-100 text-amber-600',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    info: {
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm shadow-blue-200',
      iconBg: 'bg-blue-100 text-blue-600',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const current = typeConfig[type] || typeConfig.error;

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-desc"
      className="p-0 rounded-2xl shadow-2xl max-w-md w-full bg-white border border-gray-100 m-auto text-left overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${current.iconBg}`}>
            {current.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="alert-dialog-title" className="text-lg font-bold text-gray-900 mb-1">
              {title}
            </h3>
            {message && (
              <p id="alert-dialog-desc" className="text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        {errors && errors.length > 0 && (
          <div className="mt-4 bg-red-50/80 border border-red-200/80 rounded-xl p-3.5 max-h-52 overflow-y-auto">
            <p className="text-xs font-semibold text-red-900 uppercase tracking-wider mb-2">
              Issues to resolve:
            </p>
            <ul className="space-y-1.5 text-xs text-red-800">
              {errors.map((err, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold leading-none mt-0.5">•</span>
                  <span className="leading-normal">{err}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${current.buttonBg}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default AlertDialog;
