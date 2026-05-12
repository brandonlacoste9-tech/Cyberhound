import { Resend } from "resend";

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  from?: string;
}

/**
 * Unified Email Dispatcher
 * Priority: Resend -> Mailgun -> Log
 */
export async function sendEmail(payload: EmailPayload): Promise<{ id?: string; error?: any }> {
  const { to, subject, text, from = "Brandon | CyberHound <cyberhound@adgenai.ca>" } = payload;

  // 1. Try Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && resendKey !== "placeholder") {
    try {
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from,
        to: [to],
        subject,
        text,
      });
      if (!error && data) return { id: data.id };
      console.warn("[Email] Resend failed, falling back...", error);
    } catch (e) {
      console.warn("[Email] Resend exception, falling back...", e);
    }
  }

  // 2. Try Mailgun
  const mgKey = process.env.MAILGUN_API_KEY;
  const mgDomain = process.env.MAILGUN_DOMAIN || "mg.adgenai.ca";
  
  if (mgKey && mgKey !== "placeholder") {
    try {
      // For sandbox domains, we must use the postmaster address to avoid "Sender not authorized" errors
      const adjustedFrom = mgDomain.includes("sandbox") 
        ? `CyberHound <postmaster@${mgDomain}>` 
        : from;

      const auth = Buffer.from(`api:${mgKey}`).toString("base64");
      const baseUrl = (process.env.MAILGUN_BASE_URL || "https://api.mailgun.net").replace(/\/$/, "");
      
      const formData = new URLSearchParams();
      formData.append("from", adjustedFrom);
      formData.append("to", to);
      formData.append("subject", subject);
      formData.append("text", text);

      const mgRes = await fetch(`${baseUrl}/v3/${mgDomain}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (mgRes.ok) {
        const mgData = await mgRes.json();
        return { id: mgData.id };
      }
      const errText = await mgRes.text();
      console.warn("[Email] Mailgun failed:", errText);
    } catch (e) {
      console.error("[Email] Mailgun exception:", e);
    }
  }

  return { error: "No configured email provider succeeded" };
}
