import { Resend } from "resend";

export default async function handler(req: any, res: any) {
  // Endast tillåt POST-requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, firstName, lastName, phone, company, calculatorData } = req.body;
    
    if (!email || !calculatorData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Resend Configuration
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY environment variable");
      return res.status(500).json({ error: "Server configuration error" });
    }
    const resend = new Resend(resendApiKey, { baseUrl: 'https://api.eu.resend.com' });

    const senderEmail = "Hälsokalkylatorn <resultat@ditt-resultat.se>";
    
    // Values for templates
    const userName = firstName ? `${firstName} ${lastName || ''}`.trim() : 'Kund';
    const companyText = company ? ` på ${company}` : '';
    
    const calcData = {
      employees: calculatorData.employees || 0,
      industry: calculatorData.industry || 'Okänd',
      sickLeavePercent: calculatorData.sickLeavePercent || 0,
      monthlySalary: calculatorData.monthlySalary || 0,
      calculatedAnnualCost: calculatorData.calculatedAnnualCost || 0,
      savingsMin: calculatorData.savingsMin || 0,
      savingsMax: calculatorData.savingsMax || 0
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(val);

    // 3. HTML template for Mail A
    const customerHtml = `
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #334155; margin: 0; padding: 40px 20px; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: #fdfdfd; padding: 30px; border-bottom: 1px solid #e2e8f0; text-align: center; }
        .header h1 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .content { padding: 40px 30px; }
        .content p { margin-top: 0; font-size: 16px; }
        .stats-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 25px 0; }
        .stats-box h2 { font-size: 18px; margin-top: 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
        .stat-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; }
        .stat-label { color: #64748b; }
        .stat-value { font-weight: 600; color: #0f172a; }
        .highlight { margin-top: 20px; padding: 20px; background-color: #fff7ed; border-left: 4px solid #ba590c; border-radius: 4px; }
        .highlight-title { font-size: 14px; text-transform: uppercase; color: #9a490a; font-weight: 700; margin-bottom: 5px; }
        .highlight-value { font-size: 24px; font-weight: bold; color: #ba590c; }
        .cta-container { text-align: center; margin: 35px 0 20px; }
        .cta-button { display: inline-block; background-color: #ba590c; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; transition: background-color 0.2s; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Hälsokalkylatorn</h1>
        </div>
        <div class="content">
          <p>Hej ${userName},</p>
          <p>Tack för att du använde vår ROI-kalkylator. Här är din sammanställning över sjukfrånvarons kostnader${companyText}.</p>
          
          <div class="stats-box">
            <h2>Ert resultat</h2>
            <div class="stat-row">
              <span class="stat-label">Antal anställda:</span>
              <span class="stat-value">${calcData.employees}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Snittlön:</span>
              <span class="stat-value">${formatCurrency(calcData.monthlySalary)}/mån</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Sjukfrånvaro:</span>
              <span class="stat-value">${calcData.sickLeavePercent}%</span>
            </div>
            <div class="stat-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
              <span class="stat-label">Total årlig kostnad:</span>
              <span class="stat-value" style="color: #ef4444;">${formatCurrency(calcData.calculatedAnnualCost)}</span>
            </div>
          </div>

          <div class="highlight">
            <div class="highlight-title">Potentiell årlig besparing</div>
            <div class="highlight-value">${formatCurrency(calcData.savingsMin)} - ${formatCurrency(calcData.savingsMax)}</div>
            <div style="font-size: 14px; color: #52525b; margin-top: 8px;">Genom att minska sjukfrånvaron med 15-30% genom proaktiva hälsoinsatser.</div>
          </div>

          <p style="margin-top: 30px;">Vill du veta mer om hur vi kan hjälpa er att sänka dessa kostnader och skapa en friskare arbetsplats?</p>
          
          <div class="cta-container">
            <a href="https://halsobolaget.se/kontakt" class="cta-button">Boka rådgivning</a>
          </div>
        </div>
        <div class="footer">
          Detta mail skickades från Hälsokalkylatorn av Hälsobolaget.
        </div>
      </div>
    </body>
    </html>
    `;

    // Mail B - To Admin
    const adminHtml = `
    <h3>Nytt lead från kalkylatorn</h3>
    <p><strong>Namn:</strong> ${firstName || '-'} ${lastName || '-'}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Telefon:</strong> ${phone || '-'}</p>
    <p><strong>Företag:</strong> ${company || '-'}</p>
    <hr />
    <h4>Uträknade värden</h4>
    <ul>
      <li><strong>Anställda:</strong> ${calcData.employees}</li>
      <li><strong>Bransch:</strong> ${calcData.industry}</li>
      <li><strong>Sjukfrånvaro:</strong> ${calcData.sickLeavePercent}%</li>
      <li><strong>Snittlön:</strong> ${calcData.monthlySalary} kr/mån</li>
      <li><strong>Total årlig kostnad:</strong> ${calcData.calculatedAnnualCost} kr</li>
      <li><strong>Potentiell besparing:</strong> ${calcData.savingsMin} - ${calcData.savingsMax} kr</li>
    </ul>
    `;
    
    const adminEmail = process.env.ADMIN_EMAIL || "noeljohansson.tech@gmail.com";

    // 2. Dual Emails
    const [userEmailResult, adminEmailResult] = await Promise.all([
      resend.emails.send({
        from: senderEmail,
        to: email,
        subject: "Din ROI-kalkyl för minskad sjukfrånvaro",
        html: customerHtml
      }),
      resend.emails.send({
        from: senderEmail,
        to: adminEmail,
        subject: "Nytt lead från kalkylatorn: " + (company || email),
        html: adminHtml
      })
    ]);

    if (userEmailResult.error) {
      console.error("Error sending user email:", userEmailResult.error);
      return res.status(500).json({ error: "Failed to send email to user" });
    }

    if (adminEmailResult.error) {
      console.error("Error sending admin email:", adminEmailResult.error);
      // We still return 200 to user if their email succeeded, but log it
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Unhandled error sending email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
