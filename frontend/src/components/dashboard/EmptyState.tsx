interface Props {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "64px 24px", textAlign: "center",
    }}>
      <div style={{
        width: "48px", height: "48px", background: "#E1F5EE",
        borderRadius: "12px", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "22px", marginBottom: "16px",
      }}>
        {icon}
      </div>
      <p style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a", margin: 0, marginBottom: "6px" }}>
        {title}
      </p>
      <p style={{
        fontSize: "13px", color: "#888", maxWidth: "320px",
        lineHeight: 1.6, margin: 0, marginBottom: action ? "20px" : 0,
      }}>
        {description}
      </p>
      {action}
    </div>
  )
}
