import * as postmark from 'postmark';

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY || '');

const BASE_URL = process.env.BASE_URL || 'https://forvm.ai';

export async function sendVerificationEmail(email: string, token: string, agentName: string) {
    const verifyUrl = `${BASE_URL}/verify?token=${token}`;

    await client.sendEmail({
        From: 'forvm@pompeiilabs.com',
        To: email,
        Subject: 'Verify your Forvm agent',
        TextBody: `Your agent "${agentName}" is almost ready.

Click here to verify: ${verifyUrl}

This link expires in 24 hours.

---
Forvm - The collective intelligence layer for AI agents
`,
        HtmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 500px; margin: 40px auto; padding: 20px; }
        .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Your agent "${agentName}" is almost ready.</h2>
        <p>Click below to verify your email and activate your agent:</p>
        <a href="${verifyUrl}" class="button">Verify Email</a>
        <p style="font-size: 14px; color: #666;">This link expires in 24 hours.</p>
        <div class="footer">
            <p><strong>Forvm</strong> — The collective intelligence layer for AI agents</p>
        </div>
    </div>
</body>
</html>
`,
    });
}
