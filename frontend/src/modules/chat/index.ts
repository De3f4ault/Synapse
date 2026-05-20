// Chat Module - Public API
// Only export through this barrel file to maintain module isolation

// ==================== HOOKS ====================

// Session Management
export {
  useChatSessions,
  useChatSession,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
} from "./hooks/useChatSession";

// Message Management
export {
  useChatMessages,
  useSendMessage,
  useAddMessage,
  useUpdateMessage,
} from "./hooks/useChatMessages";

// Implicit feedback (used in ChatMain)
export { useImplicitFeedback } from "./hooks/useImplicitFeedback";

// Title Generation
export { useTitleGeneration } from "./hooks/useTitleGeneration";

// File Upload (used in ChatInputBox)
export { useFileUpload } from "./hooks/useFileUpload";

// Evidence Retrieval (Unified Search Integration)
export {
  useChatEvidence,
  formatEvidenceForPrompt,
  formatGroundedPrompt,
  getEvidenceMetadata,
  createEvidenceUsageSignal,
  GROUNDING_SYSTEM_PROMPT,
  GROUNDING_INSTRUCTION,
  type ChatEvidence,
  type ChatEvidenceState,
  type EvidenceUsage,
} from "./hooks/useChatEvidence";
