import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import {
  ArrowLeft,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Inbox,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Logo from '../assets/Logo.png';
import inboxShot from '../assets/landing/inbox.png';
import dateShot from '../assets/landing/date-picker.png';
import calendarShot from '../assets/landing/calendar.png';
import googleShot from '../assets/landing/google-calendar.png';
import timeShot from '../assets/landing/time-picker.png';
import reminderShot from '../assets/landing/reminders.png';
import './Landing.css';

const reveal = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0 },
};

const benefits = [
  {
    icon: Inbox,
    title: 'תיבת משימות נקייה',
    text: 'כל מה שעובר בראש נכנס מהר לרשימה אחת, בלי לפתוח עוד חמישה מקומות.',
  },
  {
    icon: CalendarCheck,
    title: 'לוח שנה מחובר',
    text: 'משימות ואירועים חיים ביחד, עם חיבור Google Calendar כשצריך.',
  },
  {
    icon: BellRing,
    title: 'תזכורות בזמן הנכון',
    text: 'זמן, תאריך ותזכורת נשארים צמודים למשימה ולא הולכים לאיבוד.',
  },
  {
    icon: FolderKanban,
    title: 'פרויקטים אישיים',
    text: 'בית, עבודה, סידורים ותמר נשארים מופרדים בלי להרגיש כמו מערכת כבדה.',
  },
];

const storySteps = [
  {
    eyebrow: 'ללכוד',
    title: 'מהראש ישר לתיבת המשימות',
    text: 'המסך הראשון של Vee בנוי בשביל הרגע שבו משהו קופץ לראש. מוסיפים, מסמנים, ממשיכים.',
    image: inboxShot,
    alt: 'תיבת המשימות של Vee עם רשימת משימות בעברית',
    icon: Inbox,
  },
  {
    eyebrow: 'לתזמן',
    title: 'המשימה מקבלת זמן בלי לפתוח יומן חדש',
    text: 'תאריך, שעה ותזכורת נפתחים בדיוק במקום שבו כותבים את המשימה.',
    image: dateShot,
    alt: 'חלון בחירת תאריך במשימה חדשה ב-Vee',
    icon: Clock3,
  },
  {
    eyebrow: 'לראות',
    title: 'היום והחודש נמצאים באותו קצב',
    text: 'כשמשימה עוברת ללוח השנה, היא נשארת חלק מהיום שלך ולא עוד אירוע מנותק.',
    image: calendarShot,
    alt: 'תצוגת לוח שנה חודשית של Vee',
    icon: CalendarCheck,
  },
];

