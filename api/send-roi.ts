import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { Request, Response } from 'express';
import crypto from 'crypto';

// OBS: Duplicerad från src/client.config.ts (inte importerad) eftersom Vercels
// serverless-funktionsbuntare inte tillförlitligt bundlar separata lokala .ts-filer
// för denna funktion. Om branding ändras i src/client.config.ts, uppdatera ÄVEN
// dessa värden manuellt så att frontend och backend inte hamnar i otakt.
const CLIENT_CONFIG = {
  senderEmail: 'Hälsokalkylatorn <resultat@ditt-resultat.se>',
  emailHeaderTitle: 'Hälsokalkylatorn',
};

const INDIRECT_COST_FACTOR = 1.4; // Vikarier, admin, produktionsbortfall
const WORKDAYS_PER_MONTH = 21;
const WORKDAYS_PER_YEAR = 220;
const SAVINGS_LOW = 0.15;
const SAVINGS_HIGH = 0.30;

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const generatePDF = (calcData: any, userName: string, companyText: string, formatCurrency: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(24).fillColor('#0f172a').text('ROI Kalkyl - Sjukfrånvaro', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(14).fillColor('#334155').text(`Framtagen för ${userName}${companyText}`);
      doc.moveDown(2);
      
      doc.fontSize(16).fillColor('#0f172a').text('Er sammanställning', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).fillColor('#334155').text(`Antal anställda: ${calcData.employees}`);
      doc.text(`Sjukfrånvaro: ${calcData.sickLeavePercent}%`);
      
      doc.moveDown(1);
      doc.fontSize(14).fillColor('#ef4444').text(`Total årlig kostnad: ${formatCurrency(calcData.calculatedAnnualCost)}`);
      
      doc.moveDown(1);
      doc.fontSize(16).fillColor('#15803d').text(`Potentiell årlig besparing: ${formatCurrency(calcData.savingsMin)} - ${formatCurrency(calcData.savingsMax)}`);
      
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#64748b').text(`Kalkylen inkluderar lagstadgade arbetsgivaravgifter (31,42%) och schablon för indirekta kostnader (vikarier, administration och produktionsbortfall) med en faktor på ${INDIRECT_COST_FACTOR}x månadslönen. Beräknat på ${WORKDAYS_PER_YEAR} arbetsdagar per år.`);
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// Initialize Upstash Redis Ratelimit
let ratelimit: Ratelimit | null = null;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
  });
}

