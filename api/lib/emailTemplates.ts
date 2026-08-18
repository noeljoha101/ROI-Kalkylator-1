export const getCustomerHtml = (
  emailHeaderTitle: string,
  userName: string,
  companyText: string,
  calcData: any,
  formatCurrency: any
) => `
    <!DOCTYPE html>
    <html lang="sv">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #334155; margin: 0; padding: 40px 20px; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #f8fafc; padding: 30px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">${emailHeaderTitle}</h1>
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

export const getAdminHtml = (
  adminName: string,
  safeEmail: string,
  adminPhone: string,
  adminCompany: string,
  calcData: any,
  formatCurrency: any
) => `
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
