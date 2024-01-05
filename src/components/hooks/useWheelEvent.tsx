import { MutableRefObject, useEffect, useRef } from 'react';

const useMouseWheel = (callback: (event: WheelEvent, cumulativeDelta: number) => void) => {
  const cumulativeDeltaRef = useRef<number>(0);
  const currentPhaseRef = useRef<number>(1); // Initialize currentPhaseRef to 1
  const normalizedValueRef = useRef<number>(0); // Initialize normalizedValueRef to 0
  const totalRange = 4000;
  const numScenes = 4;

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      cumulativeDeltaRef.current += event.deltaY;
      callback(event, cumulativeDeltaRef.current);

      // Update currentPhaseRef
      const normalizedDelta = Math.floor((cumulativeDeltaRef.current % totalRange) / (totalRange / numScenes));
      currentPhaseRef.current = normalizedDelta + 1;

      // Update normalizedValueRef
      normalizedValueRef.current = cumulativeDeltaRef.current / totalRange;
     
    };

    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [callback]);

  return {
    cumulativeDeltaRef,
    currentPhaseRef,
    normalizedValueRef
  };
};

export default useMouseWheel;
