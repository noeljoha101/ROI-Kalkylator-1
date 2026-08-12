export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, firstName, lastName, phone, company, calculatorData } = req.body || {};
    
    if (!email || !calculatorData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return res.status(500).json({ error: "Server configuration error: Missing API Key" });
    }

    const senderEmail = "Hälsokalkylatorn <resultat@ditt-resultat.se>";
    const adminEmail = process.env.ADMIN_EMAIL || "noeljohansson.tech@gmail.com";
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

    const customerHtml = `
    <!DOCTYPE html>
    <html lang="sv">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: sans-serif; background: #f4f4f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px;">
        <h2>Hälsokalkylatorn</h2>
        <p>Hej ${userName},</p>
        <p>Här är din sammanställning över sjukfrånvarons kostnader${companyText}:</p>
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

    // Hjälpfunktion för att skicka direkt mot Resends EU API
    const sendEmailViaEU = async (to: string, subject: string, html: string) => {
      const response = await fetch("https://api.eu.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [to],
          subject: subject,
          html: html
        })
      });
      return await response.json();
    };

    // Skicka båda mailen
    const [userRes, adminRes] = await Promise.all([
      sendEmailViaEU(email, "Din ROI-kalkyl för minskad sjukfrånvaro", customerHtml),
      sendEmailViaEU(adminEmail, `Nytt lead från kalkylatorn: ${company || email}`, adminHtml)
    ]);

    if (userRes.error) {
      console.error("Resend EU Error (User):", userRes.error);
      return res.status(500).json({ error: userRes.error });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