export default function Landing() {
  const scrollerRef = useRef(null);
  const contentRef = useRef(null);
  const heroRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    container: scrollerRef,
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroLift = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -92]);
  const heroFade = useTransform(scrollYProgress, [0, 0.86], [1, 0.46]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 1.08]);

  useEffect(() => {
    const wrapper = scrollerRef.current;
    const content = contentRef.current;

    if (!wrapper || !content || reduceMotion) return undefined;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.08,
      smoothWheel: true,
      lerp: 0.09,
    });

    let frame = 0;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduceMotion]);

  return (
    <div className="landing-page" ref={scrollerRef} dir="rtl">
      <div className="landing-page__content" ref={contentRef}>
        <header className="landing-nav" aria-label="ניווט ראשי">
          <Link className="landing-nav__brand" to="/" aria-label="Vee">
            <img src={Logo} alt="" />
            <span>Vee</span>
          </Link>

          <nav className="landing-nav__links" aria-label="אזורים בעמוד">
            <a href="#flow">איך זה עובד</a>
            <a href="#sync">סנכרון</a>
            <a href="#start">התחלה</a>
          </nav>

          <div className="landing-nav__actions">
            <Link className="landing-link" to="/login">התחברות</Link>
            <Link className="landing-button landing-button--small" to="/login?mode=register">
              להתחיל עכשיו
            </Link>
          </div>
        </header>

        <section className="landing-hero" ref={heroRef}>
          <motion.div
            className="landing-hero__scene"
            style={{ y: heroLift, opacity: heroFade, scale: heroScale }}
            aria-hidden="true"
          >
            <img className="landing-hero__shot landing-hero__shot--inbox" src={inboxShot} alt="" />
            <img className="landing-hero__shot landing-hero__shot--calendar" src={calendarShot} alt="" />
            <img className="landing-hero__shot landing-hero__shot--reminder" src={reminderShot} alt="" />
          </motion.div>

          <div className="landing-hero__shade" />

          <motion.div
            className="landing-hero__copy"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.09 } } }}
          >
            <motion.p className="landing-kicker" variants={reveal}>
              ניהול משימות אישי בעברית, בקצב של היום שלך
            </motion.p>
            <motion.h1 variants={reveal}>המשימות שלך, סוף סוף במקום אחד.</motion.h1>
            <motion.p className="landing-hero__lead" variants={reveal}>
              Vee מחברת תיבת משימות, לוח שנה, תזכורות ופרויקטים אישיים למרחב אחד נקי ומהיר.
            </motion.p>
            <motion.div className="landing-hero__actions" variants={reveal}>
              <Link className="landing-button" to="/login?mode=register">
                להתחיל עכשיו
                <ArrowLeft size={20} />
              </Link>
              <Link className="landing-ghost" to="/login">
                כבר יש לי חשבון
              </Link>
            </motion.div>
          </motion.div>

          <div className="landing-hero__metrics" aria-label="יכולות מרכזיות">
            <span><CheckCircle2 size={18} /> משימות</span>
            <span><CalendarCheck size={18} /> לוח שנה</span>
            <span><BellRing size={18} /> תזכורות</span>
          </div>
        </section>

        <section className="landing-rhythm" aria-label="הבטחת המוצר">
          <motion.div
            className="landing-rhythm__inner"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35, root: scrollerRef }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p variants={reveal}>Vee לא מנסה להפוך אותך למנהל פרויקטים.</motion.p>
            <motion.h2 variants={reveal}>היא פשוט נותנת לכל משימה מקום, זמן והקשר.</motion.h2>
          </motion.div>
        </section>

        <section className="landing-story" id="flow" aria-label="זרימת העבודה ב-Vee">
          {storySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="landing-story__step" key={step.title}>
                <motion.div
                  className="landing-story__copy"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.45, root: scrollerRef }}
                  variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                >
                  <motion.div className="landing-story__eyebrow" variants={reveal}>
                    <Icon size={19} />
                    <span>{step.eyebrow}</span>
                  </motion.div>
                  <motion.h2 variants={reveal}>{step.title}</motion.h2>
                  <motion.p variants={reveal}>{step.text}</motion.p>
                </motion.div>

                <motion.div
                  className={`landing-product-frame landing-product-frame--${index + 1}`}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 64, rotate: reduceMotion ? 0 : -1.5 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true, amount: 0.42, root: scrollerRef }}
                  transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                >
                  <img src={step.image} alt={step.alt} />
                </motion.div>
              </article>
            );
          })}
        </section>

        <section className="landing-detail" id="sync" aria-label="תזמון וסנכרון">
          <div className="landing-detail__copy">
            <p className="landing-kicker">הפרטים הקטנים הם אלה שמחזיקים את היום</p>
            <h2>זמן, תזכורת וסנכרון Google Calendar באותה זרימה.</h2>
            <p>
              במקום לקפוץ בין אפליקציות, Vee משאירה את פעולת התזמון בתוך המשימה עצמה.
            </p>
            <div className="landing-proof-row" aria-label="אמון ואבטחה">
              <span><ShieldCheck size={18} /> פרטי ומאובטח</span>
              <span><Sparkles size={18} /> מסונכרן דו-כיווני</span>
            </div>
          </div>

          <div className="landing-detail__stack" aria-label="מסכי תזמון">
            <motion.img
              src={googleShot}
              alt="מסך חיבור Google Calendar ל-Vee"
              className="landing-detail__image landing-detail__image--google"
              initial={{ opacity: 0, x: reduceMotion ? 0 : 42 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3, root: scrollerRef }}
            />
            <motion.img
              src={timeShot}
              alt="בחירת זמן למשימה ב-Vee"
              className="landing-detail__image landing-detail__image--time"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 38 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.32, root: scrollerRef }}
              transition={{ delay: 0.12 }}
            />
            <motion.img
              src={reminderShot}
              alt="בחירת תזכורת למשימה ב-Vee"
              className="landing-detail__image landing-detail__image--reminder"
              initial={{ opacity: 0, x: reduceMotion ? 0 : -42 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.32, root: scrollerRef }}
              transition={{ delay: 0.2 }}
            />
          </div>
        </section>

        <section className="landing-benefits" aria-label="יתרונות">
          <div className="landing-benefits__header">
            <p className="landing-kicker">פשוט מספיק ליום רגיל</p>
            <h2>בלי רעש. בלי מערכת כבדה. רק סדר אישי שעובד.</h2>
          </div>

          <div className="landing-benefits__grid">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.article
                  className="landing-benefit"
                  key={benefit.title}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.45, root: scrollerRef }}
                >
                  <Icon size={23} />
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="landing-final" id="start">
          <div>
            <p className="landing-kicker">אפשר להתחיל קטן</p>
            <h2>תכניס משימה אחת. Vee כבר תיתן לה מקום ביום שלך.</h2>
          </div>
          <Link className="landing-button" to="/login?mode=register">
            להתחיל עכשיו
            <ArrowLeft size={20} />
          </Link>
        </section>
      </div>
    </div>
  );
}
