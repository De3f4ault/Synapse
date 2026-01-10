/**
 * Shared Async - Public API
 */

export {
    type AsyncState,
    idle,
    loading,
    success,
    error,
    isIdle,
    isLoading,
    isSuccess,
    isError,
    getData,
    mapData,
    combineStates,
} from "./AsyncState";
