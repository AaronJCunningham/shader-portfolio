import { MutableRefObject, useEffect, useRef } from 'react';

const useMouseWheelAndTouch = (
  callback: (event: WheelEvent | TouchEvent, cumulativeDelta: number) => void
) => {
  const cumulativeDeltaRef = useRef<number>(0);
  const currentPhaseRef = useRef<number>(1); // Initialize currentPhaseRef to 1
  const normalizedValueRef = useRef<number>(0); // Initialize normalizedValueRef to 0
  const lastTouchYRef = useRef<number>(0);
  const totalRange = 4000;
  const numScenes = 4;

  const handleWheel = (event: WheelEvent) => {
    cumulativeDeltaRef.current += event.deltaY;
    callback(event, cumulativeDeltaRef.current);

    // Update currentPhaseRef
    const normalizedDelta = Math.floor((cumulativeDeltaRef.current % totalRange) / (totalRange / numScenes));
    currentPhaseRef.current = normalizedDelta + 1;

    // Update normalizedValueRef
    normalizedValueRef.current = (cumulativeDeltaRef.current % totalRange) / totalRange;
    console.log("IMPORTANT>>>>>>", cumulativeDeltaRef.current, currentPhaseRef.current, normalizedValueRef.current);
  };

  const handleTouchStart = (event: TouchEvent) => {
    lastTouchYRef.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event: TouchEvent) => {
    const touchY = event.touches[0].clientY;
    const deltaY = lastTouchYRef.current - touchY;
    lastTouchYRef.current = touchY;

    cumulativeDeltaRef.current += deltaY;
    callback(event, cumulativeDeltaRef.current);

    // Reuse existing logic for currentPhaseRef and normalizedValueRef
    const normalizedDelta = Math.floor((cumulativeDeltaRef.current % totalRange) / (totalRange / numScenes));
    currentPhaseRef.current = normalizedDelta + 1;
    normalizedValueRef.current = (cumulativeDeltaRef.current % totalRange) / totalRange;
    console.log("TOUCH MOVE>>>>>>", cumulativeDeltaRef.current, currentPhaseRef.current, normalizedValueRef.current);
  };

  useEffect(() => {
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [callback]);

  return {
    cumulativeDeltaRef,
    currentPhaseRef,
    normalizedValueRef
  };
};

export default useMouseWheelAndTouch;
