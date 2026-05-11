import { useActivateScroll } from "@/store";
import { useEffect, useRef, useCallback } from "react";

const useMouseWheelAndTouch = (
  callback: (event: WheelEvent | TouchEvent, cumulativeDelta: number) => void
) => {
  const cumulativeDeltaRef = useRef<number>(0);
  const currentPhaseRef = useRef<number>(1);
  const normalizedValueRef = useRef<number>(0);
  const lastTouchYRef = useRef<number>(0);

  // Snap state
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapAnimationRef = useRef<number | null>(null);
  const snapTargetRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);

  const totalRange = 4000;
  const numScenes = 4;
  const sceneSize = totalRange / numScenes; // 1000
  const snapDelay = 1000; // ms idle before snap triggers
  const snapDamping = 0.015; // very soft damp factor per frame
  const snapThreshold = 0.5; // px close enough to stop

  const [activateScroll, setActivateScroll] = useActivateScroll((state) => [
    state.activateScroll,
    state.setActivateScroll,
  ]);

  const updateDerivedValues = useCallback(() => {
    const clamped = Math.max(0, cumulativeDeltaRef.current);
    const wrapped = clamped % totalRange;

    const normalizedDelta = Math.floor(wrapped / sceneSize);
    currentPhaseRef.current = normalizedDelta + 1;
    normalizedValueRef.current = wrapped / totalRange;
  }, []);

  const cancelSnap = useCallback(() => {
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
    if (snapAnimationRef.current) {
      cancelAnimationFrame(snapAnimationRef.current);
      snapAnimationRef.current = null;
    }
    isSnappingRef.current = false;
    snapTargetRef.current = null;
  }, []);

  const computeSnapTarget = useCallback(() => {
    const clamped = Math.max(0, cumulativeDeltaRef.current);
    const wrapped = clamped % totalRange;
    const positionInScene = wrapped % sceneSize;
    const sceneStart = wrapped - positionInScene;
    const baseOffset = clamped - wrapped; // full cycles
    const pct = positionInScene / sceneSize;

    // Only snap back if barely scrolled in (< 5%), never snap forward
    let target: number | null = null;
    if (pct <= 0.05) {
      target = baseOffset + sceneStart;
    }

    // Clamp so we never overshoot into an invalid range
    if (target !== null) {
      target = Math.max(0, target);
      // Ensure target aligns to a clean scene boundary
      target = Math.round(target / sceneSize) * sceneSize;
    }
    return target;
  }, []);

  const animateSnap = useCallback(() => {
    if (snapTargetRef.current === null) return;

    const target = snapTargetRef.current;
    const current = cumulativeDeltaRef.current;
    const diff = target - current;

    if (Math.abs(diff) < snapThreshold) {
      // Close enough — snap exactly
      cumulativeDeltaRef.current = target;
      updateDerivedValues();
      isSnappingRef.current = false;
      snapTargetRef.current = null;
      snapAnimationRef.current = null;
      return;
    }

    cumulativeDeltaRef.current = current + diff * snapDamping;
    updateDerivedValues();

    snapAnimationRef.current = requestAnimationFrame(animateSnap);
  }, []);

  const scheduleSnap = useCallback(() => {
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }

    snapTimeoutRef.current = setTimeout(() => {
      const target = computeSnapTarget();
      if (target === null) return; // not near an edge, leave it
      snapTargetRef.current = target;
      isSnappingRef.current = true;
      snapAnimationRef.current = requestAnimationFrame(animateSnap);
    }, snapDelay);
  }, []);

  const handleWheel = (event: WheelEvent) => {
    if (!activateScroll) {
      event.preventDefault();
    }

    // Cancel any in-progress snap
    cancelSnap();

    cumulativeDeltaRef.current += event.deltaY;
    // Prevent scrolling into negative
    if (cumulativeDeltaRef.current < 0) cumulativeDeltaRef.current = 0;

    updateDerivedValues();
    callback(event, cumulativeDeltaRef.current);

    // Schedule snap after idle
    scheduleSnap();
  };

  const handleTouchStart = (event: TouchEvent) => {
    lastTouchYRef.current = event.touches[0].clientY;
    cancelSnap();
  };

  const handleTouchMove = (event: TouchEvent) => {
    const touchY = event.touches[0].clientY;
    const deltaY = lastTouchYRef.current - touchY;
    lastTouchYRef.current = touchY;

    cancelSnap();

    cumulativeDeltaRef.current += deltaY;
    if (cumulativeDeltaRef.current < 0) cumulativeDeltaRef.current = 0;

    updateDerivedValues();
    callback(event, cumulativeDeltaRef.current);

    scheduleSnap();
  };

  const handleTouchEnd = () => {
    scheduleSnap();
  };

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      cancelSnap();
    };
  }, [callback]);

  return {
    cumulativeDeltaRef,
    currentPhaseRef,
    normalizedValueRef,
    isSnappingRef,
  };
};

export default useMouseWheelAndTouch;
