import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import AlertDialog from '../components/common/AlertDialog';

const AlertContext = createContext(null);

// Module-level global reference for non-component calls
let globalShowAlert = null;
let globalShowValidationError = null;

export const showGlobalAlert = (...args) => {
  if (globalShowAlert) return globalShowAlert(...args);
  console.warn('AlertContext not initialized yet, falling back to alert');
};

export const showGlobalValidationError = (...args) => {
  if (globalShowValidationError) return globalShowValidationError(...args);
  console.warn('AlertContext not initialized yet, falling back to alert');
};

// Helper to parse errors from strings, Error instances, Laravel responses, or Supabase
export const parseError = (errorOrMsg) => {
  if (!errorOrMsg) {
    return { message: 'An unexpected validation error occurred.', errors: [] };
  }

  if (typeof errorOrMsg === 'string') {
    return { message: errorOrMsg, errors: [] };
  }

  // Handle standard Error instance or object with message
  let mainMessage = errorOrMsg.message || 'Validation failed. Please check the form.';
  const errors = [];

  // Handle Laravel-style validation errors: { errors: { field: ['msg1', 'msg2'] } }
  if (errorOrMsg.errors && typeof errorOrMsg.errors === 'object') {
    for (const key of Object.keys(errorOrMsg.errors)) {
      const fieldErrors = errorOrMsg.errors[key];
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach(msg => errors.push(msg));
      } else if (typeof fieldErrors === 'string') {
        errors.push(fieldErrors);
      }
    }
  }

  // Handle nested error object e.g. { error: '...' }
  if (errorOrMsg.error) {
    if (typeof errorOrMsg.error === 'string') {
      mainMessage = errorOrMsg.error;
    } else if (errorOrMsg.error.message) {
      mainMessage = errorOrMsg.error.message;
    }
  }

  return { message: mainMessage, errors };
};

