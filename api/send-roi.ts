import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  // 1. Endast POST-anrop tillåts
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    const userName = firstName ? `${firstName} ${lastName || ''}`.trim() : 'Kund';
    const companyText = company ? ` på ${company}` : '';

    const calcData = {
      employees: calculatorData.employees || 0,
      sickLeavePercent: calculatorData.sickLeavePercent || 0,
      monthlySalary: calculatorData.monthlySalary || 0,
      calculatedAnnualCost: calculatorData.calculatedAnnualCost || 0,
      savingsMin: calculatorData.savingsMin || 0,
      savingsMax: calculatorData.savingsMax || 0,
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
          <p style="margin-top: 0; font-size: 16px;">Hej ${userName},</p>
          <p style="font-size: 16px;">Tack för att du använde vår kalkylator. Här är din sammanställning över sjukfrånvarons kostnader${companyText}.</p>
          
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

    // 4. Skicka mail till kunden (Officiellt SDK-mönster)
    const userResult = await resend.emails.send({
      from: senderEmail,
      to: [email],
      subject: 'Din ROI-kalkyl för minskad sjukfrånvaro',
      html: customerHtml,
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
