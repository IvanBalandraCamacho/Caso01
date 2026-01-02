import Sidebar from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"

export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#000000",
      }}
    >
      <Sidebar />
      <ChatArea />
    </div>
  )
}
