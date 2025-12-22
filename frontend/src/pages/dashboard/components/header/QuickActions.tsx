import {
  Plus,
  CreditCard,
  BookOpen,
  Upload,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

/**
 * QuickActions - "Command Menu" Style
 */
export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Create Deck",
      icon: CreditCard,
      action: () => navigate("/flashcards"),
      desc: "Flashcards",
    },
    {
      label: "Write Note",
      icon: BookOpen,
      action: () => navigate("/notes"),
      desc: "Knowledge",
    },
    {
      label: "Upload Doc",
      icon: Upload,
      action: () => navigate("/documents"),
      desc: "Resource",
    },
    {
      label: "Start Chat",
      icon: MessageSquare,
      action: () => navigate("/chat"),
      desc: "AI Session",
    },
    {
      label: "Create Quiz",
      icon: ClipboardList,
      action: () => navigate("/quizzes"),
      desc: "Assessment",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="gap-2 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/50 transition-all text-xs font-bold tracking-wide"
        >
          <Plus className="h-3 w-3 text-cyan-400" />
          <span className="hidden sm:inline">CREATE</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 p-2 shadow-2xl"
      >
        <DropdownMenuLabel className="text-[10px] text-slate-500 uppercase tracking-widest px-2 py-1.5">
          System Commands
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.label}
              onClick={action.action}
              className="group cursor-pointer rounded-lg p-2 focus:bg-white/10 focus:text-white"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-1.5 rounded-md bg-white/5 border border-white/5 group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-colors">
                  <Icon className="h-4 w-4 text-slate-400 group-hover:text-cyan-400" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs text-slate-200 group-hover:text-white">
                    {action.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {action.desc}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
