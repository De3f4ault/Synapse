import { Outlet } from "react-router-dom";
import { NotesLeftSidebar } from "@/modules/notes/components/sidebar/NotesLeftSidebar";

export function NotesLayout() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a]">
      {/* Left Sidebar */}
      <NotesLeftSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Outlet />
      </div>
    </div>
  );
}

export default NotesLayout;
