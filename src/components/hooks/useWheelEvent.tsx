import { useActivateScroll, useLoadingProgress } from "@/store";
import { useEffect, useRef, useCallback } from "react";

const useMouseWheelAndTouch = (
  callback: (event: WheelEvent | TouchEvent, cumulativeDelta: number) => void
) => {
  const cumulativeDeltaRef = useRef<number>(0);
  const currentPhaseRef = useRef<number>(1);
  const normalizedValueRef = useRef<number>(0);
  const lastTouchYRef = useRef<number>(0);
  const lastTouchXRef = useRef<number>(0);

  // Snap state
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapAnimationRef = useRef<number | null>(null);
  const snapTargetRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);

  const totalRange = 3000;
  const numScenes = 3;
  const sceneSize = totalRange / numScenes; // 1000
  const snapDelay = 1000; // ms idle before snap triggers
  const snapDamping = 0.015; // very soft damp factor per frame
  const snapThreshold = 0.5; // px close enough to stop
  const mobileTransitionMultiplier =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
      ? 1.5
      : 1;

  const [activateScroll, setActivateScroll] = useActivateScroll((state) => [
    state.activateScroll,
    state.setActivateScroll,
  ]);

  const loadingProgress = useLoadingProgress((state: any) => state.loadingProgress);
  const isLoaded = loadingProgress >= 100;

  const maxScroll = totalRange - 1; // cap at end of phase 4, no wrapping

  const updateDerivedValues = useCallback(() => {
    // Clamp between 0 and max — no wrapping
    cumulativeDeltaRef.current = Math.max(0, Math.min(cumulativeDeltaRef.current, maxScroll));
    const val = cumulativeDeltaRef.current;

    const normalizedDelta = Math.min(Math.floor(val / sceneSize), numScenes - 1);
    currentPhaseRef.current = normalizedDelta + 1;
    normalizedValueRef.current = val / totalRange;
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
    const val = cumulativeDeltaRef.current;
    const positionInScene = val % sceneSize;
    const sceneStart = val - positionInScene;
    const pct = positionInScene / sceneSize;

    // Only snap back if barely scrolled in (< 5%), never snap forward
    if (pct <= 0.05 && sceneStart > 0) {
      return sceneStart;
    }
    return null;
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

    // Block all scroll input while loading
    if (!isLoaded) {
      event.preventDefault();
      return;
    }

    // Cancel any in-progress snap
    cancelSnap();

    cumulativeDeltaRef.current += event.deltaY;
    updateDerivedValues();
    callback(event, cumulativeDeltaRef.current);
    scheduleSnap();
  };

  const handleTouchStart = (event: TouchEvent) => {
    lastTouchYRef.current = event.touches[0].clientY;
    lastTouchXRef.current = event.touches[0].clientX;
    cancelSnap();
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isLoaded) return;

    const touch = event.touches[0];
    const touchY = touch.clientY;
    const touchX = touch.clientX;
    const deltaY = lastTouchYRef.current - touchY;
    const deltaX = lastTouchXRef.current - touchX;
    lastTouchYRef.current = touchY;
    lastTouchXRef.current = touchX;

    if (Math.abs(deltaY) < 2 || Math.abs(deltaY) < Math.abs(deltaX)) return;

    event.preventDefault();
    cancelSnap();

    cumulativeDeltaRef.current += deltaY * 1.35 * mobileTransitionMultiplier;
    updateDerivedValues();
    callback(event, cumulativeDeltaRef.current);

    scheduleSnap();
  };

  const handleTouchEnd = () => {
    scheduleSnap();
  };

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

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
