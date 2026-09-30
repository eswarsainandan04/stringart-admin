import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Helper to load .env.local if present locally without exposing secrets
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}
loadEnv();

async function main() {
  const senderEmail = process.env.SMTP_EMAIL || 'your-email@gmail.com';
  const senderPassword = process.env.SMTP_PASSWORD || '';
  const recipientEmail = process.env.TEST_RECIPIENT_EMAIL || 'eswarsainandan04@gmail.com';

  console.log('--------------------------------------------------');
  console.log('Sending test email via Nodemailer...');
  console.log(`From: ${senderEmail}`);
  console.log(`To:   ${recipientEmail}`);
  console.log('--------------------------------------------------');

  // 1. Create Nodemailer Transporter for Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
  });

  // 2. Prepare Anti-Spam Optimized Email Options
  const mailOptions = {
    from: `"HS Creations" <${senderEmail}>`,
    to: recipientEmail,
    replyTo: senderEmail,
    subject: 'Welcome to HS Creations String Art',
    headers: {
      'X-Entity-Ref-ID': Date.now().toString(),
    },
    text: `Hello Eswar,

Welcome to HS Creations String Art. Your account has been set up successfully.

If you have any questions, you can reply directly to this email.

Best regards,
HS Creations Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0e1f1c; margin: 0; font-size: 22px; font-weight: bold;">HS Creations</h2>
          <p style="color: #c99c1e; margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">String Art Machines & Software</p>
        </div>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 18px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
          <p style="color: #1e293b; font-size: 14px; margin-top: 0; line-height: 1.5;">
            Hello <strong>Eswar</strong>,
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
            Welcome to <strong>HS Creations</strong>! Your account is now active and ready for your String Art Machine.
          </p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          You can reply directly to this email if you need any assistance with setup or account access.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          HS Creations · String Art Made Easy
        </p>
      </div>
    `,
  };

  try {
    // 3. Verify Connection Configuration
    console.log('Verifying SMTP connection credentials...');
    await transporter.verify();
    console.log('SMTP connection verified successfully!');

    // 4. Send Email
    console.log('Dispatching email...');
    const info = await transporter.sendMail(mailOptions);

    console.log('==================================================');
    console.log('SUCCESS! Email sent successfully.');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Response:   ${info.response}`);
    console.log('==================================================');
  } catch (error: any) {
    console.error('==================================================');
    console.error('FAILED TO SEND EMAIL:');
    console.error(error.message || error);
    console.error('==================================================');

    if (error.code === 'EAUTH' || (error.response && error.response.includes('535'))) {
      console.log('\n--- HOW TO FIX GMAIL AUTHENTICATION ---');
      console.log('Google requires a 16-character "App Password" rather than your standard account password:');
      console.log('1. Go to your Google Account: https://myaccount.google.com/security');
      console.log('2. Ensure "2-Step Verification" is ON.');
      console.log('3. Search for "App Passwords" (or go to: https://myaccount.google.com/apppasswords).');
      console.log('4. Create an App Password (name it "Nodemailer" or "HS Creations").');
      console.log('5. Copy the generated 16-character code (e.g. "abcd efgh ijkl mnop") and use it as senderPassword.');
      console.log('---------------------------------------------------\n');
    }
  }
}

main();
