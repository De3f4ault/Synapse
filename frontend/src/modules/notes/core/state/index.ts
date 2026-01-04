/**
 * Notes Module - State Barrel Export
 */

export { useNoteStore, onNoteChange } from "./noteStore";
export {
    useActiveNoteId,
    useActiveNoteData,
    useNoteIsBusy,
    useNoteCanEdit,
    useNoteCanSave,
    useNoteCanDelete,
    useNoteError,
} from "./noteSelectors";
