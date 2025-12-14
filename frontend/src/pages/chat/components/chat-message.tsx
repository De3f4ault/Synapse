import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatMessageResponse } from "@/api/generated";

interface ChatMessageProps {
    message: ChatMessageResponse;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div
            className={cn(
                "flex gap-4",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            {!isUser && (
                <div className="shrink-0">
                    <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
                        <Logo className="size-6" />
                    </div>
                </div>
            )}

            <div
                className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%]",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                )}
            >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>

            {isUser && (
                <div className="shrink-0">
                    <Avatar className="size-8">
                        <AvatarImage src="/avatar.png" alt="User" />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                </div>
            )}
        </div>
    );
}
