interface Props {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function PageShell({ title, subtitle, action, children }: Props) {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "36px 40px" }}>
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: "28px",
      }}>
        <div>
          <h1 style={{
            fontSize: "22px", fontWeight: 500, color: "#1a1a1a",
            fontFamily: "Georgia, serif", margin: 0, marginBottom: "3px",
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
