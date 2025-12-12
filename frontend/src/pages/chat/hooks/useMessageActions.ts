/**
 * useMessageActions - Copy, regenerate logic
 * Provides actions for message interactions
 */

import { useState } from 'react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';
import type { ChatMessageResponse } from '@/api/generated/types.gen';

export const useMessageActions = () => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  /**
   * Copy message content to clipboard
   */
  const copyMessage = async (message: ChatMessageResponse) => {
    const success = await copyToClipboard(message.content);

    if (success) {
      setCopiedId(message.id);
      toast.success('Copied to clipboard');

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  /**
   * Copy code block to clipboard
   */
  const copyCode = async (code: string) => {
    const success = await copyToClipboard(code);

    if (success) {
      toast.success('Code copied');
    } else {
      toast.error('Failed to copy code');
    }
  };

  /**
   * Regenerate assistant response
   * TODO: Implement API endpoint for regeneration
   */
  const regenerateMessage = async (messageId: number) => {
    toast.info('Regenerate feature coming soon');
    // TODO: Call API to regenerate message
    console.log('Regenerate message:', messageId);
  };

  /**
   * Stop streaming generation
   * TODO: Implement WebSocket stop command
   */
  const stopGeneration = () => {
    toast.info('Stopping generation...');
    // TODO: Send stop command via WebSocket
  };

  /**
   * Edit message (for user messages)
   * TODO: Implement message editing
   */
  const editMessage = async (messageId: number, newContent: string) => {
    toast.info('Edit feature coming soon');
    // TODO: Call API to edit message
    console.log('Edit message:', messageId, newContent);
  };

  return {
    copyMessage,
    copyCode,
    regenerateMessage,
    stopGeneration,
    editMessage,
    copiedId,
    isCopied: (id: number) => copiedId === id,
  };
};
