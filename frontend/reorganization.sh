#!/bin/bash

# Pages Reorganization Script
# This script creates the new structure for documents, notes, flashcards, quizzes, and study pages

set -e # Exit on error

echo "🚀 Starting pages reorganization..."

# Base directory
BASE_DIR="src/pages"

# Function to create directory if it doesn't exist
create_dir() {
	if [ ! -d "$1" ]; then
		mkdir -p "$1"
		echo "✓ Created: $1"
	else
		echo "→ Already exists: $1"
	fi
}

# Function to create empty file with a comment
create_file() {
	if [ ! -f "$1" ]; then
		echo "// TODO: Implement $2" >"$1"
		echo "✓ Created: $1"
	else
		echo "→ Already exists: $1"
	fi
}

echo ""
echo "📁 Creating Documents structure..."
# Documents
create_dir "$BASE_DIR/documents"
create_dir "$BASE_DIR/documents/components/list"
create_dir "$BASE_DIR/documents/components/upload"
create_dir "$BASE_DIR/documents/components/viewer"
create_dir "$BASE_DIR/documents/components/shared"
create_dir "$BASE_DIR/documents/hooks"
create_dir "$BASE_DIR/documents/utils"
create_dir "$BASE_DIR/documents/types"

# Create Documents files
create_file "$BASE_DIR/documents/index.ts" "Documents exports"
create_file "$BASE_DIR/documents/components/list/DocumentCard.tsx" "DocumentCard"
create_file "$BASE_DIR/documents/components/list/DocumentGrid.tsx" "DocumentGrid"
create_file "$BASE_DIR/documents/components/list/DocumentTable.tsx" "DocumentTable"
create_file "$BASE_DIR/documents/components/upload/UploadArea.tsx" "UploadArea"
create_file "$BASE_DIR/documents/components/upload/UploadProgress.tsx" "UploadProgress"
create_file "$BASE_DIR/documents/components/upload/FileValidator.tsx" "FileValidator"
create_file "$BASE_DIR/documents/components/viewer/DocumentViewer.tsx" "DocumentViewer"
create_file "$BASE_DIR/documents/components/viewer/ChunkExplorer.tsx" "ChunkExplorer"
create_file "$BASE_DIR/documents/components/viewer/ProcessingStatus.tsx" "ProcessingStatus"
create_file "$BASE_DIR/documents/components/shared/DocumentStats.tsx" "DocumentStats"
create_file "$BASE_DIR/documents/components/shared/FilterBar.tsx" "FilterBar"
create_file "$BASE_DIR/documents/hooks/useDocuments.ts" "useDocuments hook"
create_file "$BASE_DIR/documents/hooks/useDocumentUpload.ts" "useDocumentUpload hook"
create_file "$BASE_DIR/documents/hooks/useDocumentViewer.ts" "useDocumentViewer hook"
create_file "$BASE_DIR/documents/utils/fileValidation.ts" "fileValidation utils"
create_file "$BASE_DIR/documents/utils/chunkProcessing.ts" "chunkProcessing utils"
create_file "$BASE_DIR/documents/types/documents.types.ts" "documents types"

echo ""
echo "📝 Creating Notes structure..."
# Notes
create_dir "$BASE_DIR/notes"
create_dir "$BASE_DIR/notes/components/list"
create_dir "$BASE_DIR/notes/components/editor"
create_dir "$BASE_DIR/notes/components/detail"
create_dir "$BASE_DIR/notes/components/shared"
create_dir "$BASE_DIR/notes/hooks"
create_dir "$BASE_DIR/notes/utils"
create_dir "$BASE_DIR/notes/types"

# Create Notes files
create_file "$BASE_DIR/notes/index.ts" "Notes exports"
create_file "$BASE_DIR/notes/components/list/NoteCard.tsx" "NoteCard"
create_file "$BASE_DIR/notes/components/list/NoteTree.tsx" "NoteTree"
create_file "$BASE_DIR/notes/components/list/NoteSearch.tsx" "NoteSearch"
create_file "$BASE_DIR/notes/components/editor/NoteEditor.tsx" "NoteEditor"
create_file "$BASE_DIR/notes/components/editor/EditorToolbar.tsx" "EditorToolbar"
create_file "$BASE_DIR/notes/components/editor/MarkdownPreview.tsx" "MarkdownPreview"
create_file "$BASE_DIR/notes/components/detail/NoteHeader.tsx" "NoteHeader"
create_file "$BASE_DIR/notes/components/detail/VersionHistory.tsx" "VersionHistory"
create_file "$BASE_DIR/notes/components/detail/NoteTags.tsx" "NoteTags"
create_file "$BASE_DIR/notes/components/shared/NoteStats.tsx" "NoteStats"
create_file "$BASE_DIR/notes/hooks/useNotes.ts" "useNotes hook"
create_file "$BASE_DIR/notes/hooks/useNoteEditor.ts" "useNoteEditor hook"
create_file "$BASE_DIR/notes/hooks/useNoteTree.ts" "useNoteTree hook"
create_file "$BASE_DIR/notes/utils/markdown.ts" "markdown utils"
create_file "$BASE_DIR/notes/utils/noteOrganizer.ts" "noteOrganizer utils"
create_file "$BASE_DIR/notes/types/notes.types.ts" "notes types"

