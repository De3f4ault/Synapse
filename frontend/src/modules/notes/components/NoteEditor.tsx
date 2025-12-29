import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Clock,
  CheckCircle2,
  X,
  Maximize2,
  Minimize2,
  Eye,
  Edit,
  Sparkles,
} from "lucide-react";
import {
  createNoteApiV1NotesPost,
  updateNoteApiV1NotesNoteIdPut,
  NotesService,
} from "@/api/generated";
import { noteCreateSchema, type NoteCreateInput } from "../schemas";
import { QUERY_KEYS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/shared/rendering";
import type { NoteResponse } from "@/api/generated";

/**
 * Enhanced Note Editor Component
 *
 * Features:
 * - Auto-save with debouncing (2s)
 * - Fullscreen mode
 * - Edit/Preview tabs
 * - Markdown rendering
 * - Character count
 * - Tag management
 * - Keyboard shortcuts (Cmd+S save, F11 fullscreen)
 * - Save status indicator
 * - Word count
 */

interface NoteEditorProps {
  note?: NoteResponse;
  parentId?: number | null;
  onSave?: (note: NoteResponse) => void;
  onCancel?: () => void;
}

export function NoteEditor({
  note,
  parentId,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<NoteCreateInput>({
    resolver: zodResolver(noteCreateSchema),
    defaultValues: {
      title: note?.title || "",
      content: note?.content || "",
      format: "markdown",
      parent_id: parentId ?? undefined,
      tags,
    },
  });

  const title = watch("title");
  const content = watch("content");
  const debouncedContent = useDebounce(content, 2000);

  // Calculate word count
  const wordCount = content ? content.trim().split(/\s+/).length : 0;
  const charCount = content?.length || 0;

  // Create note mutation
  const { mutate: createNote } = useMutation({
    mutationFn: (data: NoteCreateInput) =>
      createNoteApiV1NotesPost({ requestBody: { ...data, tags } }),
    onSuccess: (result) => {
      setSaveStatus("saved");
      toast({
        title: "Note Created",
        description: "Your note has been saved",
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTES.ALL] });
      onSave?.(result);
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error) => {
      setSaveStatus("idle");
      toast({
        title: "Failed to Create Note",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update note mutation
  const { mutate: updateNote } = useMutation({
    mutationFn: (data: NoteCreateInput) =>
      updateNoteApiV1NotesNoteIdPut({
        noteId: note!.id,
        requestBody: {
          title: data.title,
          content: data.content,
          format: data.format,
        },
      }),
    onSuccess: (result) => {
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTES.ALL] });
      onSave?.(result);
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error) => {
      setSaveStatus("idle");
      toast({
        title: "Failed to Update Note",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Auto-save on content change
  useEffect(() => {
    if (note && isDirty && debouncedContent && title) {
      setSaveStatus("saving");
      updateNote({
        title,
        content: debouncedContent,
        format: "markdown",
      });
    }
  }, [debouncedContent, title, note, isDirty]);

  const onSubmit = (data: NoteCreateInput) => {
    if (note) {
      updateNote(data);
    } else {
      createNote(data);
    }
  };

  // Handle tag input
  const handleAddTag = () => {
    if (
      tagInput.trim() &&
      !tags.includes(tagInput.trim()) &&
      tags.length < 10
    ) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
      // F11 for fullscreen
      if (e.key === "F11") {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
      // Cmd/Ctrl + P for preview
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setActiveTab(activeTab === "edit" ? "preview" : "edit");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, onSubmit, isFullscreen, activeTab]);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-auto",
      )}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Header with Save Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {saveStatus === "saving" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </motion.div>
              )}
              {saveStatus === "saved" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 text-sm text-green-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Saved</span>
                </motion.div>
              )}
            </AnimatePresence>

            {note && (
              <Badge variant="outline" className="text-xs">
                Auto-save enabled
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={
                isFullscreen ? "Exit fullscreen (F11)" : "Fullscreen (F11)"
              }
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={!isDirty}>
              <Save className="h-4 w-4 mr-2" />
              {note ? "Update" : "Create"} Note
            </Button>
          </div>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="Enter note title..."
            {...register("title")}
            className={cn(
              "text-lg font-medium",
              errors.title &&
              "border-destructive focus-visible:ring-destructive",
            )}
          />
          <AnimatePresence>
            {errors.title && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-destructive mt-1"
              >
                {errors.title.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Edit/Preview Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!content}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Edit Tab */}
          <TabsContent value="edit" className="mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">
                  Content <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    (Markdown supported)
                  </span>
                </Label>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} characters</span>
                </div>
              </div>
              <Textarea
                id="content"
                placeholder="Write your notes here... Supports **bold**, *italic*, # headings, - lists, ```code```, etc."
                rows={isFullscreen ? 30 : 20}
                {...register("content")}
                className={cn(
                  "font-mono text-sm resize-none",
                  errors.content &&
                  "border-destructive focus-visible:ring-destructive",
                )}
              />
              <AnimatePresence>
                {errors.content && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.content.message}
                  </motion.p>
                )}
              </AnimatePresence>
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">
                  Cmd/Ctrl+S
                </kbd>{" "}
                to save •{" "}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">
                  Cmd/Ctrl+P
                </kbd>{" "}
                to preview •{" "}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">
                  F11
                </kbd>{" "}
                for fullscreen
              </p>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardContent className="p-6">
                {content ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-muted-foreground italic">
                    No content to preview yet...
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tags */}
        <div>
          <Label htmlFor="tags">
            Tags{" "}
            <span className="text-xs text-muted-foreground">
              ({tags.length}/10)
            </span>
          </Label>
          <div className="flex gap-2 mb-2">
            <Input
              id="tags"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              disabled={tags.length >= 10}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 10}
            >
              Add
            </Button>
          </div>
          <AnimatePresence>
            {tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2"
              >
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
