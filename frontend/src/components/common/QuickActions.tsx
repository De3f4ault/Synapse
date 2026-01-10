import { useNavigate } from "react-router-dom";
import { SimpleDropdownMenu } from "@/components/custom/SimpleDropdownMenu";
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
  resourceTitle: string;
  className?: string;
}

export function QuickActions({
  resourceType,
  resourceId,
  resourceTitle,
  className,
}: QuickActionsProps) {
  const navigate = useNavigate();

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

  const actions = {
    document: documentActions,
    note: noteActions,
    deck: deckActions,
    quiz: quizActions,
  };

  return (
    <SimpleDropdownMenu
      trigger={
        <button
          className={`synapse-icon-button ${className}`}
          title="Quick Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      }
      items={actions[resourceType]}
    />
  );
}
