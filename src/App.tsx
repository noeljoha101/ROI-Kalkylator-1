import React, { useState, useEffect, useMemo } from 'react';
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
import { CLIENT_CONFIG } from './client.config';

const INDIRECT_COST_FACTOR = 1.4; // Vikarier, admin, produktionsbortfall
const WORKDAYS_PER_MONTH = 21;
const WORKDAYS_PER_YEAR = 220;
const SAVINGS_LOW = 0.15;
const SAVINGS_HIGH = 0.30;

type Industry = keyof typeof CLIENT_CONFIG.industries;

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
  const [monthlySalary, setMonthlySalary] = useState<number>(CLIENT_CONFIG.industries['Kontor/tjänst']);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    gdprConsent: false
  });

  // Update salary when industry changes, if the user hasn't heavily customized it (or just always update for simplicity)
  useEffect(() => {
    setMonthlySalary(CLIENT_CONFIG.industries[industry]);
  }, [industry]);

  // Calculations
  // Kostnad per sjukdag
  const costPerSickDay = (monthlySalary / WORKDAYS_PER_MONTH) * INDIRECT_COST_FACTOR;
  
  // Total årlig sjukfrånvarokostnad
  const totalAnnualCost = employees * WORKDAYS_PER_YEAR * (sickLeavePercent / 100) * costPerSickDay;
  
  // Besparing vid 1% minskning
  const savingsOnePercent = employees * WORKDAYS_PER_YEAR * (1 / 100) * costPerSickDay;

  // Potential savings
  const savingsMin = totalAnnualCost * SAVINGS_LOW;
  const savingsMax = totalAnnualCost * SAVINGS_HIGH;

  // Projection over 5 years
  const projectionData = useMemo(() => 
    Array.from({ length: 6 }).map((_, i) => ({
      year: `År ${i}`,
      Nuvarande: Math.round(totalAnnualCost * i),
      'Efter åtgärder (-15%)': Math.round((totalAnnualCost - savingsMin) * i)
    })),
    [totalAnnualCost, savingsMin]
  );

  const handleEmployeesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value.replace(/\D/g, ''));
    if (val > 50000) val = 50000;
    setEmployees(val);
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value.replace(/\D/g, ''));
    if (val > 500000) val = 500000;
    setMonthlySalary(val);
  };

  const handleSickLeaveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (val > 100) val = 100;
    if (val < 0) val = 0;
    setSickLeavePercent(val);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.website) {
      setIsSubmitted(true);
      return;
    }

    const freeEmailProviders = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.se', 'hotmail.se'];
    const emailDomain = formData.email.split('@')[1]?.toLowerCase();
    if (freeEmailProviders.includes(emailDomain)) {
      setFormError('Vänligen använd din företags-e-postadress för att få rapporten.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    
    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
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
      const WEBHOOK_URL = "/api/send-roi";
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Kunde inte skicka kalkylen:", error);
      setFormError('Något gick fel. Kunde inte skicka kalkylen just nu, vänligen försök igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="flex flex-col min-h-screen bg-[#fdfdfd] overflow-hidden text-slate-800 font-sans selection:bg-[var(--brand-color)]/20"
      style={{
        '--brand-color': CLIENT_CONFIG.brandColor,
        '--brand-color-hover': CLIENT_CONFIG.brandColorHover
      } as React.CSSProperties}
    >
      {/* Header */}
      <nav className="h-16 flex items-center justify-between px-6 md:px-10 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-12 md:gap-16">
          <a href={CLIENT_CONFIG.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            {/* OBS: SVG-logotypen nedan (inkl dess färger/gradienter) är specifik för kunden (Hälsobolaget). 
                Vid onboarding av en ny kund bör denna SVG bytas ut mot den nya kundens logotyp manuellt. */}
            <svg width="42" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-sm">
              <defs>
                <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7a7a7a"/>
                  <stop offset="25%" stopColor="#e8e8e8"/>
                  <stop offset="50%" stopColor="#ffffff"/>
                  <stop offset="75%" stopColor="#e8e8e8"/>
                  <stop offset="100%" stopColor="#5a5a5a"/>
                </linearGradient>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f39556"/>
                  <stop offset="50%" stopColor="#da6a28"/>
                  <stop offset="100%" stopColor="#b33f15"/>
                </linearGradient>
                <linearGradient id="crossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="100%" stopColor="#f0ecf4"/>
                </linearGradient>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodColor="#8a3711" floodOpacity="0.6"/>
                </filter>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#metalGradient)" stroke="#555" strokeWidth="1.5"/>
              <circle cx="50" cy="50" r="40" fill="url(#orangeGradient)" stroke="#444" strokeWidth="1"/>
              <path d="M 41 24 H 59 V 41 H 76 V 59 H 59 V 76 H 41 V 59 H 24 V 41 H 41 Z" 
                    fill="url(#crossGradient)" 
                    filter="url(#shadow)" 
                    stroke="#eab28a" 
                    strokeWidth="0.5"/>
            </svg>
            <span className="font-serif text-[26px] tracking-[0.08em] text-[#52525B] mt-1">
              {CLIENT_CONFIG.companyName}
            </span>
          </a>
          <div className="hidden md:flex gap-8 text-sm font-condensed font-bold text-slate-500 uppercase tracking-widest mt-1">
            {CLIENT_CONFIG.headerLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--brand-color)] transition-colors">{link.label}</a>
            ))}
            <span className="text-slate-900 border-b-2 border-[var(--brand-color)]">ROI Kalkylator</span>
          </div>
        </div>
        <a 
          href="#result" 
          className="text-sm font-condensed font-bold text-[var(--brand-color)] hover:text-[var(--brand-color)]/80 transition-colors md:hidden uppercase"
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
                onChange={handleEmployeesChange}
                className="w-full h-1 bg-slate-100 accent-[var(--brand-color)] appearance-none cursor-pointer rounded-full"
              />
            </div>

            {/* Bransch */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Bransch</label>
              <div className="relative">
                <select 
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as Industry)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 appearance-none cursor-pointer"
                >
                  {Object.keys(CLIENT_CONFIG.industries).map((ind) => (
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
                onChange={handleSickLeaveChange}
                className="w-full h-1 bg-slate-100 accent-[var(--brand-color)] appearance-none cursor-pointer rounded-full"
              />
            </div>

            {/* Snittlön */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Snittlön (per månad)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={monthlySalary.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  onChange={handleSalaryChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 pr-12"
                />
                <span className="absolute right-3 top-3 text-slate-400 text-xs font-medium">SEK</span>
              </div>
            </div>
          </div>

          <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100 hidden md:block">
            <p className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-bold block mb-1 text-slate-600">SÅ HÄR RÄKNAR VI</span>
              Kalkylen inkluderar lagstadgade arbetsgivaravgifter (31,42%) och schablon för indirekta kostnader (vikarier, administration och produktionsbortfall) med en faktor på 1.4x månadslönen. Beräknat på 220 arbetsdagar per år.
            </p>
          </div>
        </section>

        {/* Right Column: Results */}
        <section id="result" className="flex-1 bg-slate-50/50 p-6 md:p-12 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-10 py-8">
            <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--brand-color)]"></div>
              <span className="text-xs font-bold text-[var(--brand-color)] uppercase tracking-[3px] block mb-4">Uppskattad årlig kostnad</span>
              
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
                          <stop offset="5%" stopColor="var(--brand-color)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--brand-color)" stopOpacity={0}/>
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
                      <Area type="monotone" dataKey="Efter åtgärder (-15%)" stroke="var(--brand-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorReduced)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F5] border border-[var(--brand-color)]/20 p-6 rounded-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
              <div className="w-16 h-16 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl font-bold text-[var(--brand-color)]">-1%</div>
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
                className="bg-white border border-slate-200 hover:border-[var(--brand-color)]/50 rounded-lg p-6 relative overflow-hidden group cursor-pointer transition-all shadow-sm hover:shadow-md"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--brand-color)]/5 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-[var(--brand-color)]/10"></div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
                  <div className="w-24 h-32 bg-slate-50 border border-slate-200 rounded-sm shadow-sm flex flex-col justify-between p-3 shrink-0 group-hover:-translate-y-1 transition-transform relative">
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      KALKYL
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-10 bg-[var(--brand-color)] rounded-full"></div>
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-[var(--brand-color)] text-[10px] font-bold uppercase tracking-wider mb-3">
                      <Download className="w-3.5 h-3.5" />
                      Din personliga kalkyl
                    </span>
                    <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-[var(--brand-color)] transition-colors">ROI-kalkyl för {industry}</h4>
                    <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                      Få en personlig ROI-kalkyl över er sjukfrånvaro direkt till din inkorg.
                    </p>
                    <button className="w-full sm:w-auto bg-[var(--brand-color)] text-white px-6 py-3 rounded-md font-bold text-sm uppercase tracking-wider hover:bg-[var(--brand-color-hover)] transition-colors flex items-center justify-center gap-2 shadow-sm">
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
            {CLIENT_CONFIG.footerBadges.map((badge, i) => (
              <div key={i} className="flex items-center gap-2 opacity-40 grayscale hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold tracking-widest uppercase">{badge}</span>
              </div>
            ))}
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
                  <Download className="w-6 h-6 text-[var(--brand-color)]" />
                </div>
                <h3 className="text-2xl font-condensed font-bold text-slate-800 mb-2 uppercase tracking-tight">Få er skräddarsydda ROI-kalkyl</h3>
                <p className="text-slate-600 mb-6 text-sm">
                  Fyll i dina uppgifter så skickar vi er personliga ROI-kalkyl över sjukfrånvaron direkt till din inkorg.
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Förnamn</label>
                      <input 
                        required
                        type="text" 
                        value={formData.firstName}
                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                        className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 focus:border-[var(--brand-color)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Efternamn</label>
                      <input 
                        type="text" 
                        value={formData.lastName}
                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                        className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 focus:border-[var(--brand-color)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Företag</label>
                    <input 
                      required
                      type="text" 
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                      className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 focus:border-[var(--brand-color)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-post</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 focus:border-[var(--brand-color)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                    <input 
                      required
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full border border-slate-300 bg-white rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 focus:border-[var(--brand-color)]"
                    />
                  </div>
                  
                  {/* Honeypot field (hidden) */}
                  <div className="sr-only" aria-hidden="true">
                    <label>Website</label>
                    <input 
                      type="text" 
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                    />
                  </div>

                  <div className="flex items-start gap-3 mt-4 mb-2">
                    <input 
                      type="checkbox" 
                      id="gdpr"
                      required
                      checked={formData.gdprConsent}
                      onChange={e => setFormData({...formData, gdprConsent: e.target.checked})}
                      className="mt-1 w-4 h-4 text-[var(--brand-color)] bg-white border-slate-300 rounded focus:ring-[var(--brand-color)]"
                    />
                    <label htmlFor="gdpr" className="text-xs text-slate-600 leading-relaxed">
                      Jag godkänner att mina uppgifter lagras för att kunna skicka rapporten och kontakta mig, i enlighet med integritetspolicyn.
                    </label>
                  </div>
                  
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md my-2">
                      {formError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] disabled:opacity-70 text-white font-bold tracking-wider uppercase py-4 px-6 rounded-md shadow-md transition-colors mt-4 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Skickar...
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
                  <CheckCircle2 className="w-8 h-8 text-[#15803d]" />
                </div>
                <h3 className="text-2xl font-condensed font-bold text-slate-800 mb-2 uppercase tracking-tight">Tack!</h3>
                <p className="text-slate-600 mb-6">
                  Din kalkyl är skickad till din e-post.
                </p>
                <a 
                  href={CLIENT_CONFIG.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] text-white font-bold tracking-wider uppercase py-4 px-6 rounded-md shadow-md transition-colors mb-4 block"
                >
                  {CLIENT_CONFIG.ctaLabel}
                </a>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 text-sm font-bold tracking-wider uppercase hover:text-slate-600"
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