export default async function handler(req: Request, res: Response) {
  // 1. Origin-kontroll
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin && req.headers.origin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Otillåten origin' });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('KV_REST_API_URL/KV_REST_API_TOKEN saknas — har Redis-databasen kopplats till projektet i Vercel Storage?');
    return res.status(500).json({ error: 'Serverkonfigurationsfel' });
  }

  // 2. Endast POST-anrop tillåts
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. Honeypot check
  const { email, firstName, lastName, phone, company, calculatorData, website } = req.body || {};
  if (website) {
    // Boten fastnade i honeypotten
    return res.status(200).json({ success: true });
  }

  // 4. Rate limiting check (Upstash Redis)
  if (ratelimit) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const rawIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]) 
               || req.socket?.remoteAddress 
               || 'unknown';
    const hashedIp = crypto.createHash('sha256').update(rawIp).digest('hex');
    const { success } = await ratelimit.limit(hashedIp);
    if (!success) {
      console.warn(`Spamskydd aktiverat: IP-hash ${hashedIp.substring(0, 8)}... har överskridit gränsen.`);
      return res.status(429).json({ error: 'För många förfrågningar, försök igen senare.' });
    }
  }

  // 5. Kontrollera miljövariabler
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('RESEND_API_KEY saknas i miljövariablerna');
    return res.status(500).json({ error: 'Serverkonfigurationsfel: API-nyckel saknas' });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_EMAIL saknas i miljövariablerna');
    return res.status(500).json({ error: 'Serverkonfigurationsfel' });
  }

  const resend = new Resend(resendApiKey);

  try {
    if (!email || !calculatorData) {
      return res.status(400).json({ error: 'Obligatoriska fält saknas (email eller calculatorData)' });
    }

    const senderEmail = CLIENT_CONFIG.senderEmail;
    
    // Sanitize user inputs
    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeCompany = escapeHtml(company);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);

    const userName = safeFirstName ? safeFirstName.trim() : 'Kund';
    const companyText = safeCompany ? ` på ${safeCompany}` : '';

    const clamp = (val: any, min: number, max: number) => {
      const num = Number(val) || 0;
      return Math.min(Math.max(num, min), max);
    };

    const employees = clamp(calculatorData.employees, 1, 50000);
    const sickLeavePercent = clamp(calculatorData.sickLeavePercent, 0, 100);
    const monthlySalary = clamp(calculatorData.monthlySalary, 1, 1000000);

    // Byt klientens värden mot serverns beräkningar
    const costPerSickDay = (monthlySalary / WORKDAYS_PER_MONTH) * INDIRECT_COST_FACTOR;
    const calculatedAnnualCost = employees * WORKDAYS_PER_YEAR * (sickLeavePercent / 100) * costPerSickDay;
    const savingsMin = calculatedAnnualCost * SAVINGS_LOW;
    const savingsMax = calculatedAnnualCost * SAVINGS_HIGH;

    const calcData = {
      employees,
      sickLeavePercent,
      monthlySalary,
      calculatedAnnualCost,
      savingsMin,
      savingsMax,
    };

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(val);

    const adminName = (safeFirstName || safeLastName) ? `${safeFirstName || ''} ${safeLastName || ''}`.trim() : 'Ej angivet';
    const adminPhone = safePhone || 'Ej angivet';
    const adminCompany = safeCompany || 'Ej angivet';

    // E-postmall för kund
    const customerHtml = `
    <!DOCTYPE html>
    <html lang="sv">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #334155; margin: 0; padding: 40px 20px; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #f8fafc; padding: 30px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">${CLIENT_CONFIG.emailHeaderTitle}</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="margin-top: 0; font-size: 16px;">Hej ${userName}!</p>
          <p style="font-size: 16px;">Tack för att du använde vår kalkylator. Här är din sammanställning över sjukfrånvarons kostnader${companyText}. En formell PDF-rapport finns också bifogad i detta mail.</p>
          
          <div style="margin: 30px 0;">
            <h2 style="font-size: 18px; color: #1e293b; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">Ert resultat</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 15px;">Antal anställda</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a; font-size: 15px; text-align: right;">${calcData.employees}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 15px;">Sjukfrånvaro</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a; font-size: 15px; text-align: right;">${calcData.sickLeavePercent}%</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 15px;">Total årlig kostnad</td>
                <td style="padding: 12px 0; font-weight: 600; color: #ef4444; font-size: 15px; text-align: right;">${formatCurrency(calcData.calculatedAnnualCost)}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px; padding: 25px; background-color: #dcfce7; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 14px; text-transform: uppercase; color: #166534; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">Potentiell årlig besparing</div>
            <div style="font-size: 28px; font-weight: bold; color: #15803d; margin-bottom: 8px;">${formatCurrency(calcData.savingsMin)} - ${formatCurrency(calcData.savingsMax)}</div>
            <div style="font-size: 14px; color: #166534; opacity: 0.9;">Genom proaktiva hälsoinsatser och minskad sjukfrånvaro.</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // E-postmall för admin
    const adminHtml = `
    <h3>Nytt lead från kalkylatorn</h3>
    <p><strong>Namn:</strong> ${adminName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>Telefon:</strong> ${adminPhone}</p>
    <p><strong>Företag:</strong> ${adminCompany}</p>
    <hr />
    <h4>Uträknade värden (Server-validerade)</h4>
    <ul>
      <li><strong>Anställda:</strong> ${calcData.employees}</li>
      <li><strong>Sjukfrånvaro:</strong> ${calcData.sickLeavePercent}%</li>
      <li><strong>Total årlig kostnad:</strong> ${formatCurrency(calcData.calculatedAnnualCost)}</li>
      <li><strong>Potentiell besparing:</strong> ${formatCurrency(calcData.savingsMin)} - ${formatCurrency(calcData.savingsMax)}</li>
    </ul>
    `;

    // Generera PDF-rapport
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generatePDF(calcData, userName, companyText, formatCurrency);
    } catch (pdfErr) {
      console.error('Kunde inte generera PDF:', pdfErr);
    }

    const attachments = pdfBuffer ? [{
      filename: 'ROI_Kalkyl_Sjukfranvaro.pdf',
      content: pdfBuffer,
    }] : undefined;

    // 6. Skicka mail till kunden
    const userResult = await resend.emails.send({
      from: senderEmail,
      to: [email],
      subject: 'Din ROI-kalkyl för minskad sjukfrånvaro',
      html: customerHtml,
      attachments,
    });

    if (userResult.error) {
      console.error('Resend fel vid kundmail:', userResult.error);
      return res.status(400).json({
        error: 'Kunde inte skicka e-post till kund',
        details: userResult.error.message,
      });
    }

    // 7. Skicka mail till admin
    const adminResult = await resend.emails.send({
      from: senderEmail,
      to: [adminEmail],
      subject: `Nytt lead från kalkylatorn: ${safeCompany || safeEmail}`,
      html: adminHtml,
      attachments,
    });

    if (adminResult.error) {
      console.error('Resend fel vid adminmail:', adminResult.error);
    }

    return res.status(200).json({ success: true, id: userResult.data?.id });
  } catch (err: any) {
    console.error('Oväntat serverfel:', err);
    return res.status(500).json({ error: 'Internt serverfel', message: err.message });
  }
}
