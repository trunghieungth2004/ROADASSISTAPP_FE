import { useEffect, useRef, useState, type PointerEvent } from "react";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DownloadIcon from "@mui/icons-material/Download";
import GitHubIcon from "@mui/icons-material/GitHub";
import LightModeIcon from "@mui/icons-material/LightMode";
import StarIcon from "@mui/icons-material/Star";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  MOBILE_RELEASES_URL,
  MOBILE_REPO_URL,
} from "../config/mobileLinks";
import PhoneMockup, {
  type PhoneStage,
} from "../components/landing/PhoneMockup";
import { useStrings } from "../context/LanguageContext";
import "./landing.css";

const copyFor = (lang: "en" | "vi") =>
  lang === "vi"
    ? {
        navFeatures: "Tính năng",
        navVip: "VIP",
        navDownload: "Tải ứng dụng",
        download: "Tải ứng dụng",
        source: "Mã nguồn",
        seeFeatures: "Xem tính năng",
        eyebrow: "Lộ trình trực tiếp cho thành phố",
        headline: "Đường khó,",
        headlineAccent: "có RoadAssist.",
        heroSub:
          "Lộ trình an toàn cho hẻm nhỏ, cảnh báo trực tiếp và cách di chuyển mượt hơn qua thành phố. Được xây cho đường phố Việt Nam.",
        metaFree: "Miễn phí bắt đầu",
        metaPlatform: "iOS & Android",
        metaPay: "Thanh toán SePay",
        hazardTitle: "Cảnh báo phía trước",
        hazardBody: "Hẻm ngập · 200 m",
        savedTitle: "Lộ trình đã lưu",
        savedBody: "12 phút · an toàn cho hẻm",
        vipTitle: "VIP đang hoạt động",
        vipBody: "Hỗ trợ ưu tiên",
        showcaseEyebrow: "Một ứng dụng, cả hành trình",
        showcaseTitle: "Đi qua thành phố theo cách của bạn.",
        step1Title: "Lộ trình vừa hẻm, vừa xe",
        step1Body:
          "Tìm đường theo loại xe, chiều rộng và điều kiện thực tế — không đẩy bạn vào con hẻm không thể đi.",
        step1a: "Bản đồ hẻm và cầu",
        step1b: "Chiều rộng theo từng loại xe",
        step1c: "Cảnh báo ngập và vật cản",
        step2Title: "Biết trước điều đường đang nói",
        step2Body:
          "Cảnh báo cộng đồng với xác nhận/từ chối theo thời gian thực, để một con hẻm ngập không còn là bất ngờ.",
        step2a: "Báo cáo trực tiếp",
        step2b: "Xác nhận từ người đi đường",
        step2c: "Tự động tránh điểm ùn",
        step3Title: "Nhiều hơn một chút, mỗi ngày",
        step3Body:
          "RoadAssist VIP mở khóa hỗ trợ ưu tiên và đặc quyền 24/7. Thanh toán an toàn bằng SePay.",
        step3a: "Hỗ trợ ưu tiên",
        step3b: "Đặc quyền thành viên",
        step3c: "Kích hoạt ngay sau thanh toán",
        featuresEyebrow: "Được xây cho đường phố",
        featuresTitle: "Mọi thứ bạn cần khi đường không dễ đi.",
        feature1: "Lộ trình an toàn cho hẻm",
        feature1Body: "Đi đúng chiều rộng, đúng loại xe, đúng con đường.",
        feature2: "Radar cảnh báo trực tiếp",
        feature2Body: "Ngập, tai nạn và vật cản từ cộng đồng.",
        feature3: "Lộ trình đã lưu",
        feature3Body: "Những chặng đường quen thuộc, chỉ cách một chạm.",
        feature4: "Hồ sơ phương tiện",
        feature4Body: "Xe máy, cub hay ô tô — lộ trình tự điều chỉnh.",
        feature5: "Thanh toán minh bạch",
        feature5Body: "Hóa đơn từng mục, Cash hoặc SePay.",
        feature6: "Hỗ trợ VIP",
        feature6Body: "Ưu tiên và đặc quyền cho thành viên.",
        vipEyebrow: "RoadAssist VIP",
        vipSectionTitle: "Nhiều hơn một chút, mỗi ngày.",
        vipSectionBody:
          "Chọn gói trong ứng dụng và thanh toán bằng SePay. Trạng thái VIP cập nhật ngay khi khoản thanh toán được ghi nhận.",
        vipPopular: "Phổ biến nhất",
        vipWeek: "Gói Tuần",
        vipMonth: "Gói Tháng",
        vipYear: "Gói Năm",
        vipWeekBody: "Gói cơ bản trong 7 ngày",
        vipMonthBody: "Tiết kiệm 30%, hỗ trợ ưu tiên",
        vipYearBody: "Tiết kiệm nhất, đặc quyền",
        vipCta: "Mua VIP trong ứng dụng",
        finalTitle: "Sẵn sàng khi đường không sẵn lòng.",
        finalBody:
          "Tải RoadAssist cho iOS và Android. Miễn phí bắt đầu — nâng cấp VIP khi bạn cần.",
        finalSource: "Xem mã nguồn trên GitHub",
        footerTag: "Được xây cho người đi đường Việt Nam.",
        footerRights: "© 2026 RoadAssist",
        stageRoute: "Lộ trình",
        stageHazard: "Cảnh báo",
        stageVip: "VIP",
        themeLight: "Chuyển sang chế độ sáng",
        themeDark: "Chuyển sang chế độ tối",
        langSwitch: "Switch to English",
      }
    : {
        navFeatures: "Features",
        navVip: "VIP",
        navDownload: "Download",
        download: "Download the app",
        source: "Source",
        seeFeatures: "See what's inside",
        eyebrow: "Live routing for the city",
        headline: "The road,",
        headlineAccent: "handled.",
        heroSub:
          "Alley-safe routes, live hazard reports, and a smoother way through the city. Built for the streets of Vietnam.",
        metaFree: "Free to start",
        metaPlatform: "iOS & Android",
        metaPay: "SePay checkout",
        hazardTitle: "Hazard ahead",
        hazardBody: "Flooded alley · 200 m",
        savedTitle: "Route saved",
        savedBody: "12 min · alley-safe",
        vipTitle: "VIP active",
        vipBody: "Priority support",
        showcaseEyebrow: "One app, the whole journey",
        showcaseTitle: "Move through the city on your terms.",
        step1Title: "Routes that respect the alley",
        step1Body:
          "Vehicle-aware routing that accounts for width, bridges, and the way you actually ride — not just the shortest line on a map.",
        step1a: "Alley and bridge maps",
        step1b: "Width by vehicle type",
        step1c: "Flood and obstruction warnings",
        step2Title: "See what the road already knows",
        step2Body:
          "Community hazard reports with live confirm/deny voting, so a flooded alley never becomes your surprise.",
        step2a: "Live rider reports",
        step2b: "Confirm / deny consensus",
        step2c: "Routes that adapt around it",
        step3Title: "A little more, every day",
        step3Body:
          "RoadAssist VIP adds priority support and member perks. Pay securely with SePay.",
        step3a: "Priority support",
        step3b: "Member-only perks",
        step3c: "Activates after payment",
        featuresEyebrow: "Built for the street",
        featuresTitle: "Everything you need when the road isn't.",
        feature1: "Alley-safe routing",
        feature1Body: "The right width, the right vehicle, the right road.",
        feature2: "Live hazard radar",
        feature2Body: "Floods, accidents, and obstructions from the community.",
        feature3: "Saved routes",
        feature3Body: "The trips you take most, one tap away.",
        feature4: "Vehicle profiles",
        feature4Body: "Scooter, cub, or car — routing adapts to what you ride.",
        feature5: "Transparent payments",
        feature5Body: "Itemized bills, Cash or SePay.",
        feature6: "VIP support",
        feature6Body: "Priority help and perks for members.",
        vipEyebrow: "RoadAssist VIP",
        vipSectionTitle: "A little more, every day.",
        vipSectionBody:
          "Choose a plan in the app and pay with SePay. Your VIP status updates as soon as the payment lands.",
        vipPopular: "Most popular",
        vipWeek: "Weekly",
        vipMonth: "Monthly",
        vipYear: "Yearly",
        vipWeekBody: "Basic plan for 7 days",
        vipMonthBody: "Save 30%, priority support",
        vipYearBody: "Best value, exclusive perks",
        vipCta: "Get VIP in the app",
        finalTitle: "Ready when the road isn't.",
        finalBody:
          "Download RoadAssist for iOS and Android. Free to start — upgrade to VIP when you need it.",
        finalSource: "View source on GitHub",
        footerTag: "Built for riders in Vietnam.",
        footerRights: "© 2026 RoadAssist",
        stageRoute: "Route",
        stageHazard: "Hazards",
        stageVip: "VIP",
        themeLight: "Switch to light mode",
        themeDark: "Switch to dark mode",
        langSwitch: "Chuyển sang tiếng Việt",
      };

