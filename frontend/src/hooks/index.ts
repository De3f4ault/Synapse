/**
 * Hooks Barrel Export
 *
 * Centralized exports for all custom hooks.
 */

// Existing hooks
export { useDebounce, useDebouncedCallback } from "./useDebounce";
export {
  useLocalStorage,
  STORAGE_KEYS as LOCAL_STORAGE_KEYS,
} from "./useLocalStorage";
export type { StorageKey } from "./useLocalStorage";
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  usePrefersReducedMotion as useMediaQueryPrefersReducedMotion,
  usePrefersDarkMode,
  useBreakpoint,
  BREAKPOINTS,
} from "./useMediaQuery";
export type { Breakpoint } from "./useMediaQuery";
export { useToast, toast } from "./use-toast";

// New hooks
export { useAnnounce, announcePolite, announceAssertive } from "./useAnnounce";
export {
  useNetworkStatus,
  useNetworkStatusWithCallback,
} from "./useNetworkStatus";
export {
  usePrefersReducedMotion,
  useShouldAnimate,
} from "./usePrefersReducedMotion";
export {
  useQueryError,
  useQueryErrorBoundary,
  getErrorMessage,
} from "./useQueryError";