echo ""
echo "🎴 Creating Flashcards structure..."
# Flashcards
create_dir "$BASE_DIR/flashcards"
create_dir "$BASE_DIR/flashcards/components/deck"
create_dir "$BASE_DIR/flashcards/components/card"
create_dir "$BASE_DIR/flashcards/components/review"
create_dir "$BASE_DIR/flashcards/components/shared"
create_dir "$BASE_DIR/flashcards/hooks"
create_dir "$BASE_DIR/flashcards/utils"
create_dir "$BASE_DIR/flashcards/types"

# Create Flashcards files
create_file "$BASE_DIR/flashcards/index.ts" "Flashcards exports"
create_file "$BASE_DIR/flashcards/components/deck/DeckCard.tsx" "DeckCard"
create_file "$BASE_DIR/flashcards/components/deck/DeckList.tsx" "DeckList"
create_file "$BASE_DIR/flashcards/components/deck/DeckStats.tsx" "DeckStats"
create_file "$BASE_DIR/flashcards/components/deck/DeckSettings.tsx" "DeckSettings"
create_file "$BASE_DIR/flashcards/components/card/FlashcardEditor.tsx" "FlashcardEditor"
create_file "$BASE_DIR/flashcards/components/card/CardPreview.tsx" "CardPreview"
create_file "$BASE_DIR/flashcards/components/card/CardList.tsx" "CardList"
create_file "$BASE_DIR/flashcards/components/review/CardFlip.tsx" "CardFlip"
create_file "$BASE_DIR/flashcards/components/review/ReviewTimer.tsx" "ReviewTimer"
create_file "$BASE_DIR/flashcards/components/review/SwipeGesture.tsx" "SwipeGesture"
create_file "$BASE_DIR/flashcards/components/review/DifficultyButtons.tsx" "DifficultyButtons"
create_file "$BASE_DIR/flashcards/components/review/ReviewProgress.tsx" "ReviewProgress"
create_file "$BASE_DIR/flashcards/components/shared/SpacedRepetitionInfo.tsx" "SpacedRepetitionInfo"
create_file "$BASE_DIR/flashcards/components/shared/ReviewStats.tsx" "ReviewStats"
create_file "$BASE_DIR/flashcards/hooks/useDecks.ts" "useDecks hook"
create_file "$BASE_DIR/flashcards/hooks/useCards.ts" "useCards hook"
create_file "$BASE_DIR/flashcards/hooks/useReviewSession.ts" "useReviewSession hook"
create_file "$BASE_DIR/flashcards/utils/spacedRepetition.ts" "spacedRepetition utils"
create_file "$BASE_DIR/flashcards/utils/cardScheduler.ts" "cardScheduler utils"
create_file "$BASE_DIR/flashcards/types/flashcards.types.ts" "flashcards types"

echo ""
echo "❓ Creating Quizzes structure..."
# Quizzes
create_dir "$BASE_DIR/quizzes"
create_dir "$BASE_DIR/quizzes/components/list"
create_dir "$BASE_DIR/quizzes/components/builder"
create_dir "$BASE_DIR/quizzes/components/taker"
create_dir "$BASE_DIR/quizzes/components/results"
create_dir "$BASE_DIR/quizzes/components/shared"
create_dir "$BASE_DIR/quizzes/hooks"
create_dir "$BASE_DIR/quizzes/utils"
create_dir "$BASE_DIR/quizzes/types"

