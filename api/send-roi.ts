import { Resend } from 'resend';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { generatePDF } from './lib/generatePdf';
import { getCustomerHtml, getAdminHtml } from './lib/emailTemplates';

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

let ratelimit: Ratelimit | null = null;

export default async function handler(req: Request, res: Response) {
  // 1. Origin-kontroll
  // VIKTIGT: Vid iframe-inbäddning skickar webbläsaren Origin = iframens EGEN domän
  // (t.ex. https://din-app.vercel.app), INTE värdsidans domän (halsobolaget.se) —
  // om inte kunden pekat en egen subdomän (CNAME) mot denna app. Sätt ALLOWED_ORIGIN
  // till den faktiska domän varifrån requesten skickas, inte till värdsidans domän
  // om de skiljer sig åt.
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin && req.headers.origin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Otillåten origin' });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('KV_REST_API_URL/KV_REST_API_TOKEN saknas — har Redis-databasen kopplats till projektet i Vercel Storage?');
    return res.status(500).json({ error: 'Serverkonfigurationsfel' });
  }

  // Konsoliderad ratelimit-initiering
  if (!ratelimit) {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
    });
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
    const MAX_LEN = 200;
    const safeFirstName = escapeHtml(String(firstName || '').slice(0, MAX_LEN));
    const safeLastName = escapeHtml(String(lastName || '').slice(0, MAX_LEN));
    const safeCompany = escapeHtml(String(company || '').slice(0, MAX_LEN));
    const safeEmail = escapeHtml(String(email || '').slice(0, MAX_LEN));
    const safePhone = escapeHtml(String(phone || '').slice(0, 50));

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
    const customerHtml = getCustomerHtml(CLIENT_CONFIG.emailHeaderTitle, userName, companyText, calcData, formatCurrency);

    // E-postmall för admin
    const adminHtml = getAdminHtml(adminName, safeEmail, adminPhone, adminCompany, calcData, formatCurrency);

    // Generera PDF-rapport
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generatePDF(calcData, userName, companyText, formatCurrency, INDIRECT_COST_FACTOR, WORKDAYS_PER_YEAR);
    } catch (pdfErr) {
      console.error('Kunde inte generera PDF:', pdfErr);
    }

    const attachments = pdfBuffer ? [{
      filename: 'ROI_Kalkyl_Sjukfranvaro.pdf',
      content: pdfBuffer,
    }] : undefined;

    // 6. Skicka mail via Promise.allSettled
    const [userResult, adminResult] = await Promise.allSettled([
      resend.emails.send({
        from: senderEmail, 
        to: [email],
        subject: 'Din ROI-kalkyl för minskad sjukfrånvaro',
        html: customerHtml, 
        attachments,
      }),
      resend.emails.send({
        from: senderEmail, 
        to: [adminEmail],
        subject: `Nytt lead från kalkylatorn: ${safeCompany || safeEmail}`,
        html: adminHtml, 
        attachments,
      }),
    ]);

    if (adminResult.status === 'rejected' || (adminResult.status === 'fulfilled' && adminResult.value.error)) {
      console.error('KRITISKT: Lead-mail till admin misslyckades:',
        adminResult.status === 'rejected' ? adminResult.reason : adminResult.value.error);
    }

    if (userResult.status === 'rejected' || (userResult.status === 'fulfilled' && userResult.value.error)) {
      console.error('Resend fel vid kundmail:',
        userResult.status === 'rejected' ? userResult.reason : userResult.value.error);
      return res.status(200).json({ success: true, warning: 'Rapporten kunde inte skickas direkt, men vi har tagit emot dina uppgifter.' });
    }

    return res.status(200).json({ success: true, id: (userResult as PromiseFulfilledResult<any>).value.data?.id });
  } catch (err: any) {
    console.error('Oväntat serverfel:', err);
    return res.status(500).json({ error: 'Internt serverfel', message: 'Något gick fel, försök igen senare.' });
  }
}
