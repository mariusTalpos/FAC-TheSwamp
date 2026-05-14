import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Transactional email — uses `EMAIL_SMTP_*` when configured; otherwise logs (local dev). */
export async function sendMail(input: SendMailInput): Promise<void> {
  const host = process.env.EMAIL_SMTP_HOST;
  if (!host) {
    console.info(`[email:dev] to=${input.to} subject=${input.subject}\n${input.text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_SMTP_PORT ?? "587"),
    secure: process.env.EMAIL_SMTP_SECURE === "true",
    auth:
      process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASSWORD
        ? {
            user: process.env.EMAIL_SMTP_USER,
            pass: process.env.EMAIL_SMTP_PASSWORD,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@localhost",
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