const FEATURE_ICONS = [
  AltRouteIcon,
  WarningAmberIcon,
  BookmarkIcon,
  TwoWheelerIcon,
  CreditCardIcon,
  StarIcon,
];

export default function LandingScreen() {
  const { lang, toggle } = useStrings();
  const copy = copyFor(lang);
  const [stage, setStage] = useState<PhoneStage>("route");
  const [light, setLight] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("roadassist.landing.theme");
      return saved === "light";
    } catch {
      return false;
    }
  });
  const stageRefs = useRef<Array<HTMLElement | null>>([]);

  const toggleTheme = () => {
    setLight((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          "roadassist.landing.theme",
          next ? "light" : "dark",
        );
      } catch {
        return next;
      }
      return next;
    });
  };

  useEffect(() => {
    document.title =
      lang === "vi"
        ? "RoadAssist — Lộ trình an toàn cho thành phố"
        : "RoadAssist — Alley-safe routes for the city";
    document.documentElement.lang = lang;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        lang === "vi"
          ? "Lộ trình an toàn cho hẻm nhỏ, cảnh báo trực tiếp và VIP trong một ứng dụng."
          : "Alley-safe routes, live hazard reports, and VIP in one app.",
      );
    }
  }, [lang]);

  useEffect(() => {
    const nodes = stageRefs.current.filter(
      (node): node is HTMLElement => node !== null,
    );
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const next = entry.target.getAttribute("data-stage");
          if (next === "route" || next === "hazard" || next === "vip") {
            setStage(next);
          }
        });
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
  };

  const resetTilt = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--ry", "0deg");
    event.currentTarget.style.setProperty("--rx", "0deg");
  };

  const steps: Array<{
    id: PhoneStage;
    title: string;
    body: string;
    bullets: string[];
    label: string;
  }> = [
    {
      id: "route",
      title: copy.step1Title,
      body: copy.step1Body,
      bullets: [copy.step1a, copy.step1b, copy.step1c],
      label: copy.stageRoute,
    },
    {
      id: "hazard",
      title: copy.step2Title,
      body: copy.step2Body,
      bullets: [copy.step2a, copy.step2b, copy.step2c],
      label: copy.stageHazard,
    },
    {
      id: "vip",
      title: copy.step3Title,
      body: copy.step3Body,
      bullets: [copy.step3a, copy.step3b, copy.step3c],
      label: copy.stageVip,
    },
  ];

  const features = [
    { title: copy.feature1, body: copy.feature1Body },
    { title: copy.feature2, body: copy.feature2Body },
    { title: copy.feature3, body: copy.feature3Body },
    { title: copy.feature4, body: copy.feature4Body },
    { title: copy.feature5, body: copy.feature5Body },
    { title: copy.feature6, body: copy.feature6Body },
  ];

  const vipPlans = [
    { name: copy.vipWeek, price: "40.000đ", body: copy.vipWeekBody },
    {
      name: copy.vipMonth,
      price: "200.000đ",
      body: copy.vipMonthBody,
      popular: true,
    },
    { name: copy.vipYear, price: "1.500.000đ", body: copy.vipYearBody },
  ];

  return (
    <div className={`landing ${light ? "landing--light" : ""}`} id="top">
      <header className="landing-nav">
        <a className="brand" href="#top" aria-label="RoadAssist">
          <img
            className="brand__mark"
            src={
              light
                ? "/roadassist-mark-light.png"
                : "/roadassist-mark-dark.png"
            }
            alt=""
          />
          <span>RoadAssist</span>
        </a>
        <nav className="landing-nav__links" aria-label="Landing">
          <a href="#features">{copy.navFeatures}</a>
          <a href="#vip">{copy.navVip}</a>
          <a href="#download">{copy.navDownload}</a>
        </nav>
        <div className="landing-nav__actions">
          <button
            type="button"
            className="landing-nav__lang"
            onClick={toggle}
            aria-label={copy.langSwitch}
          >
            {lang === "en" ? "VI" : "EN"}
          </button>
          <button
            type="button"
            className="landing-nav__theme"
            onClick={toggleTheme}
            aria-label={light ? copy.themeDark : copy.themeLight}
          >
            {light ? (
              <DarkModeIcon fontSize="inherit" />
            ) : (
              <LightModeIcon fontSize="inherit" />
            )}
          </button>
          <a
            className="btn btn--primary btn--sm"
            href={MOBILE_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.download}
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__aurora" aria-hidden="true">
            <span className="hero__blob hero__blob--green" />
            <span className="hero__blob hero__blob--teal" />
            <span className="hero__blob hero__blob--amber" />
          </div>
          <div className="hero__grid">
            <div className="hero__copy">
              <span className="eyebrow">
                <span className="eyebrow__dot" />
                {copy.eyebrow}
              </span>
              <h1>
                {copy.headline}
                <br />
                <em>{copy.headlineAccent}</em>
              </h1>
              <p className="hero__sub">{copy.heroSub}</p>
              <div className="hero__actions">
                <a
                  className="btn btn--primary btn--lg"
                  href={MOBILE_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DownloadIcon fontSize="inherit" />
                  {copy.download}
                  <ArrowForwardIcon fontSize="inherit" />
                </a>
                <a className="btn btn--glass btn--lg" href="#features">
                  {copy.seeFeatures}
                </a>
              </div>
              <div className="hero__meta">
                <span>{copy.metaFree}</span>
                <span>{copy.metaPlatform}</span>
                <span>{copy.metaPay}</span>
              </div>
            </div>

            <div
              className="hero__phone"
              onPointerMove={tilt}
              onPointerLeave={resetTilt}
            >
              <PhoneMockup stage="route" />
              <div className="float-card float-card--hazard">
                <span className="float-card__icon float-card__icon--amber">
                  <WarningAmberIcon fontSize="inherit" />
                </span>
                <span>
                  <b>{copy.hazardTitle}</b>
                  <small>{copy.hazardBody}</small>
                </span>
              </div>
              <div className="float-card float-card--saved">
                <span className="float-card__icon float-card__icon--green">
                  <BookmarkIcon fontSize="inherit" />
                </span>
                <span>
                  <b>{copy.savedTitle}</b>
                  <small>{copy.savedBody}</small>
                </span>
              </div>
              <div className="float-card float-card--vip">
                <span className="float-card__icon float-card__icon--amber">
                  <StarIcon fontSize="inherit" />
                </span>
                <span>
                  <b>{copy.vipTitle}</b>
                  <small>{copy.vipBody}</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="showcase" id="features">
          <div className="showcase__intro" data-reveal>
            <span className="eyebrow">{copy.showcaseEyebrow}</span>
            <h2>{copy.showcaseTitle}</h2>
          </div>
          <div className="showcase__grid">
            <div className="showcase__sticky">
              <PhoneMockup stage={stage} />
              <span className="showcase__label">
                {steps.find((step) => step.id === stage)?.label}
              </span>
            </div>
            <div className="showcase__steps">
              {steps.map((step, index) => (
                <article
                  key={step.id}
                  ref={(node) => {
                    stageRefs.current[index] = node;
                  }}
                  data-stage={step.id}
                  className={`showcase__step ${
                    stage === step.id ? "is-active" : ""
                  }`}
                  data-reveal
                >
                  <span className="showcase__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <ul>
                    {step.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="feature-section" id="why">
          <div className="section-head" data-reveal>
            <span className="eyebrow">{copy.featuresEyebrow}</span>
            <h2>{copy.featuresTitle}</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <article
                  className="feature-card glass"
                  key={feature.title}
                  data-reveal
                >
                  <span className="feature-card__icon">
                    <Icon fontSize="inherit" />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="vip-section" id="vip">
          <div className="vip-panel glass" data-reveal>
            <div className="vip-panel__copy">
              <span className="eyebrow">
                <StarIcon fontSize="inherit" />
                {copy.vipEyebrow}
              </span>
              <h2>{copy.vipSectionTitle}</h2>
              <p>{copy.vipSectionBody}</p>
              <a
                className="btn btn--primary btn--lg"
                href={MOBILE_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.vipCta}
                <ArrowForwardIcon fontSize="inherit" />
              </a>
            </div>
            <div className="vip-plans">
              {vipPlans.map((plan) => (
                <div
                  className={`vip-plan ${plan.popular ? "is-popular" : ""}`}
                  key={plan.name}
                >
                  {plan.popular && (
                    <span className="vip-plan__badge">{copy.vipPopular}</span>
                  )}
                  <b>{plan.name}</b>
                  <strong>{plan.price}</strong>
                  <small>{plan.body}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta" id="download">
          <div className="final-cta__card glass" data-reveal>
            <img
              className="final-cta__logo"
              src={
                light
                  ? "/roadassist-logo-light.png"
                  : "/roadassist-logo-dark.png"
              }
              alt="Road Assist"
            />
            <span className="eyebrow">{copy.eyebrow}</span>
            <h2>{copy.finalTitle}</h2>
            <p>{copy.finalBody}</p>
            <div className="final-cta__actions">
              <a
                className="btn btn--primary btn--lg"
                href={MOBILE_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon fontSize="inherit" />
                {copy.download}
              </a>
              <a
                className="btn btn--glass btn--lg"
                href={MOBILE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon fontSize="inherit" />
                {copy.finalSource}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>{copy.footerTag}</span>
        <span className="landing-footer__links">
          <a href={MOBILE_REPO_URL} target="_blank" rel="noopener noreferrer">
            {copy.source}
          </a>
        </span>
        <span>{copy.footerRights}</span>
      </footer>
    </div>
  );
}
