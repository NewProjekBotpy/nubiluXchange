import { useEffect, useState, useCallback, useRef } from 'react';

interface MobileKeyboardOptions {
  adjustViewport?: boolean;
  hideElements?: string[];
  adjustPadding?: boolean;
  threshold?: number;
}

interface KeyboardState {
  isVisible: boolean;
  height: number;
  previousHeight: number;
  isTransitioning: boolean;
}

const DEFAULT_OPTIONS: Required<MobileKeyboardOptions> = {
  adjustViewport: true,
  hideElements: [],
  adjustPadding: true,
  threshold: 150
};

export function useMobileKeyboard(options: MobileKeyboardOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    previousHeight: 0,
    isTransitioning: false
  });

  const initialViewportHeightRef = useRef<number>(window.innerHeight);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleViewportChange = useCallback(() => {
    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeightRef.current - currentHeight;
    const keyboardHeight = Math.max(0, heightDifference);

    const isKeyboardVisible = keyboardHeight > opts.threshold;

    setKeyboardState(prev => {
      if (prev.isVisible === isKeyboardVisible && prev.height === keyboardHeight) {
        return prev; // No change
      }

      return {
        isVisible: isKeyboardVisible,
        height: keyboardHeight,
        previousHeight: prev.height,
        isTransitioning: true
      };
    });

    // Clear transition state after animation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setKeyboardState(prev => ({ ...prev, isTransitioning: false }));
    }, 300);

  }, [opts.threshold]);

  // Handle viewport adjustments
  useEffect(() => {
    if (!opts.adjustViewport) return;

    const handleResize = () => {
      // Debounce resize events
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(handleViewportChange, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Also listen for visual viewport API if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [opts.adjustViewport, handleViewportChange]);

  // Handle element hiding
  useEffect(() => {
    if (!opts.hideElements.length) return;

    const elements = opts.hideElements
      .map(selector => document.querySelector(selector))
      .filter(Boolean) as HTMLElement[];

    if (keyboardState.isVisible) {
      elements.forEach(element => {
        element.style.transition = 'transform 0.3s ease-in-out';
        element.style.transform = 'translateY(-100%)';
      });
    } else {
      elements.forEach(element => {
        element.style.transform = 'translateY(0)';
      });
    }
  }, [keyboardState.isVisible, opts.hideElements]);

  // Handle padding adjustment for main content
  useEffect(() => {
    if (!opts.adjustPadding) return;

    const mainContent = document.querySelector('main') || document.body;
    
    if (keyboardState.isVisible) {
      mainContent.style.paddingBottom = `${keyboardState.height}px`;
      mainContent.style.transition = 'padding-bottom 0.3s ease-in-out';
    } else {
      mainContent.style.paddingBottom = '';
    }
  }, [keyboardState.isVisible, keyboardState.height, opts.adjustPadding]);

  const scrollToInput = useCallback((inputElement: HTMLElement, offset: number = 20) => {
    if (!keyboardState.isVisible) return;

    setTimeout(() => {
      const rect = inputElement.getBoundingClientRect();
      const availableHeight = window.innerHeight - keyboardState.height;
      
      if (rect.bottom > availableHeight) {
        const scrollAmount = rect.bottom - availableHeight + offset;
        window.scrollBy({
          top: scrollAmount,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [keyboardState.isVisible, keyboardState.height]);

  const adjustForKeyboard = useCallback((element: HTMLElement) => {
    if (!element) return;

    const focusHandler = () => scrollToInput(element);
    const blurHandler = () => {
      // Optionally scroll back when input loses focus
      if (!keyboardState.isVisible) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    element.addEventListener('focus', focusHandler);
    element.addEventListener('blur', blurHandler);

    return () => {
      element.removeEventListener('focus', focusHandler);
      element.removeEventListener('blur', blurHandler);
    };
  }, [scrollToInput, keyboardState.isVisible]);

  return {
    keyboardState,
    scrollToInput,
    adjustForKeyboard,
    isSupported: typeof window !== 'undefined'
  };
}

// Hook for input field optimization
export function useKeyboardAwareInput() {
  const { keyboardState, scrollToInput, adjustForKeyboard } = useMobileKeyboard({
    adjustViewport: true,
    adjustPadding: true
  });

  const inputRef = useRef<HTMLInputElement | null>(null);

  const registerInput = useCallback((element: HTMLInputElement | null) => {
    if (inputRef.current && inputRef.current !== element) {
      // Cleanup previous input
    }

    if (element) {
      inputRef.current = element;
      return adjustForKeyboard(element);
    }
  }, [adjustForKeyboard]);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      setTimeout(() => {
        if (inputRef.current) {
          scrollToInput(inputRef.current);
        }
      }, 100);
    }
  }, [scrollToInput]);

  return {
    keyboardState,
    registerInput,
    focusInput,
    inputRef
  };
}

// Hook for form optimization
export function useKeyboardAwareForm() {
  const { keyboardState, adjustForKeyboard } = useMobileKeyboard({
    adjustViewport: true,
    hideElements: ['.bottom-navigation', '.floating-action-button'],
    adjustPadding: true
  });

  const formRef = useRef<HTMLFormElement | null>(null);

  const registerForm = useCallback((element: HTMLFormElement | null) => {
    if (element) {
      formRef.current = element;
      
      // Register all inputs in the form
      const inputs = element.querySelectorAll('input, textarea, select');
      const cleanupFunctions: (() => void)[] = [];

      inputs.forEach(input => {
        const cleanup = adjustForKeyboard(input as HTMLElement);
        if (cleanup) {
          cleanupFunctions.push(cleanup);
        }
      });

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    }
  }, [adjustForKeyboard]);

  return {
    keyboardState,
    registerForm,
    formRef
  };
}