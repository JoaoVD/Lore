"""
app/services/deadline_notifier.py
----------------------------------
Serviço de notificação de prazos por e-mail via Resend.
Chamado diariamente pelo endpoint /api/admin/send-deadline-notifications.
"""

import os
from datetime import date, timedelta

from app.core.features import Features

try:
    import resend
    resend.api_key = os.getenv("RESEND_API_KEY", "")
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False


async def send_deadline_notifications(supabase) -> dict:
    """
    Verifica prazos com vencimento nos próximos 3 dias e envia e-mail
    consolidado por usuário.
    """
    if not Features.JURIDICO:
        return {"sent": 0, "reason": "JURIDICO feature disabled"}

    if not RESEND_AVAILABLE:
        return {"sent": 0, "reason": "resend package not installed"}

    if not os.getenv("RESEND_API_KEY"):
        return {"sent": 0, "reason": "RESEND_API_KEY not configured"}

    today = date.today()
    in_3_days = today + timedelta(days=3)

    deadlines_result = (
        supabase.table("legal_deadlines")
        .select("*, projects(name, user_id)")
        .eq("status", "pending")
        .lte("deadline_date", str(in_3_days))
        .gte("deadline_date", str(today))
        .execute()
    )

    if not deadlines_result.data:
        return {"sent": 0}

    # Agrupa por user_id
    by_user: dict = {}
    user_ids = list({dl["projects"]["user_id"] for dl in deadlines_result.data if dl.get("projects")})

    # Busca e-mails via auth admin
    for dl in deadlines_result.data:
        project = dl.get("projects", {})
        user_id = project.get("user_id")
        if not user_id:
            continue
        if user_id not in by_user:
            by_user[user_id] = {
                "email": None,
                "name": "Advogado",
                "deadlines": [],
            }
        dl_date = date.fromisoformat(dl["deadline_date"])
        by_user[user_id]["deadlines"].append({
            "title": dl["title"],
            "project": project.get("name", ""),
            "date": dl["deadline_date"],
            "process": dl.get("process_number", ""),
            "days_left": (dl_date - today).days,
        })

    # Busca e-mails dos usuários via Supabase admin
    for user_id in by_user:
        try:
            user_resp = supabase.auth.admin.get_user_by_id(user_id)
            if user_resp and user_resp.user:
                by_user[user_id]["email"] = user_resp.user.email
                meta = user_resp.user.user_metadata or {}
                by_user[user_id]["name"] = meta.get("full_name") or meta.get("name") or "Advogado"
        except Exception:
            pass

    sent = 0
    for user_id, data in by_user.items():
        if not data["email"]:
            continue
        try:
            _send_email(data["email"], data["name"], data["deadlines"])
            sent += 1
        except Exception as e:
            print(f"[notifier] Erro ao enviar para {data['email']}: {e}")

    return {"sent": sent}


def _send_email(to_email: str, name: str, deadlines: list) -> None:
    """Monta e envia o e-mail HTML de alerta de prazos."""
    today = date.today()

    items_html = ""
    for dl in sorted(deadlines, key=lambda x: x["days_left"]):
        days = dl["days_left"]
        if days == 0:
            bg, color, label = "#FCEBEB", "#791F1F", "HOJE"
        elif days <= 1:
            bg, color, label = "#FEF3C7", "#92400E", f"{days} dia"
        else:
            bg, color, label = "#E1F5EE", "#085041", f"{days} dias"

        proc_html = f'<br><span style="color:#888;font-size:12px;">Proc: {dl["process"]}</span>' if dl["process"] else ""
        items_html += f"""
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;">
            <strong style="color:#1a1a1a;font-size:14px;">{dl['title']}</strong><br>
            <span style="color:#888;font-size:12px;">{dl['project']}</span>{proc_html}
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;white-space:nowrap;">
            <span style="color:#888;font-size:13px;">{date.fromisoformat(dl['date']).strftime('%d/%m/%Y')}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;text-align:center;">
            <span style="background:{bg};color:{color};font-size:11px;font-weight:600;
                         padding:3px 10px;border-radius:99px;">{label}</span>
          </td>
        </tr>"""

    n = len(deadlines)
    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1EFE8;font-family:-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d8d6d0;">
    <div style="background:#0F6E56;padding:24px 28px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:28px;height:28px;background:rgba(255,255,255,.2);border-radius:7px;
                    display:inline-flex;align-items:center;justify-content:center;
                    color:#fff;font-size:16px;font-weight:700;font-family:Georgia,serif;">L</div>
        <span style="color:#fff;font-size:16px;font-weight:500;margin-left:10px;">Lore Jurídico</span>
      </div>
    </div>
    <div style="padding:28px;">
      <h2 style="font-size:18px;font-weight:500;color:#1a1a1a;margin:0 0 6px;">
        ⏰ Prazos próximos do vencimento
      </h2>
      <p style="font-size:13px;color:#888;margin:0 0 20px;">
        Olá, {name}! Você tem {n} prazo{'s' if n > 1 else ''} vencendo em breve.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fafaf8;border-radius:8px;border:1px solid #e8e6e0;">
        <thead>
          <tr style="background:#f5f3ee;">
            <th style="padding:10px 16px;font-size:11px;font-weight:500;color:#888;text-align:left;text-transform:uppercase;letter-spacing:.06em;">Prazo</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:500;color:#888;text-align:left;text-transform:uppercase;letter-spacing:.06em;">Data</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:500;color:#888;text-align:center;text-transform:uppercase;letter-spacing:.06em;">Faltam</th>
          </tr>
        </thead>
        <tbody>{items_html}</tbody>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="https://uselore.com.br/app"
           style="display:inline-block;background:#0F6E56;color:#fff;text-decoration:none;
                  padding:10px 24px;border-radius:8px;font-size:13px;font-weight:500;">
          Ver prazos no Lore →
        </a>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f0ede8;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">Lore Jurídico · uselore.com.br</p>
    </div>
  </div>
</body>
</html>"""

    resend.Emails.send({
        "from": "Lore Jurídico <notificacoes@uselore.com.br>",
        "to": [to_email],
        "subject": f"⏰ {n} prazo{'s' if n > 1 else ''} vencendo em breve — Lore Jurídico",
        "html": html,
    })
