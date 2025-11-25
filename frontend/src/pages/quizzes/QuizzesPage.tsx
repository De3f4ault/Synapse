import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listQuizzesApiV1QuizzesGet } from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/common/EmptyState';
import {
    Plus,
    Search,
    FileQuestion,
    Play,
    Edit,
    Trash2,
    MoreVertical,
    Clock,
    TrendingUp,
    Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { QuizResponse } from '@/api/generated/types.gen';

/**
 * Enhanced Quizzes Page
 *
 * Features:
 * - Card grid layout
 * - Search filtering
 * - Difficulty badges
 * - Attempt statistics
 * - Quick actions menu
 */

export function QuizzesPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch quizzes
    const { data: quizzes, isLoading } = useQuery({
        queryKey: queryKeys.quizzes.list(),
                                                  queryFn: () => listQuizzesApiV1QuizzesGet(),
    });

    // Filter quizzes
    const filteredQuizzes = quizzes?.filter((quiz: QuizResponse) =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy':
                return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300';
            case 'medium':
                return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300';
            case 'hard':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-300';
        }
    };

    return (
        <div className="space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
        <p className="text-muted-foreground mt-1">
        Test your knowledge with custom quizzes
        </p>
        </div>
        <Button onClick={() => navigate('/quizzes/create')} size="lg">
        <Plus className="mr-2 h-4 w-4" />
        Create Quiz
        </Button>
        </motion.div>

        {/* Search Bar */}
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
        >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
        placeholder="Search quizzes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
        />
        </motion.div>

        {/* Loading State */}
        {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full mt-2" />
                </CardHeader>
                <CardContent>
                <div className="h-20 bg-muted rounded" />
                </CardContent>
                </Card>
            ))}
            </div>
        )}

        {/* Empty State */}
        {!isLoading && (!filteredQuizzes || filteredQuizzes.length === 0) && (
            <EmptyState
            icon={<FileQuestion className="h-16 w-16" />}
            title={searchQuery ? 'No quizzes found' : 'No quizzes yet'}
            description={
                searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first quiz to test your knowledge'
            }
            action={
                searchQuery
                ? undefined
                : {
                    label: 'Create Quiz',
                    onClick: () => navigate('/quizzes/create'),
                }
            }
            variant="no-data"
            />
        )}

        {/* Quizzes Grid */}
        {!isLoading && filteredQuizzes && filteredQuizzes.length > 0 && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
            {filteredQuizzes.map((quiz: QuizResponse, index: number) => (
                <QuizCard
                key={quiz.id}
                quiz={quiz}
                index={index}
                onEdit={() => navigate(`/quizzes/${quiz.id}/edit`)}
                onStart={() => navigate(`/quizzes/${quiz.id}/take`)}
                />
            ))}
            </motion.div>
        )}
        </div>
    );
}

/**
 * Quiz Card Component
 */
interface QuizCardProps {
    quiz: QuizResponse;
    index: number;
    onEdit: () => void;
    onStart: () => void;
}

function QuizCard({ quiz, index, onEdit, onStart }: QuizCardProps) {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy':
                return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300';
            case 'medium':
                return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300';
            case 'hard':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-300';
        }
    };

    // Mock data
    const attempts = 0;
    const bestScore = 0;

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -4, scale: 1.02 }}
        >
        <Card className="hover:shadow-xl transition-shadow border-2 hover:border-primary/50 relative overflow-hidden">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />

        <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
        <div className="flex-1">
        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{quiz.title}</h3>
        {quiz.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
            {quiz.description}
            </p>
        )}
        </div>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onStart}>
        <Play className="mr-2 h-4 w-4" />
        Start Quiz
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
        </CardHeader>

        <CardContent className="pb-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className={getDifficultyColor(quiz.difficulty)}>
        {quiz.difficulty}
        </Badge>
        <Badge variant="outline" className="gap-1">
        <FileQuestion className="h-3 w-3" />
        {quiz.question_count} questions
        </Badge>
        {quiz.time_limit_minutes && (
            <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {quiz.time_limit_minutes} min
            </Badge>
        )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <div>
        <p className="text-xs text-muted-foreground">Attempts</p>
        <p className="text-sm font-bold">{attempts}</p>
        </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
        <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
        <div>
        <p className="text-xs text-muted-foreground">Best Score</p>
        <p className="text-sm font-bold">{bestScore}%</p>
        </div>
        </div>
        </div>
        </CardContent>

        <CardFooter className="pt-0 pb-3">
        <Button className="w-full" onClick={onStart}>
        <Play className="mr-2 h-3 w-3" />
        Start Quiz
        </Button>
        </CardFooter>
        </Card>
        </motion.div>
    );
}
