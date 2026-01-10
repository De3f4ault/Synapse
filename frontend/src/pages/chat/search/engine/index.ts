/**
 * Search Engine - Public API
 *
 * All engine exports go through here.
 * Components/hooks should NOT deep-import from engine/*.
 */

export * from './types';
export { buildIndex, buildDetailedIndex } from './buildIndex';
export { searchIndex, getMatchedMessageIds, groupMatchesByMessage } from './searchIndex';
export { getNextIndex, getPrevIndex, goToIndex, findFirstMatchInMessage, getOccurrenceIndicesForMessage } from './navigateResults';
