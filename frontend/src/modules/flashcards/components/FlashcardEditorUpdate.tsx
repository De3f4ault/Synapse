import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  updateCardApiV1CardsCardIdPut,
  FlashcardsService,
} from "@/api/generated";
import { flashcardUpdateSchema, type FlashcardUpdateInput } from "../schemas";
import { queryKeys } from "@/lib/queryKeys";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Image as ImageIcon,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlashcardResponse } from "@/api/generated";

/**
 * Enhanced Flashcard Editor Component (UPDATE MODE)
 *
 * Features:
 * - Pre-populated with existing card data
 * - Split edit/preview tabs
 * - Live preview with card flip
 * - Image URL validation with preview
 * - Character count indicators
 * - Rich error display
 * - Keyboard shortcuts
 */

interface FlashcardEditorUpdateProps {
  cardId: number;
  deckId: number;
  initialData: FlashcardResponse;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: "inline" | "modal";
}

export function FlashcardEditorUpdate({
  cardId,
  deckId,
  initialData,
  onSuccess,
  onCancel,
  mode = "inline",
}: FlashcardEditorUpdateProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [imageError, setImageError] = useState<{
    front?: boolean;
    back?: boolean;
  }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FlashcardUpdateInput>({
    resolver: zodResolver(flashcardUpdateSchema),
    defaultValues: {
      front_text: initialData.front_text,
      back_text: initialData.back_text,
      front_media_url: initialData.front_media_url || "",
      back_media_url: initialData.back_media_url || "",
    },
  });

  // Watch all fields for preview
  const frontText = watch("front_text");
  const backText = watch("back_text");
  const frontMediaUrl = watch("front_media_url");
  const backMediaUrl = watch("back_media_url");

  // Character counts
  const frontTextLength = frontText?.length || 0;
  const backTextLength = backText?.length || 0;

  // Update card mutation
  const { mutate: updateCard } = useMutation({
    mutationFn: (data: FlashcardUpdateInput) =>
      updateCardApiV1CardsCardIdPut({
        cardId,
        requestBody: data,
      }),
    onSuccess: () => {
      toast({
        title: "Card Updated",
        description: "Flashcard has been updated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.decks.detail(deckId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.flashcards.cards.detail(cardId),
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Card",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FlashcardUpdateInput) => {
    // Clean up empty string URLs
    const cleanData = {
      ...data,
      front_media_url: data.front_media_url || null,
      back_media_url: data.back_media_url || null,
    };
    updateCard(cleanData);
  };

  // Handle image load errors
  const handleImageError = (side: "front" | "back") => {
    setImageError((prev) => ({ ...prev, [side]: true }));
  };

  const handleImageLoad = (side: "front" | "back") => {
    setImageError((prev) => ({ ...prev, [side]: false }));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit">
            Edit{" "}
            {isDirty && (
              <Badge variant="secondary" className="ml-2">
                *
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!frontText && !backText}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit" className="space-y-4 mt-4">
          {/* Front Side */}
          <Card className="bg-black/20 border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Front Side
                <Badge variant="outline" className="text-xs font-normal">
                  Question
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Front Text */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="front_text" className="text-slate-300">
                    Question/Prompt <span className="text-red-400">*</span>
                  </Label>
                  <CharacterCount
                    current={frontTextLength}
                    max={5000}
                    warning={4500}
                  />
                </div>
                <Textarea
                  id="front_text"
                  placeholder="Enter the question or prompt..."
                  rows={4}
                  {...register("front_text")}
                  className={cn(
                    "resize-none bg-black/40 border-white/10 text-white placeholder:text-slate-600",
                    errors.front_text &&
                      "border-red-500/50 focus:border-red-500",
                  )}
                />
                <AnimatePresence>
                  {errors.front_text && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mt-2 text-sm text-red-400"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {errors.front_text.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Front Image URL */}
              <div>
                <Label htmlFor="front_media_url" className="text-slate-300">
                  Image URL{" "}
                  <span className="text-xs text-slate-500">(optional)</span>
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="front_media_url"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...register("front_media_url")}
                      className={cn(
                        "pl-9 bg-black/40 border-white/10 text-white placeholder:text-slate-600",
                        errors.front_media_url && "border-red-500/50",
                      )}
                    />
                  </div>
                  {frontMediaUrl && !imageError.front && (
                    <CheckCircle2 className="h-9 w-9 p-2 text-emerald-500" />
                  )}
                  {frontMediaUrl && imageError.front && (
                    <AlertCircle className="h-9 w-9 p-2 text-red-500" />
                  )}
                </div>
                <AnimatePresence>
                  {errors.front_media_url && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-400 mt-1"
                    >
                      {errors.front_media_url.message}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Image Preview */}
                {frontMediaUrl && !errors.front_media_url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2"
                  >
                    <img
                      src={frontMediaUrl}
                      alt="Front preview"
                      className="max-h-32 rounded-md border border-white/10"
                      onError={() => handleImageError("front")}
                      onLoad={() => handleImageLoad("front")}
                    />
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Back Side */}
          <Card className="bg-black/20 border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Back Side
                <Badge variant="outline" className="text-xs font-normal">
                  Answer
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Back Text */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="back_text" className="text-slate-300">
                    Answer/Explanation <span className="text-red-400">*</span>
                  </Label>
                  <CharacterCount
                    current={backTextLength}
                    max={5000}
                    warning={4500}
                  />
                </div>
                <Textarea
                  id="back_text"
                  placeholder="Enter the answer or explanation..."
                  rows={4}
                  {...register("back_text")}
                  className={cn(
                    "resize-none bg-black/40 border-white/10 text-white placeholder:text-slate-600",
                    errors.back_text &&
                      "border-red-500/50 focus:border-red-500",
                  )}
                />
                <AnimatePresence>
                  {errors.back_text && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mt-2 text-sm text-red-400"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {errors.back_text.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Back Image URL */}
              <div>
                <Label htmlFor="back_media_url" className="text-slate-300">
                  Image URL{" "}
                  <span className="text-xs text-slate-500">(optional)</span>
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="back_media_url"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...register("back_media_url")}
                      className={cn(
                        "pl-9 bg-black/40 border-white/10 text-white placeholder:text-slate-600",
                        errors.back_media_url && "border-red-500/50",
                      )}
                    />
                  </div>
                  {backMediaUrl && !imageError.back && (
                    <CheckCircle2 className="h-9 w-9 p-2 text-emerald-500" />
                  )}
                  {backMediaUrl && imageError.back && (
                    <AlertCircle className="h-9 w-9 p-2 text-red-500" />
                  )}
                </div>
                <AnimatePresence>
                  {errors.back_media_url && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-400 mt-1"
                    >
                      {errors.back_media_url.message}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Image Preview */}
                {backMediaUrl && !errors.back_media_url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2"
                  >
                    <img
                      src={backMediaUrl}
                      alt="Back preview"
                      className="max-h-32 rounded-md border border-white/10"
                      onError={() => handleImageError("back")}
                      onLoad={() => handleImageLoad("back")}
                    />
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Front Preview */}
            <Card className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border-white/5">
              <CardHeader>
                <CardTitle className="text-sm text-slate-400">
                  Front Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-4">
                  {frontText ? (
                    <p className="text-lg whitespace-pre-wrap text-white">
                      {frontText}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">No text yet...</p>
                  )}
                  {frontMediaUrl && !imageError.front && (
                    <motion.img
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={frontMediaUrl}
                      alt="Front media"
                      className="mt-4 max-h-32 rounded-md border border-white/10"
                      onError={() => handleImageError("front")}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Back Preview */}
            <Card className="bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border-white/5">
              <CardHeader>
                <CardTitle className="text-sm text-slate-400">
                  Back Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-4">
                  {backText ? (
                    <p className="text-lg whitespace-pre-wrap text-white">
                      {backText}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">No text yet...</p>
                  )}
                  {backMediaUrl && !imageError.back && (
                    <motion.img
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={backMediaUrl}
                      alt="Back media"
                      className="mt-4 max-h-32 rounded-md border border-white/10"
                      onError={() => handleImageError("back")}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => reset()}
          disabled={!isDirty || isSubmitting}
          className="text-slate-400 hover:text-white hover:bg-white/5"
        >
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold"
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 mr-2 border-2 border-cyan-400 border-t-transparent rounded-full"
              />
              Updating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Update Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/**
 * Character Count Indicator Component
 */
interface CharacterCountProps {
  current: number;
  max: number;
  warning: number;
}

function CharacterCount({ current, max, warning }: CharacterCountProps) {
  const percentage = (current / max) * 100;
  const isWarning = current >= warning;
  const isError = current >= max;

  return (
    <span
      className={cn(
        "text-xs font-mono",
        isError
          ? "text-red-400 font-medium"
          : isWarning
            ? "text-amber-500"
            : "text-slate-500",
      )}
    >
      {current.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}
