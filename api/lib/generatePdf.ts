import PDFDocument from 'pdfkit';

export const generatePDF = (
  calcData: any, 
  userName: string, 
  companyText: string, 
  formatCurrency: any,
  indirectCostFactor: number,
  workdaysPerYear: number
): Promise<Buffer> => {
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
      doc.fontSize(10).fillColor('#64748b').text(`Kalkylen inkluderar lagstadgade arbetsgivaravgifter (31,42%) och schablon för indirekta kostnader (vikarier, administration och produktionsbortfall) med en faktor på ${indirectCostFactor}x månadslönen. Beräknat på ${workdaysPerYear} arbetsdagar per år.`);
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
