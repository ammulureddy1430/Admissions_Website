"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  Globe2,
  LockKeyhole,
  School,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PehchaanBrand } from "@/components/pehchaan-brand";

const benefits = [
  { icon: Search, text: "Find and compare trusted schools" },
  { icon: FileCheck2, text: "Simple online application" },
  { icon: CheckCircle2, text: "Track application status" },
  { icon: LockKeyhole, text: "Secure and paperless" },
];

const portals = [
  {
    eyebrow: "For higher education",
    title: "Study Abroad",
    description: "Explore destinations, prepare documents, and organize every step of an overseas education journey.",
    icon: Globe2,
    href: "/login?role=study-abroad&next=/study-abroad",
    action: "Explore study abroad",
  },
  {
    eyebrow: "For families",
    title: "Parent portal",
    description: "Apply to schools, upload documents, pay fees and follow every admission update.",
    icon: GraduationCap,
    href: "/register",
    action: "Explore schools",
  },
  {
    eyebrow: "For institutions",
    title: "School workspace",
    description: "Manage applicants, review documents, coordinate interviews and make decisions.",
    icon: School,
    href: "/login?role=school-admin",
    action: "School login",
  },
  {
    eyebrow: "For administrators",
    title: "Pehchaan Admin",
    description: "Manage schools, users, subscriptions and platform-wide performance securely.",
    icon: ShieldCheck,
    href: "/login?role=super-admin",
    action: "Admin login",
  },
];

const languages = [
  {
    id: "en",
    label: "English",
    kicker: "Admissions made clear",
    headline: "Every admission begins with a",
    brand: "Pehchaan.",
    description: "Discover the right schools, apply online in minutes, and track every step. Schools manage enquiries, documents and offers—all in one place.",
    primary: "Explore schools",
    secondary: "School login",
  },
  {
    id: "hi",
    label: "हिंदी",
    kicker: "प्रवेश प्रक्रिया अब आसान",
    headline: "हर प्रवेश की शुरुआत होती है एक",
    brand: "पहचान से।",
    description: "सही स्कूल खोजें, मिनटों में ऑनलाइन आवेदन करें और हर चरण पर नज़र रखें। स्कूल पूछताछ, दस्तावेज़ और ऑफ़र एक ही जगह प्रबंधित कर सकते हैं।",
    primary: "स्कूल खोजें",
    secondary: "स्कूल लॉगिन",
  },
  {
    id: "te",
    label: "తెలుగు",
    kicker: "అడ్మిషన్లు ఇప్పుడు సులభం",
    headline: "ప్రతి అడ్మిషన్ ఒక",
    brand: "గుర్తింపుతో మొదలవుతుంది.",
    description: "సరైన పాఠశాలను కనుగొనండి, నిమిషాల్లో ఆన్‌లైన్‌లో దరఖాస్తు చేయండి మరియు ప్రతి దశను ట్రాక్ చేయండి.",
    primary: "పాఠశాలలను చూడండి",
    secondary: "పాఠశాల లాగిన్",
  },
  {
    id: "kn",
    label: "ಕನ್ನಡ",
    kicker: "ಪ್ರವೇಶ ಪ್ರಕ್ರಿಯೆ ಈಗ ಸುಲಭ",
    headline: "ಪ್ರತಿ ಪ್ರವೇಶವೂ ಒಂದು",
    brand: "ಗುರುತಿನಿಂದ ಆರಂಭವಾಗುತ್ತದೆ.",
    description: "ಸರಿಯಾದ ಶಾಲೆಯನ್ನು ಹುಡುಕಿ, ನಿಮಿಷಗಳಲ್ಲಿ ಆನ್‌ಲೈನ್ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ ಮತ್ತು ಪ್ರತಿಯೊಂದು ಹಂತವನ್ನು ಗಮನಿಸಿ.",
    primary: "ಶಾಲೆಗಳನ್ನು ಹುಡುಕಿ",
    secondary: "ಶಾಲೆಯ ಲಾಗಿನ್",
  },
  {
    id: "ta",
    label: "தமிழ்",
    kicker: "சேர்க்கை இப்போது எளிது",
    headline: "ஒவ்வொரு சேர்க்கையும் ஒரு",
    brand: "அடையாளத்துடன் தொடங்குகிறது.",
    description: "சரியான பள்ளியைக் கண்டறிந்து, சில நிமிடங்களில் இணையத்தில் விண்ணப்பித்து, ஒவ்வொரு நிலையையும் கண்காணிக்கவும்.",
    primary: "பள்ளிகளைத் தேடுங்கள்",
    secondary: "பள்ளி உள்நுழைவு",
  },
  {
    id: "ml",
    label: "മലയാളം",
    kicker: "പ്രവേശനം ഇനി ലളിതം",
    headline: "ഓരോ പ്രവേശനവും ഒരു",
    brand: "തിരിച്ചറിയലോടെ തുടങ്ങുന്നു.",
    description: "ശരിയായ സ്കൂൾ കണ്ടെത്തുക, മിനിറ്റുകൾക്കുള്ളിൽ ഓൺലൈനായി അപേക്ഷിക്കുക, ഓരോ ഘട്ടവും പിന്തുടരുക.",
    primary: "സ്കൂളുകൾ കണ്ടെത്തുക",
    secondary: "സ്കൂൾ ലോഗിൻ",
  },
] as const;

