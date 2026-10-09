import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ParsedAnalysis } from '../db';

interface EngineContextType {
  isReady: boolean;
  progressText: string;
  isProcessing: boolean;
  processChat: (text: string, context?: string) => Promise<ParsedAnalysis>;
}

const EngineContext = createContext<EngineContextType | null>(null);

/** Attach the standard onmessage handler to a worker, updating shared React state refs */
function attachWorkerHandler(
  worker: Worker,
  setProgressText: (t: string) => void,
  setIsReady: (v: boolean) => void,
  setIsProcessing: (v: boolean) => void,
  processResolver: React.MutableRefObject<{
    resolve: (v: ParsedAnalysis) => void;
    reject: (r?: any) => void;
  } | null>
) {
  worker.onmessage = (e) => {
    const { type, payload } = e.data;
    switch (type) {
      case 'PROGRESS':
        setProgressText(typeof payload === 'string' ? payload : (payload?.text ?? 'Loading model…'));
        break;
      case 'READY':
        setIsReady(true);
        setProgressText('Engine Ready');
        break;
      case 'RESULT':
        setIsProcessing(false);
        if (processResolver.current) {
          processResolver.current.resolve(payload);
          processResolver.current = null;
        }
        break;
      case 'ERROR':
        setIsProcessing(false);
        if (processResolver.current) {
          processResolver.current.reject(new Error(payload));
          processResolver.current = null;
        } else {
          // Surface init errors even if no active process resolver
          setProgressText(`Error: ${payload}`);
        }
        break;
    }
  };

  worker.onerror = (err) => {
    console.error('[EngineContext] Worker threw an uncaught error:', err);
    setIsProcessing(false);
    setProgressText(`Worker Error: ${err.message}`);
    if (processResolver.current) {
      processResolver.current.reject(new Error(err.message));
      processResolver.current = null;
    }
  };
}

export const EngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [progressText, setProgressText] = useState('Loading AI Engine…');
  const [isProcessing, setIsProcessing] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  // Store isReady in a ref so processChat never captures a stale closure
  const isReadyRef = useRef(false);

  const processResolver = useRef<{
    resolve: (value: ParsedAnalysis) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  // Keep isReadyRef in sync with state
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  // Mount: create worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../worker/llm.worker.ts', import.meta.url),
      { type: 'module' }
    );

    attachWorkerHandler(worker, setProgressText, setIsReady, setIsProcessing, processResolver);

    setIsReady(false);
    setProgressText('Downloading/Loading model… (first load may take a few minutes)');

    worker.postMessage({ type: 'INIT' });
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processChat = useCallback((text: string, context?: string): Promise<ParsedAnalysis> => {
    return new Promise((resolve, reject) => {
      if (!isReadyRef.current) {
        reject(new Error('Engine is not ready yet. Please wait for "Engine Ready" status.'));
        return;
      }
      if (!workerRef.current) {
        reject(new Error('Worker is not initialised'));
        return;
      }
      // If a previous process is somehow still running, cancel it
      if (processResolver.current) {
        processResolver.current.reject(new Error('Superseded by newer request'));
      }
      setIsProcessing(true);
      processResolver.current = { resolve, reject };
      workerRef.current.postMessage({
        type: 'PROCESS',
        payload: { text, promptContext: context ?? '' }
      });
    });
  // No dependency on isReady — use ref instead to avoid stale closures
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EngineContext.Provider value={{ isReady, progressText, isProcessing, processChat }}>
      {children}
    </EngineContext.Provider>
  );
};

export const useEngine = () => {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error('useEngine must be used within EngineProvider');
  return ctx;
};
