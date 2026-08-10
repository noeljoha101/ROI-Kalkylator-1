import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Activity, 
  Banknote,
  ArrowRight,
  X,
  CheckCircle2,
  Info,
  Plus,
  Mail,
  Download,
  Loader2
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

const INDUSTRIES = {
  'Kontor/tjänst': 40000,
  'Bygg/industri': 35000,
  'Vård/omsorg': 30000,
  'Handel': 28000,
  'Övrigt': 32000,
};

type Industry = keyof typeof INDUSTRIES;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
};

export default function App() {
  const [employees, setEmployees] = useState<number>(50);
  const [industry, setIndustry] = useState<Industry>('Kontor/tjänst');
  const [sickLeavePercent, setSickLeavePercent] = useState<number>(5.3);
  const [monthlySalary, setMonthlySalary] = useState<number>(INDUSTRIES['Kontor/tjänst']);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: ''
  });

  // Update salary when industry changes, if the user hasn't heavily customized it (or just always update for simplicity)
  useEffect(() => {
    setMonthlySalary(INDUSTRIES[industry]);
  }, [industry]);

  // Calculations
  // Kostnad per sjukdag ≈ (månadslön / 21 arbetsdagar) × 1,4
  const costPerSickDay = (monthlySalary / 21) * 1.4;
  
  // Total årlig sjukfrånvarokostnad = antal anställda × arbetsdagar per år (ca 220) × sjukfrånvaro-% × kostnad per sjukdag
  const totalAnnualCost = employees * 220 * (sickLeavePercent / 100) * costPerSickDay;
  
  // Besparing vid 1% minskning
  const savingsOnePercent = employees * 220 * (1 / 100) * costPerSickDay;

  // Potential savings (15% to 30%)
  const savingsMin = totalAnnualCost * 0.15;
  const savingsMax = totalAnnualCost * 0.30;

  // Projection over 5 years
  const projectionData = Array.from({ length: 6 }).map((_, i) => ({
    year: `År ${i}`,
    Nuvarande: Math.round(totalAnnualCost * i),
    'Efter åtgärder (-15%)': Math.round((totalAnnualCost - savingsMin) * i)
  }));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      ...formData,
      calculatorData: {
        employees,
        industry,
        sickLeavePercent,
        monthlySalary,
        calculatedAnnualCost: totalAnnualCost,
        savingsMin,
        savingsMax,
        savingsOnePercent
      }
    };

    try {
      // HÄR KOPPLAR VI IN ZAPIER ELLER MAKE.COM
      // Byt ut URL:en nedan mot er unika Webhook URL
      // const WEBHOOK_URL = "https://hook.eu1.make.com/din-webhook-url-här";
      
      // await fetch(WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });

      console.log("Lead form submitted till Webhook:", payload);
      
      // Vi simulerar ett nätverksanrop på 1.5 sekunder för användarupplevelsen
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Kunde inte skicka kalkylen:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfdfd] overflow-hidden text-slate-800 font-sans selection:bg-[#BA590C]/20">
      {/* Header */}
      <nav className="h-16 flex items-center justify-between px-6 md:px-10 border-b border-slate-100 bg-white shrink-0">
        <a href="https://halsobolaget.se" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="relative w-[42px] h-[42px] rounded-full bg-gradient-to-br from-slate-300 via-slate-100 to-slate-400 p-[2.5px] shadow-sm flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#EF8F4A] to-[#BE5314] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="url(#crossGradient)" className="drop-shadow-sm">
                <defs>
                  <linearGradient id="crossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                  </linearGradient>
                </defs>
                <path d="M9 4 H15 V9 H20 V15 H15 V20 H9 V15 H4 V9 H9 Z" stroke="#ffffff" strokeWidth="0.5" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <span className="font-serif text-[26px] tracking-[0.08em] text-[#52525B] mt-1">
            HÄLSOBOLAGET
          </span>
        </a>
        <div className="hidden md:flex gap-8 text-sm font-condensed font-bold text-slate-500 uppercase tracking-widest">
          <a href="https://halsobolaget.se" target="_blank" rel="noopener noreferrer" className="hover:text-[#BA590C] transition-colors">Tjänster</a>
          <a href="https://halsobolaget.se" target="_blank" rel="noopener noreferrer" className="hover:text-[#BA590C] transition-colors">Arbetsmiljökollen</a>
          <span className="text-slate-900 border-b-2 border-[#BA590C]">ROI Kalkylator</span>
        </div>
        <a 
          href="#result" 
          className="text-sm font-condensed font-bold text-[#BA590C] hover:text-[#BA590C]/80 transition-colors md:hidden uppercase"
        >
          Se resultat
        </a>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Inputs */}
        <section className="w-full md:w-[420px] bg-white p-6 md:p-10 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col gap-8 shrink-0 overflow-y-auto">
          <div>
            <h1 className="text-3xl font-condensed font-bold mb-3 uppercase tracking-tight text-slate-800">Vad kostar sjukfrånvaron?</h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Dina anställda är ditt företags viktigaste och mest dyrbara resurs. Företagshälsan ska främja hälsa, förebygga ohälsa och undanröja hälsorisker. Justera parametrarna nedan för att se den ekonomiska påverkan på er verksamhet.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Antal anställda */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Antal anställda</label>
                <span className="text-sm font-bold text-slate-900">{employees} st</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="500" 
                value={employees} 
                onChange={(e) => setEmployees(Number(e.target.value))}
                className="w-full h-1 bg-slate-100 accent-[#BA590C] appearance-none cursor-pointer rounded-full"
              />
            </div>

            {/* Bransch */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Bransch</label>
              <div className="relative">
                <select 
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as Industry)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#BA590C]/20 appearance-none cursor-pointer"
                >
                  {Object.keys(INDUSTRIES).map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Nuvarande sjukfrånvaro */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sjukfrånvaro (%)</label>
                <span className="text-sm font-bold text-slate-900">{sickLeavePercent} %</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="15" 
                step="0.1"
                value={sickLeavePercent} 
                onChange={(e) => setSickLeavePercent(Number(e.target.value))}
                className="w-full h-1 bg-slate-100 accent-[#BA590C] appearance-none cursor-pointer rounded-full"
              />
              <p className="text-[10px] text-slate-400 italic text-right">Sveriges snitt: 5.3% (SCB)</p>
            </div>

            {/* Snittlön */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Snittlön (per månad)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#BA590C]/20 pr-12"
                />
                <span className="absolute right-3 top-3 text-slate-400 text-xs font-medium">SEK</span>
              </div>
            </div>
          </div>

          <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100 hidden md:block">
            <p className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-bold block mb-1 text-slate-600">TRANSPARENT BERÄKNING</span>
              Kostnad per dag = (Månadslön / 21) × 1.4
              <br />
              Total kostnad = Anställda × 220 dagar × % × Dagskostnad
            </p>
          </div>
        </section>

        {/* Right Column: Results */}
        <section id="result" className="flex-1 bg-slate-50/50 p-6 md:p-12 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-10 py-8">
            <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#BA590C]"></div>
              <span className="text-xs font-bold text-[#BA590C] uppercase tracking-[3px] block mb-4">Uppskattad årlig kostnad</span>
              
              <div className="flex items-baseline gap-4 flex-wrap">
                <h2 className="text-5xl md:text-6xl font-bold text-slate-800 tracking-tight">
                  {formatCurrency(totalAnnualCost).replace(' kr', '')}
                </h2>
                <span className="text-xl md:text-2xl font-medium text-slate-400">SEK</span>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-900 mb-6">Projektion: Ackumulerad kostnad över 5 år</p>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorReduced" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#BA590C" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#BA590C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis 
                        tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}k`} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                      />
                      <Area type="monotone" dataKey="Nuvarande" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorCurrent)" />
                      <Area type="monotone" dataKey="Efter åtgärder (-15%)" stroke="#BA590C" strokeWidth={2} fillOpacity={1} fill="url(#colorReduced)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F5] border border-[#BA590C]/20 p-6 rounded-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
              <div className="w-16 h-16 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl font-bold text-[#BA590C]">-1%</div>
              <div className="flex-1 mt-1">
                <p className="text-slate-800 font-medium">Sänk sjukfrånvaron med endast 1%</p>
                <p className="text-slate-600 text-sm mt-1">Det skulle spara er ca <span className="text-slate-900 font-bold">{formatCurrency(savingsOnePercent)}</span> per år i rena produktionsvinster.</p>
              </div>
            </div>

            <div className="pt-6">
              <div className="text-center mb-6">
                <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                  Vår vision är att skapa säkra, hälsosamma och glada arbetsplatser. Vill du veta exakt hur ni kan nå besparingar på {formatCurrency(savingsMax)}?
                </p>
              </div>
              
              <div 
                onClick={() => setIsModalOpen(true)}
                className="bg-white border border-slate-200 hover:border-[#BA590C]/50 rounded-lg p-6 relative overflow-hidden group cursor-pointer transition-all shadow-sm hover:shadow-md"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#BA590C]/5 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-[#BA590C]/10"></div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
                  <div className="w-24 h-32 bg-slate-50 border border-slate-200 rounded-sm shadow-sm flex flex-col justify-between p-3 shrink-0 group-hover:-translate-y-1 transition-transform relative">
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      PDF
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-10 bg-[#BA590C] rounded-full"></div>
                      <div className="h-1 w-14 bg-slate-300 rounded-full"></div>
                      <div className="h-1 w-12 bg-slate-300 rounded-full"></div>
                    </div>
                    <div className="space-y-1.5">
                       <div className="h-10 w-full bg-slate-200/50 rounded-sm"></div>
                       <div className="h-1 w-full bg-slate-300 rounded-full"></div>
                       <div className="h-1 w-2/3 bg-slate-300 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-[#BA590C] text-[10px] font-bold uppercase tracking-wider mb-3">
                      <Download className="w-3.5 h-3.5" />
                      Din personliga rapport
                    </span>
                    <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-[#BA590C] transition-colors">ROI & Åtgärdsplan för {industry}</h4>
                    <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                      Få en detaljerad nedbrytning av era kostnader på {formatCurrency(totalAnnualCost)} och en konkret steg-för-steg plan för hur ni kan minska frånvaron.
                    </p>
                    <button className="w-full sm:w-auto bg-[#BA590C] text-white px-6 py-3 rounded-md font-bold text-sm uppercase tracking-wider hover:bg-[#994708] transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <Mail className="w-4 h-4" />
                      <span>Skicka till min e-post</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-center text-xs text-slate-400 block md:hidden">
              Kalkylen bygger på branschstandardiserade schablonvärden och ger en indikation. Kostnad per dag = (Månadslön / 21) × 1.4.
            </p>
          </div>

          <footer className="mt-auto hidden md:flex justify-center gap-12 py-6 border-t border-slate-100/50">
            <div className="flex items-center gap-2 opacity-40 grayscale hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold tracking-widest uppercase">Arbetsmiljökollen</span>
            </div>
            <div className="flex items-center gap-2 opacity-40 grayscale hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold tracking-widest uppercase">Rehab-koordinering</span>
            </div>
            <div className="flex items-center gap-2 opacity-40 grayscale hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold tracking-widest uppercase">Hälsoundersökning</span>
            </div>
          </footer>
        </section>
      </main>

      {/* Lead Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="bg-white rounded-md w-full max-w-md p-6 md:p-8 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!isSubmitted ? (
              <>
                <div className="w-12 h-12 bg-[#FAF7F5] rounded-full flex items-center justify-center mb-4">
                  <Download className="w-6 h-6 text-[#BA590C]" />
                </div>
                <h3 className="text-2xl font-condensed font-bold text-slate-800 mb-2 uppercase tracking-tight">Få er skräddarsydda ROI-rapport</h3>
                <p className="text-slate-600 mb-6 text-sm">
                  Fyll i dina uppgifter så skickar vi er detaljerade kostnadskalkyl som en PDF till din e-post, och visar hur ni kan sänka kostnaderna.
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Namn</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BA590C]/20 focus:border-[#BA590C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Företag</label>
                    <input 
                      required
                      type="text" 
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                      className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BA590C]/20 focus:border-[#BA590C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-post</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BA590C]/20 focus:border-[#BA590C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                    <input 
                      required
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BA590C]/20 focus:border-[#BA590C]"
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#BA590C] hover:bg-[#994708] disabled:opacity-70 text-white font-bold tracking-wider uppercase py-4 px-6 rounded-md shadow-md transition-colors mt-4 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Skickar rapport...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Skicka min rapport
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-3">
                    Din rapport skickas direkt. Vi hanterar dina uppgifter säkert.
                  </p>
                </form>
              </>
            ) : (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#FAF7F5] rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#BA590C]" />
                </div>
                <h3 className="text-2xl font-condensed font-bold text-slate-800 mb-2 uppercase tracking-tight">Rapporten är skickad!</h3>
                <p className="text-slate-600 mb-6">
                  Er detaljerade ROI-kalkyl är på väg till din inkorg. Håll utkik efter ett mail från oss.
                </p>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#BA590C] font-bold tracking-wider uppercase hover:text-[#994708]"
                >
                  Stäng fönstret
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
