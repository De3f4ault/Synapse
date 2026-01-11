import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SimpleDropdownMenu,
  SimpleDropdownMenuTrigger,
  SimpleDropdownMenuContent,
  SimpleDropdownMenuItem,
} from "@/components/custom/SimpleDropdownMenu";
import {
  MessageSquare,
  BookOpen,
  FileQuestion,
  FileText,
  MoreHorizontal,
} from "lucide-react";

/**
 * QuickActions - Context-Sensitive Resource Actions
 *
 * Provides quick cross-module actions for any resource
 * Features:
 * - Chat with resource
 * - Generate flashcards
 * - Generate quiz
 * - Create notes
 */

interface QuickActionsProps {
  resourceType: "document" | "note" | "deck" | "quiz";
  resourceId: number;
  resourceTitle?: string; // Optional, used for context
  className?: string;
}

export function QuickActions({
  resourceType,
  resourceId,
  className,
}: QuickActionsProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const documentActions = [
    {
      label: "Chat with Document",
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => navigate(`/chat/new?documentId=${resourceId}&mode=study`),
    },
    {
      label: "Create Flashcards",
      icon: <BookOpen className="h-4 w-4" />,
      onClick: () => navigate(`/flashcards/create?fromDocument=${resourceId}`),
    },
    {
      label: "Generate Quiz",
      icon: <FileQuestion className="h-4 w-4" />,
      onClick: () => navigate(`/quizzes/create?fromDocument=${resourceId}`),
    },
    {
      label: "Create Note",
      icon: <FileText className="h-4 w-4" />,
      onClick: () => navigate(`/notes/new?fromDocument=${resourceId}`),
    },
  ];

  const noteActions = [
    {
      label: "Chat about Note",
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => navigate(`/chat/new?noteId=${resourceId}`),
    },
    {
      label: "Create Flashcards",
      icon: <BookOpen className="h-4 w-4" />,
      onClick: () => navigate(`/flashcards/create?fromNote=${resourceId}`),
    },
    {
      label: "Generate Quiz",
      icon: <FileQuestion className="h-4 w-4" />,
      onClick: () => navigate(`/quizzes/create?fromNote=${resourceId}`),
    },
  ];

  const deckActions = [
    {
      label: "Chat about Deck",
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => navigate(`/chat/new?deckId=${resourceId}`),
    },
    {
      label: "Generate Quiz",
      icon: <FileQuestion className="h-4 w-4" />,
      onClick: () => navigate(`/quizzes/create?fromDeck=${resourceId}`),
    },
  ];

  const quizActions = [
    {
      label: "Review Answers",
      icon: <FileText className="h-4 w-4" />,
      onClick: () => navigate(`/quizzes/${resourceId}/review`),
    },
  ];

  const actionsMap = {
    document: documentActions,
    note: noteActions,
    deck: deckActions,
    quiz: quizActions,
  };

  const actions = actionsMap[resourceType];

  return (
    <SimpleDropdownMenu>
      <SimpleDropdownMenuTrigger
        className={`synapse-icon-button ${className || ""}`}
        title="Quick Actions"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </SimpleDropdownMenuTrigger>
      {isOpen && (
        <SimpleDropdownMenuContent>
          {actions.map((action, index) => (
            <SimpleDropdownMenuItem
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </SimpleDropdownMenuItem>
          ))}
        </SimpleDropdownMenuContent>
      )}
    </SimpleDropdownMenu>
  );
}

