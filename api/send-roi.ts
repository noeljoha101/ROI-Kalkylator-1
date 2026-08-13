import { Resend } from 'resend';
import PDFDocument from 'pdfkit';

// Hjälpfunktion för att generera en enkel PDF i minnet
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
      doc.fontSize(10).fillColor('#64748b').text('Kalkylen inkluderar lagstadgade arbetsgivaravgifter (31,42%) och schablon för indirekta kostnader (vikarier, administration och produktionsbortfall) med en faktor på 1.4x månadslönen. Beräknat på 220 arbetsdagar per år.');
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// Rate limiting cache (minne - skyddar mot snabbt spam på samma server-instans)
const rateLimitCache = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_MAX = 3; // Max antal mail per IP...
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // ...per timme

export default async function handler(req: any, res: any) {
  // 1. Endast POST-anrop tillåts
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1b. Rate limiting check (Spamskydd Backend)
  // På Vercel ligger besökarens riktiga IP ofta i x-forwarded-for
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]) 
             || req.socket?.remoteAddress 
             || 'unknown';
             
  const now = Date.now();
  
  if (ip !== 'unknown') {
    const userRateData = rateLimitCache.get(ip);
    if (userRateData) {
      if (now - userRateData.timestamp < RATE_LIMIT_WINDOW_MS) {
        if (userRateData.count >= RATE_LIMIT_MAX) {
          console.warn(`Spamskydd aktiverat: IP ${ip} har överskridit gränsen på ${RATE_LIMIT_MAX} mail per timme.`);
          return res.status(429).json({ error: 'Du har skickat för många kalkylator-förfrågningar. Vänligen vänta ett tag innan du försöker igen.' });
        }
        userRateData.count++;
      } else {
        // Tidsfönstret har passerat, nollställ
        rateLimitCache.set(ip, { count: 1, timestamp: now });
      }
    } else {
      // Första gången denna IP syns
      rateLimitCache.set(ip, { count: 1, timestamp: now });
    }
    
    // Rensa cachen ibland för att undvika minnesläckage om det kommer trafik från tusentals olika IP:n
    if (rateLimitCache.size > 1000) {
      rateLimitCache.clear();
    }
  }

  // 2. Kontrollera API-nyckeln
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('RESEND_API_KEY saknas i miljövariablerna');
    return res.status(500).json({ error: 'Serverkonfigurationsfel: API-nyckel saknas' });
  }

  // 3. Initiera Resend SDK enligt officiell specifikation
  const resend = new Resend(resendApiKey);

  try {
    const { email, firstName, lastName, phone, company, calculatorData } = req.body || {};

    if (!email || !calculatorData) {
      return res.status(400).json({ error: 'Obligatoriska fält saknas (email eller calculatorData)' });
    }

    const senderEmail = 'Hälsokalkylatorn <resultat@ditt-resultat.se>';
    const adminEmail = process.env.ADMIN_EMAIL || 'noeljohansson.tech@gmail.com';
    const userName = firstName ? firstName.trim() : 'Kund';
    const companyText = company ? ` på ${company}` : '';

    const clamp = (val: any, min: number, max: number) => {
      const num = Number(val) || 0;
      return Math.min(Math.max(num, min), max);
    };

    const calcData = {
      employees: clamp(calculatorData.employees, 1, 50000),
      sickLeavePercent: clamp(calculatorData.sickLeavePercent, 0, 100),
      monthlySalary: clamp(calculatorData.monthlySalary, 1, 1000000),
      calculatedAnnualCost: clamp(calculatorData.calculatedAnnualCost, 0, 1000000000),
      savingsMin: clamp(calculatorData.savingsMin, 0, 1000000000),
      savingsMax: clamp(calculatorData.savingsMax, 0, 1000000000),
    };

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(val);

    const adminName = (firstName || lastName) ? `${firstName || ''} ${lastName || ''}`.trim() : 'Ej angivet';
    const adminPhone = phone || 'Ej angivet';
    const adminCompany = company || 'Ej angivet';

    // E-postmall för kund
    const customerHtml = `
    <!DOCTYPE html>
    <html lang="sv">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #334155; margin: 0; padding: 40px 20px; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #f8fafc; padding: 30px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">Hälsokalkylatorn</h1>
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
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Telefon:</strong> ${adminPhone}</p>
    <p><strong>Företag:</strong> ${adminCompany}</p>
    <hr />
    <h4>Uträknade värden</h4>
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
      // Vi fortsätter ändå, mailet skickas utan bilaga om PDF:en misslyckas.
    }

    const attachments = pdfBuffer ? [{
      filename: 'ROI_Kalkyl_Sjukfranvaro.pdf',
      content: pdfBuffer,
    }] : undefined;

    // 4. Skicka mail till kunden (Officiellt SDK-mönster)
    const userResult = await resend.emails.send({
      from: senderEmail,
      to: [email],
      subject: 'Din ROI-kalkyl för minskad sjukfrånvaro',
      html: customerHtml,
      attachments,
    });

    // Kontrollera om Resend returnerade ett fel
    if (userResult.error) {
      console.error('Resend fel vid kundmail:', userResult.error);
      return res.status(400).json({
        error: 'Kunde inte skicka e-post till kund',
        details: userResult.error.message,
      });
    }

    // 5. Skicka mail till admin (Officiellt SDK-mönster)
    const adminResult = await resend.emails.send({
      from: senderEmail,
      to: [adminEmail],
      subject: `Nytt lead från kalkylatorn: ${company || email}`,
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
