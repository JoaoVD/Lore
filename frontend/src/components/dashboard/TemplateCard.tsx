interface Props {
  template: {
    id: string
    name: string
    area: string
    subtype?: string
    is_diamond?: boolean
  }
}

export function TemplateCard({ template }: Props) {
  const isElite = template.is_diamond

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #d8d6d0",
        borderRadius: "10px",
        padding: "16px",
        cursor: "default",
        transition: "border-color .15s",
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#b0ada6")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#d8d6d0")}
    >
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: "10px",
      }}>
        <div style={{
          width: "30px", height: "30px", background: "#E1F5EE",
          borderRadius: "7px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "13px",
        }}>📋</div>
        {isElite && (
          <span style={{
            fontSize: "10px", fontWeight: 500, padding: "2px 7px",
            borderRadius: "99px", background: "#E1F5EE", color: "#085041",
          }}>Elite</span>
        )}
      </div>
      <div style={{
        fontSize: "13px", fontWeight: 500, color: "#1a1a1a",
        marginBottom: "8px", lineHeight: 1.4,
      }}>
        {template.name}
      </div>
      <div style={{
        fontSize: "11px", color: "#888",
        borderTop: "0.5px solid #eeecea", paddingTop: "8px",
      }}>
        {template.area.charAt(0).toUpperCase() + template.area.slice(1)}
        {template.subtype && ` · ${template.subtype.charAt(0).toUpperCase() + template.subtype.slice(1)}`}
      </div>
    </div>
  )
}