// Helper to extract a friendly label for any invalid form input
const getFriendlyValidationMessage = (el) => {
  let labelText = '';

  // 1. Check label[for="el.id"]
  if (el.id) {
    try {
      const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (labelEl) labelText = labelEl.textContent;
    } catch (_) {}
  }

  // 2. Check closest wrapping label
  if (!labelText) {
    const parentLabel = el.closest('label');
    if (parentLabel) labelText = parentLabel.textContent;
  }

  // 3. Check preceding label element in parent
  if (!labelText && el.parentElement) {
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL') {
      labelText = prev.textContent;
    } else {
      const labelInParent = el.parentElement.querySelector('label');
      if (labelInParent) labelText = labelInParent.textContent;
    }
  }

  // 4. Fallback to placeholder, aria-label, or name
  if (!labelText) {
    labelText = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || 'This field';
  }

  // Clean label (remove *, :, newlines, leading/trailing spaces)
  labelText = labelText.replace(/[*:\n\r]/g, ' ').replace(/\s+/g, ' ').trim();

  // If labelText is an identifier like "employee_id", format as "Employee ID"
  if (labelText.includes('_')) {
    labelText = labelText
      .split('_')
      .map(w => (w.toLowerCase() === 'id' ? 'ID' : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  // Determine specific issue based on validity state
  const validity = el.validity;
  if (validity.valueMissing) {
    return `${labelText} is required.`;
  }
  if (validity.typeMismatch) {
    if (el.type === 'email') return `${labelText} must be a valid email address.`;
    if (el.type === 'url') return `${labelText} must be a valid website URL.`;
    return `${labelText} has an invalid format.`;
  }
  if (validity.patternMismatch) {
    return `${labelText} does not match the required format.`;
  }
  if (validity.rangeUnderflow) {
    return `${labelText} must be at least ${el.min}.`;
  }
  if (validity.rangeOverflow) {
    return `${labelText} cannot exceed ${el.max}.`;
  }
  if (validity.stepMismatch) {
    return `${labelText} has an invalid step value.`;
  }
  if (validity.tooShort) {
    return `${labelText} must be at least ${el.minLength} characters.`;
  }
  if (validity.tooLong) {
    return `${labelText} cannot exceed ${el.maxLength} characters.`;
  }

  return el.validationMessage ? `${labelText}: ${el.validationMessage}` : `${labelText} is invalid.`;
};

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: 'Validation Error',
    message: '',
    errors: [],
    type: 'error',
    buttonText: 'OK',
  });

  const resolverRef = useRef(null);
  const activeFocusElementRef = useRef(null);

  const showAlert = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      let title = 'Validation Error';
      let message = '';
      let errors = [];
      let type = 'error';
      let buttonText = 'OK';

      if (typeof options === 'string') {
        message = options;
      } else if (options) {
        title = options.title || 'Validation Error';
        message = options.message || '';
        errors = Array.isArray(options.errors) ? options.errors : [];
        type = options.type || 'error';
        buttonText = options.buttonText || 'OK';

        if (options.error) {
          const parsed = parseError(options.error);
          if (!message) message = parsed.message;
          if (errors.length === 0) errors = parsed.errors;
        }
      }

      setAlertState({
        isOpen: true,
        title,
        message,
        errors,
        type,
        buttonText,
      });
    });
  }, []);

  const showValidationError = useCallback((errorOrMsg, customTitle = 'Validation Error') => {
    const parsed = parseError(errorOrMsg);
    return showAlert({
      title: customTitle,
      message: parsed.message,
      errors: parsed.errors,
      type: 'error',
      buttonText: 'OK',
    });
  }, [showAlert]);

  const handleClose = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setAlertState(prev => ({ ...prev, isOpen: false }));

    if (activeFocusElementRef.current) {
      try {
        activeFocusElementRef.current.focus();
      } catch (_) {}
      activeFocusElementRef.current = null;
    }
  }, []);

  // Expose global references for non-hook consumers
  useEffect(() => {
    globalShowAlert = showAlert;
    globalShowValidationError = showValidationError;
    return () => {
      globalShowAlert = null;
      globalShowValidationError = null;
    };
  }, [showAlert, showValidationError]);

  // Global browser HTML5 form validation interceptor
  // This automatically intercepts ALL form validation errors across the entire application
  useEffect(() => {
    let pendingForm = null;
    let pendingRaf = null;

    const handleInvalid = (e) => {
      // 1. Prevent default native browser tooltip / alert message
      e.preventDefault();

      const target = e.target;
      const form = target.form || target.closest('form');
      if (!form) return;

      pendingForm = form;

      if (!pendingRaf) {
        pendingRaf = requestAnimationFrame(() => {
          pendingRaf = null;
          if (!pendingForm) return;

          const currentForm = pendingForm;
          pendingForm = null;

          // Collect all invalid elements in the submitted form
          const invalidElements = Array.from(currentForm.querySelectorAll(':invalid'));
          if (invalidElements.length === 0) return;

          // Deduplicate error messages by label
          const seenLabels = new Set();
          const errorList = [];

          for (const el of invalidElements) {
            const errorMsg = getFriendlyValidationMessage(el);
            if (!seenLabels.has(errorMsg)) {
              seenLabels.add(errorMsg);
              errorList.push(errorMsg);
            }
          }

          // Remember first invalid element to focus upon dismissal
          activeFocusElementRef.current = invalidElements[0];

          showAlert({
            title: 'Form Validation Error',
            message: 'Please fill in all required fields and correct the errors below:',
            errors: errorList,
            type: 'error',
            buttonText: 'OK',
          });
        });
      }
    };

    // Capture phase listener catches invalid events on any input/select/textarea in the app
    document.addEventListener('invalid', handleInvalid, true);

    return () => {
      document.removeEventListener('invalid', handleInvalid, true);
      if (pendingRaf) cancelAnimationFrame(pendingRaf);
    };
  }, [showAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, showValidationError, closeAlert: handleClose }}>
      {children}
      <AlertDialog
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        errors={alertState.errors}
        type={alertState.type}
        buttonText={alertState.buttonText}
        onClose={handleClose}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export default AlertContext;
