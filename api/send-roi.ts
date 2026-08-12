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

    // E-postmall för kund
    const customerHtml = `
    <!DOCTYPE html>
    <html lang="sv">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: sans-serif; background: #f4f4f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px;">
        <h2>Hälsokalkylatorn</h2>
        <p>Hej ${userName},</p>
        <p>Här är din kalkyl över sjukfrånvarons kostnader${companyText}:</p>
        <ul>
          <li><strong>Antal anställda:</strong> ${calcData.employees}</li>
          <li><strong>Sjukfrånvaro:</strong> ${calcData.sickLeavePercent}%</li>
          <li><strong>Total årlig kostnad:</strong> ${formatCurrency(calcData.calculatedAnnualCost)}</li>
          <li><strong>Potentiell besparing:</strong> ${formatCurrency(calcData.savingsMin)} - ${formatCurrency(calcData.savingsMax)}</li>
        </ul>
      </div>
    </body>
    </html>
    `;

    // E-postmall för admin
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
      <li><strong>Sjukfrånvaro:</strong> ${calcData.sickLeavePercent}%</li>
      <li><strong>Total årlig kostnad:</strong> ${calcData.calculatedAnnualCost} kr</li>
      <li><strong>Potentiell besparing:</strong> ${calcData.savingsMin} - ${calcData.savingsMax} kr</li>
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
