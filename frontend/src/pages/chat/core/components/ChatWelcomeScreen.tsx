/**
 * ChatWelcomeScreen - Simplified & Clean
 *
 * Just logo + greeting + input box
 * No mode pills, no hardcoded options
 */

import { Logo } from "@/components/ui/logo";
import { ChatInputBox } from "./ChatInputBox";

interface ChatWelcomeScreenProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (attachmentIds?: number[], previewUrls?: string[]) => void;
  onVoiceClick?: () => void;
}

export function ChatWelcomeScreen({
  message,
  onMessageChange,
  onSend,
  onVoiceClick,
}: ChatWelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 md:px-8">
      <div className="w-full max-w-[640px] space-y-8 -mt-12">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center justify-center size-20 rounded-full">
            <Logo className="size-20" />
          </div>
        </div>

        {/* Greeting */}
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Hey! I'm Synapse
          </h1>
          <p className="text-lg text-muted-foreground">
            Tell me everything you need
          </p>
        </div>

        {/* Input Box */}
        <ChatInputBox
          message={message}
          onMessageChange={onMessageChange}
          onSend={onSend}
          onVoiceClick={onVoiceClick}
          placeholder="Ask anything..."
        />
      </div>

      {/* Disclaimer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-sm text-muted-foreground">
          Synapse AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
