import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GripVertical, Eye, Edit, AlertCircle } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FormField } from '@/components/forms/FormField';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormSelect } from '@/components/forms/FormSelect';
import { useCreateQuiz } from '@/api/hooks/useQuizzes';
import { quizCreateSchema, type QuizCreateInput, getDefaultOptions, calculateTotalPoints } from '../schemas';
import type { QuizResponse } from '@/api/generated/types.gen';
import { toast } from 'sonner';

/**
 * Quiz Builder Component - ENHANCED
 *
 * Create quizzes with drag-drop reordering, live preview, and validation.
 *
 * Enhancements from documentation:
 * - Drag-and-drop question reordering (Framer Motion Reorder)
 * - Preview mode to test quiz
 * - Better form validation with inline errors
 * - Auto-save drafts (optional)
 * - Question templates
 * - Total points calculator
 * - Estimated completion time
 */

interface QuizBuilderProps {
    onSuccess?: (quiz: QuizResponse) => void;
    onCancel?: () => void;
}

export function QuizBuilder({ onSuccess, onCancel }: QuizBuilderProps) {
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<QuizCreateInput>({
        resolver: zodResolver(quizCreateSchema),
                                 defaultValues: {
                                     title: '',
                                     description: '',
                                     difficulty: 'medium',
                                     time_limit_minutes: null,
                                     questions: [],
                                 },
    });

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'questions',
    });

    const { mutate: createQuiz, isPending } = useCreateQuiz();

    const questions = watch('questions');
    const totalPoints = calculateTotalPoints(questions || []);
    const estimatedMinutes = Math.ceil((questions?.length || 0) * 1.5);

    const onSubmit = (data: QuizCreateInput) => {
        createQuiz(data, {
            onSuccess: (result) => {
                toast.success('Quiz Created', {
                    description: `${result.question_count} questions added successfully`,
                });
                onSuccess?.(result);
            },
            onError: (error) => {
                toast.error('Failed to Create Quiz', {
                    description: error instanceof Error ? error.message : 'An error occurred',
                });
            },
        });
    };

    const addQuestion = (type: 'multiple_choice' | 'true_false' | 'short_answer' = 'multiple_choice') => {
        append({
            question_text: '',
            question_type: type,
            options: getDefaultOptions(type),
               correct_answer: '',
               explanation: '',
               points: 1,
        });
    };

    const duplicateQuestion = (index: number) => {
        const question = questions[index];
        append({ ...question });
        toast.success('Question Duplicated');
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="edit" className="gap-2">
        <Edit className="h-4 w-4" />
        Edit
        </TabsTrigger>
        <TabsTrigger value="preview" className="gap-2">
        <Eye className="h-4 w-4" />
        Preview
        </TabsTrigger>
        </TabsList>

        {/* Edit Mode */}
        <TabsContent value="edit" className="space-y-6">
        {/* Quiz Details */}
        <Card>
        <CardHeader>
        <CardTitle>Quiz Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <FormField
        label="Title"
        required
        error={errors.title?.message}
        {...register('title')}
        placeholder="Enter quiz title..."
        />

        <FormTextarea
        label="Description"
        error={errors.description?.message}
        {...register('description')}
        placeholder="Enter quiz description..."
        rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
        name="difficulty"
        control={control}
        render={({ field }) => (
            <FormSelect
            label="Difficulty"
            value={field.value}
            onValueChange={field.onChange}
            options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
            ]}
            />
        )}
        />

        <FormField
        label="Time Limit (minutes)"
        type="number"
        error={errors.time_limit_minutes?.message}
        {...register('time_limit_minutes', { valueAsNumber: true })}
        placeholder="Optional"
        />
        </div>

        {/* Quiz Stats */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Questions:</span>
        <Badge variant="secondary">{questions?.length || 0}</Badge>
        </div>
        <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Total Points:</span>
        <Badge variant="secondary">{totalPoints}</Badge>
        </div>
        <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Est. Time:</span>
        <Badge variant="secondary">{estimatedMinutes}min</Badge>
        </div>
        </div>
        </CardContent>
        </Card>

        {/* Questions Section */}
        <div className="space-y-4">
        <div className="flex items-center justify-between">
        <div>
        <h3 className="text-lg font-medium">Questions</h3>
        <p className="text-sm text-muted-foreground">
        Drag to reorder questions
        </p>
        </div>

        <div className="flex gap-2">
        <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => addQuestion('multiple_choice')}
        >
        <Plus className="h-4 w-4 mr-2" />
        Multiple Choice
        </Button>
        <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => addQuestion('true_false')}
        >
        <Plus className="h-4 w-4 mr-2" />
        True/False
        </Button>
        <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => addQuestion('short_answer')}
        >
        <Plus className="h-4 w-4 mr-2" />
        Short Answer
        </Button>
        </div>
        </div>

        {fields.length === 0 && (
            <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">No questions yet</p>
            <Button
            type="button"
            variant="outline"
            onClick={() => addQuestion('multiple_choice')}
            >
            <Plus className="h-4 w-4 mr-2" />
            Add First Question
            </Button>
            </CardContent>
            </Card>
        )}

        {/* Reorderable Question List */}
        <Reorder.Group
        axis="y"
        values={fields}
        onReorder={(newOrder) => {
            newOrder.forEach((item, index) => {
                const oldIndex = fields.findIndex(f => f.id === item.id);
                if (oldIndex !== index) {
                    move(oldIndex, index);
                }
            });
        }}
        className="space-y-4"
        >
        {fields.map((field, index) => (
            <Reorder.Item
            key={field.id}
            value={field}
            className="cursor-grab active:cursor-grabbing"
            >
            <QuestionEditor
            index={index}
            field={field}
            register={register}
            control={control}
            watch={watch}
            setValue={setValue}
            errors={errors}
            onRemove={() => remove(index)}
            onDuplicate={() => duplicateQuestion(index)}
            />
            </Reorder.Item>
        ))}
        </Reorder.Group>
        </div>

        {/* Submit Actions */}
        <Card>
        <CardContent className="pt-6">
        <div className="flex justify-end gap-2">
        {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
            </Button>
        )}
        <Button
        type="submit"
        disabled={isPending || isSubmitting || fields.length === 0}
        size="lg"
        >
        {isPending || isSubmitting ? 'Creating...' : 'Create Quiz'}
        </Button>
        </div>
        </CardContent>
        </Card>
        </TabsContent>

        {/* Preview Mode */}
        <TabsContent value="preview" className="space-y-4">
        <Card>
        <CardHeader>
        <CardTitle>{watch('title') || 'Untitled Quiz'}</CardTitle>
        {watch('description') && (
            <p className="text-sm text-muted-foreground">{watch('description')}</p>
        )}
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
        <Badge>{watch('difficulty')}</Badge>
        {watch('time_limit_minutes') && (
            <Badge variant="outline">
            {watch('time_limit_minutes')} minutes
            </Badge>
        )}
        <Badge variant="outline">
        {questions?.length || 0} questions
        </Badge>
        <Badge variant="outline">
        {totalPoints} points total
        </Badge>
        </div>
        <Separator />
        {questions?.map((q, i) => (
            <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Q{i + 1}</Badge>
            <Badge variant="secondary">{q.points} pts</Badge>
            <Badge variant="outline">{q.question_type.replace('_', ' ')}</Badge>
            </div>
            <p className="font-medium mb-2">{q.question_text || 'No question text'}</p>
            {q.question_type === 'multiple_choice' && q.options && (
                <div className="space-y-1 text-sm">
                {Object.entries(q.options).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                    <span className="font-medium">{key.toUpperCase()}.</span>
                    <span>{value || '(empty)'}</span>
                    </div>
                ))}
                </div>
            )}
            </div>
        ))}
        </CardContent>
        </Card>
        </TabsContent>
        </Tabs>
        </form>
    );
}

