/**
 * MessageActions - Oracle Theme
 * Bottom action bar for Oracle responses.
 *
 * Location: chat/components/messages/MessageActions.tsx
 */

import React, { useState } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown, Share2, MoreVertical } from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageActionsProps {
  content: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-slate-500">
    <button className="p-1.5 hover:text-cyan-400 hover:bg-white/5 rounded-md transition-all">
    <ThumbsUp size={14} />
    </button>
    <button className="p-1.5 hover:text-red-400 hover:bg-white/5 rounded-md transition-all">
    <ThumbsDown size={14} />
    </button>

    <div className="w-px h-3 bg-white/10 mx-1" />

    <button className="p-1.5 hover:text-purple-400 hover:bg-white/5 rounded-md transition-all">
    <Share2 size={14} />
    </button>

    <button
    onClick={handleCopy}
    className="p-1.5 hover:text-emerald-400 hover:bg-white/5 rounded-md transition-all flex items-center gap-1"
    title="Copy to Clipboard"
    >
    {copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} />}
    </button>

    <div className="flex-1" />

    <button className="p-1.5 hover:text-white hover:bg-white/5 rounded-md transition-all">
    <MoreVertical size={14} />
    </button>
    </div>
  );
};

export default MessageActions;
