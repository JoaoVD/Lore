import { TopBar } from "@/components/layout/TopBar"
import { SubNav } from "@/components/layout/SubNav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F1EFE8" }}>
      <TopBar />
      <SubNav />
      <main>{children}</main>
    </div>
  )
}