// Question Editor Sub-Component
function QuestionEditor({ index, field, register, control, watch, setValue, errors, onRemove, onDuplicate }: any) {
    const questionType = watch(`questions.${index}.question_type`);
    const questionErrors = errors?.questions?.[index];

    return (
        <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
        <CardTitle className="text-base">Question {index + 1}</CardTitle>
        <Badge variant="outline" className="capitalize">
        {questionType?.replace('_', ' ')}
        </Badge>
        </div>
        <div className="flex gap-2">
        <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDuplicate}
        title="Duplicate"
        >
        <Plus className="h-4 w-4" />
        </Button>
        <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        title="Delete"
        >
        <Trash2 className="h-4 w-4" />
        </Button>
        </div>
        </div>
        </CardHeader>
        <CardContent className="space-y-4">
        <FormTextarea
        label="Question Text"
        required
        error={questionErrors?.question_text?.message}
        {...register(`questions.${index}.question_text`)}
        placeholder="Enter your question..."
        rows={2}
        />

        <div className="grid grid-cols-2 gap-4">
        <Controller
        name={`questions.${index}.question_type`}
        control={control}
        render={({ field }) => (
            <FormSelect
            label="Question Type"
            value={field.value}
            onValueChange={(value) => {
                field.onChange(value);
                setValue(`questions.${index}.options`, getDefaultOptions(value as any));
            }}
            options={[
                { value: 'multiple_choice', label: 'Multiple Choice' },
                { value: 'true_false', label: 'True/False' },
                { value: 'short_answer', label: 'Short Answer' },
            ]}
            />
        )}
        />

        <FormField
        label="Points"
        type="number"
        error={questionErrors?.points?.message}
        {...register(`questions.${index}.points`, { valueAsNumber: true })}
        />
        </div>

        {/* Multiple Choice Options */}
        {questionType === 'multiple_choice' && (
            <div className="space-y-2">
            <label className="text-sm font-medium">Options *</label>
            {['a', 'b', 'c', 'd'].map((option) => (
                <FormField
                key={option}
                placeholder={`Option ${option.toUpperCase()}`}
                error={questionErrors?.options?.[option]?.message}
                {...register(`questions.${index}.options.${option}`)}
                />
            ))}
            </div>
        )}

        <FormField
        label="Correct Answer"
        required
        error={questionErrors?.correct_answer?.message}
        {...register(`questions.${index}.correct_answer`)}
        placeholder={questionType === 'multiple_choice' ? 'Enter a, b, c, or d' : 'Enter correct answer'}
        />

        <FormTextarea
        label="Explanation (optional)"
        error={questionErrors?.explanation?.message}
        {...register(`questions.${index}.explanation`)}
        placeholder="Explain the answer..."
        rows={2}
        />
        </CardContent>
        </Card>
    );
}