# Create Quizzes files
create_file "$BASE_DIR/quizzes/index.ts" "Quizzes exports"
create_file "$BASE_DIR/quizzes/components/list/QuizCard.tsx" "QuizCard"
create_file "$BASE_DIR/quizzes/components/list/QuizGrid.tsx" "QuizGrid"
create_file "$BASE_DIR/quizzes/components/list/QuizFilters.tsx" "QuizFilters"
create_file "$BASE_DIR/quizzes/components/builder/QuizBuilder.tsx" "QuizBuilder"
create_file "$BASE_DIR/quizzes/components/builder/QuestionEditor.tsx" "QuestionEditor"
create_file "$BASE_DIR/quizzes/components/builder/QuestionTypeSelector.tsx" "QuestionTypeSelector"
create_file "$BASE_DIR/quizzes/components/taker/QuestionCard.tsx" "QuestionCard"
create_file "$BASE_DIR/quizzes/components/taker/AnswerOptions.tsx" "AnswerOptions"
create_file "$BASE_DIR/quizzes/components/taker/QuizProgress.tsx" "QuizProgress"
create_file "$BASE_DIR/quizzes/components/taker/QuizTimer.tsx" "QuizTimer"
create_file "$BASE_DIR/quizzes/components/results/ResultsSummary.tsx" "ResultsSummary"
create_file "$BASE_DIR/quizzes/components/results/QuestionReview.tsx" "QuestionReview"
create_file "$BASE_DIR/quizzes/components/results/PerformanceChart.tsx" "PerformanceChart"
create_file "$BASE_DIR/quizzes/components/shared/QuizStats.tsx" "QuizStats"
create_file "$BASE_DIR/quizzes/hooks/useQuizzes.ts" "useQuizzes hook"
create_file "$BASE_DIR/quizzes/hooks/useQuizAttempt.ts" "useQuizAttempt hook"
create_file "$BASE_DIR/quizzes/hooks/useQuizBuilder.ts" "useQuizBuilder hook"
create_file "$BASE_DIR/quizzes/utils/quizScoring.ts" "quizScoring utils"
create_file "$BASE_DIR/quizzes/utils/questionValidator.ts" "questionValidator utils"
create_file "$BASE_DIR/quizzes/types/quizzes.types.ts" "quizzes types"

echo ""
echo "📚 Creating Study structure..."
# Study
create_dir "$BASE_DIR/study"
create_dir "$BASE_DIR/study/components/session"
create_dir "$BASE_DIR/study/components/queue"
create_dir "$BASE_DIR/study/components/recommendations"
create_dir "$BASE_DIR/study/components/shared"
create_dir "$BASE_DIR/study/hooks"
create_dir "$BASE_DIR/study/utils"
create_dir "$BASE_DIR/study/types"

# Create Study files
create_file "$BASE_DIR/study/index.ts" "Study exports"
create_file "$BASE_DIR/study/components/session/StudySession.tsx" "StudySession"
create_file "$BASE_DIR/study/components/session/SessionTimer.tsx" "SessionTimer"
create_file "$BASE_DIR/study/components/session/SessionControls.tsx" "SessionControls"
create_file "$BASE_DIR/study/components/queue/DueItems.tsx" "DueItems"
create_file "$BASE_DIR/study/components/queue/ItemCard.tsx" "ItemCard"
create_file "$BASE_DIR/study/components/queue/PriorityIndicator.tsx" "PriorityIndicator"
create_file "$BASE_DIR/study/components/recommendations/RecommendationCard.tsx" "RecommendationCard"
create_file "$BASE_DIR/study/components/recommendations/LearningPath.tsx" "LearningPath"
create_file "$BASE_DIR/study/components/recommendations/SuggestedTopics.tsx" "SuggestedTopics"
create_file "$BASE_DIR/study/components/shared/StudyStats.tsx" "StudyStats"
create_file "$BASE_DIR/study/components/shared/StreakIndicator.tsx" "StreakIndicator"
create_file "$BASE_DIR/study/hooks/useStudySession.ts" "useStudySession hook"
create_file "$BASE_DIR/study/hooks/useDueItems.ts" "useDueItems hook"
create_file "$BASE_DIR/study/hooks/useRecommendations.ts" "useRecommendations hook"
create_file "$BASE_DIR/study/utils/sessionScheduler.ts" "sessionScheduler utils"
create_file "$BASE_DIR/study/utils/priorityEngine.ts" "priorityEngine utils"
create_file "$BASE_DIR/study/types/study.types.ts" "study types"

echo ""
echo "✅ Structure creation complete!"
echo ""
echo "📋 Summary:"
echo "  - Documents: 17 files created"
echo "  - Notes: 16 files created"
echo "  - Flashcards: 20 files created"
echo "  - Quizzes: 19 files created"
echo "  - Study: 16 files created"
echo ""
echo "🎉 Total: 88 new files and directories!"
echo ""
echo "⚠️  Note: All files contain '// TODO: Implement' comments."
echo "   You'll need to move existing code and implement new components."