export default function Home() {
  const [languageId, setLanguageId] = useState<(typeof languages)[number]["id"]>("en");
  const language = languages.find((item) => item.id === languageId) ?? languages[0];

  return (
    <div className="min-h-screen overflow-hidden bg-[#fffefb] text-[#071633]">
      <header className="sticky top-0 z-50 border-b border-[#dbe9e5]/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <PehchaanBrand compact />
          <div className="flex items-center lg:-mr-4">
            <Link href="/login" className="hidden py-2 pl-1 pr-3 text-sm font-semibold text-[#27364d] sm:block">Sign in</Link>
            <Link href="/register" className="brand-button">Get started <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="pehchaan-halo pehchaan-halo--hero" />
          <div className="mx-auto grid min-h-[590px] max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-12">
            <motion.div initial={false}>
              <div className="mb-8 flex flex-wrap gap-2">
                {languages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === languageId ? "language-pill language-pill--active" : "language-pill"}
                    onClick={() => setLanguageId(item.id)}
                    aria-pressed={item.id === languageId}
                    aria-label={`Switch language to ${item.label}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <motion.div key={`${language.id}-copy`} initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
              <span className="section-kicker"><Sparkles className="h-3.5 w-3.5" /> {language.kicker}</span>
              <h1 className="mt-5 max-w-3xl text-[clamp(3rem,6.4vw,5.8rem)] font-black leading-[.95] tracking-[-.065em] text-[#071633]">
                {language.headline} <span className="text-[#008f7d]">{language.brand}</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#526174]">
                {language.description}
              </p>
              </motion.div>
              <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
                {benefits.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm font-medium text-[#33435a]">
                    <Icon className="h-4 w-4 text-[#009b87]" /> {text}
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="brand-button brand-button--large">{language.primary} <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/login?role=school-admin" className="brand-button-outline">{language.secondary} <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-[#7b8998]"><span className="h-2 w-2 rounded-full bg-[#46d9b8]" /> Built for schools and families across India</p>
            </motion.div>

            <motion.div className="relative mx-auto w-full max-w-[550px]" initial={false} animate={{ opacity: 1, x: 0 }}>
              <div className="relative mx-auto w-[235px] sm:w-[265px]">
                <div className="absolute -inset-10 -z-10 rounded-full bg-[#c8f7eb]/60 blur-3xl" />
                <Image src="/pehchaan-id-card.png" alt="Pehchaan student identity and application card" width={591} height={1004} className="relative z-10 h-auto w-full rounded-[24px] shadow-[0_30px_75px_rgba(4,54,48,.18)]" priority unoptimized />
              </div>
              <motion.div className="status-float left-0 top-[18%]" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <CheckCircle2 className="h-5 w-5 text-[#009b87]" /><span><strong>Application submitted</strong><small>17 Jul 2026</small></span>
              </motion.div>
              <motion.div className="status-float right-0 top-[40%]" animate={{ y: [0, 8, 0] }} transition={{ duration: 4.8, repeat: Infinity }}>
                <FileCheck2 className="h-5 w-5 text-[#d79221]" /><span><strong>Under review</strong><small>Class 6 · Current stage</small></span>
              </motion.div>
              <motion.div className="status-float bottom-[5%] left-[2%]" animate={{ y: [0, 7, 0] }} transition={{ duration: 5.2, repeat: Infinity }}>
                <ShieldCheck className="h-5 w-5 text-[#009b87]" /><span><strong>Documents verified</strong><small>Securely reviewed</small></span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section id="portals" className="portal-section py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="section-kicker section-kicker--dark">One platform</span>
              <h2 className="portal-section__title">The right workspace for every role.</h2>
              <p className="portal-section__copy">Choose the Pehchaan portal designed for your part in the admissions journey.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {portals.map(({ icon: Icon, ...portal }) => (
                <motion.article key={portal.title} whileHover={{ y: -6 }} className="portal-card">
                  <div className="portal-card__icon"><Icon className="h-6 w-6" /></div>
                  <div>
                    <span className="portal-card__eyebrow">{portal.eyebrow}</span>
                    <h3 className="portal-card__title">{portal.title}</h3>
                  </div>
                  <p className="portal-card__copy">{portal.description}</p>
                  <Link href={portal.href} className="portal-card__action">{portal.action} <ArrowRight className="h-4 w-4" /></Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-[#dceae6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <PehchaanBrand compact subtitle="Every school. Every child. A clear identity." />
          <p className="text-sm text-[#7a8998]">© 2026 Pehchaan. Made with care in India.</p>
        </div>
      </footer>
    </div>
  );
}
