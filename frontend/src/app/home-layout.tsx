import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";

export default function HomeLayout() {
  return (
    <main className="flex h-screen w-full">
      <Sidebar />
      <ChatArea />
    </main>
  );
}
