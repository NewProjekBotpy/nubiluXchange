import { useState, useEffect, useRef } from "react";
import { STORY_DURATION, PROGRESS_INTERVAL } from "@/utils/status-helpers";

interface UseStoryTimerOptions {
  isActive: boolean;
  currentStoryIndex: number | undefined;
  userId: number | undefined;
  currentUser: any;
  onAdvance: () => void;
}

interface UseStoryTimerReturn {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  progress: number;
  resetTimer: () => void;
}

/**
 * Custom hook for managing story auto-advance timer, progress animation, and pause/resume functionality.
 * 
 * @param options - Configuration options
 * @param options.isActive - Whether the story viewer is active (modal open)
 * @param options.currentStoryIndex - Current story index being viewed
 * @param options.userId - ID of the user whose story is being viewed
 * @param options.currentUser - Current user data object
 * @param options.onAdvance - Callback function to call when story auto-advances
 * 
 * @returns Object containing pause state, progress, and control functions
 */
export function useStoryTimer({
  isActive,
  currentStoryIndex,
  userId,
  currentUser,
  onAdvance
}: UseStoryTimerOptions): UseStoryTimerReturn {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimeRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const storyStartTimeRef = useRef<number>(0);
  
  // Store callback in ref to avoid effect re-runs when callback changes
  const onAdvanceRef = useRef(onAdvance);
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  // Reset timer function to clear all timers and reset state
  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    elapsedTimeRef.current = 0;
    pauseStartRef.current = 0;
    storyStartTimeRef.current = 0;
    setProgress(0);
  };

  // Main useEffect for managing auto-advance timer and pause/resume functionality
  useEffect(() => {
    if (!isActive || !currentUser) {
      // Clear timers and reset state if modal is closed
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      elapsedTimeRef.current = 0;
      pauseStartRef.current = 0;
      storyStartTimeRef.current = 0;
      return;
    }

    // Handle pause state
    if (isPaused) {
      // Clear timers when paused
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      
      // Record pause start time
      if (pauseStartRef.current === 0) {
        pauseStartRef.current = Date.now();
        // Calculate and store elapsed time so far
        if (storyStartTimeRef.current > 0) {
          elapsedTimeRef.current = pauseStartRef.current - storyStartTimeRef.current;
        }
      }
      return;
    }

    // Handle resume or initial start
    let effectiveStartTime: number;
    let remainingDuration: number;

    if (pauseStartRef.current > 0) {
      // Resuming from pause - adjust start time to account for elapsed time
      effectiveStartTime = Date.now() - elapsedTimeRef.current;
      remainingDuration = STORY_DURATION - elapsedTimeRef.current;
      pauseStartRef.current = 0; // Reset pause tracking
    } else {
      // Starting fresh (new story or initial load)
      effectiveStartTime = Date.now();
      remainingDuration = STORY_DURATION;
      elapsedTimeRef.current = 0;
      setProgress(0);
    }

    storyStartTimeRef.current = effectiveStartTime;

    // Progress updater - smooth animation from current position
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - effectiveStartTime;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(newProgress);
    }, PROGRESS_INTERVAL);

    // Auto-advance timer - use remaining duration
    timerRef.current = setTimeout(() => {
      onAdvanceRef.current();
    }, remainingDuration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isActive, currentStoryIndex, userId, isPaused, currentUser]);

  return {
    isPaused,
    setIsPaused,
    progress,
    resetTimer
  };
}
