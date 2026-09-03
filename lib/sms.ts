type AssignmentSms = {
  to: string;
  subject: string;
  preferredDate: string;
  preferredTime: string;
};

export type SmsResult =
  | { status: "sent"; messageSid: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

export async function sendAssignmentSms({ to, subject, preferredDate, preferredTime }: AssignmentSms): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) return { status: "not_configured" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mu-alpha-theta-tawny.vercel.app";
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: `Austin High Mu Alpha Theta: You have a new ${subject} tutoring assignment for ${preferredDate} at ${preferredTime}. View it: ${siteUrl}/tutor`,
  });

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      cache: "no-store",
    });
    const result = await response.json() as { sid?: string; message?: string };
    if (!response.ok || !result.sid) return { status: "failed", error: result.message || "The SMS provider rejected the message." };
    return { status: "sent", messageSid: result.sid };
  } catch {
    return { status: "failed", error: "The SMS provider could not be reached." };
  }
}
