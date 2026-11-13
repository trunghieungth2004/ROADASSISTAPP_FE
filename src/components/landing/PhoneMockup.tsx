import type {ReactElement} from "react";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import RouteIcon from "@mui/icons-material/Route";
import SettingsIcon from "@mui/icons-material/Settings";
import StarIcon from "@mui/icons-material/Star";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export type PhoneStage = "route" | "hazard" | "vip";

const MapArt = () => (
  <svg
    className="map-art"
    viewBox="0 0 360 640"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <rect width="360" height="640" fill="#eef3e8" />
    <path
      d="M-30 100 C 60 70, 120 150, 200 120 S 320 80, 400 110"
      fill="none"
      stroke="#f6c453"
      strokeWidth="7"
    />
    <path
      d="M-20 260 C 70 230, 140 310, 230 270 S 330 240, 400 280"
      fill="none"
      stroke="#f6c453"
      strokeWidth="5"
    />
    <path
      d="M-30 460 C 80 420, 150 500, 250 450 S 340 430, 400 470"
      fill="none"
      stroke="#f6c453"
      strokeWidth="8"
    />
    <path
      d="M40 -20 C 60 100, 30 210, 80 330 S 120 500, 100 660"
      fill="none"
      stroke="#ffffff"
      strokeWidth="10"
    />
    <path
      d="M220 -20 C 200 120, 260 220, 230 340 S 200 520, 250 660"
      fill="none"
      stroke="#ffffff"
      strokeWidth="8"
    />
    <path
      d="M-20 380 C 80 350, 120 420, 210 380 S 320 350, 400 390"
      fill="none"
      stroke="#9ed3ee"
      strokeWidth="22"
      opacity="0.9"
    />
    <path
      d="M-20 560 C 90 530, 160 590, 260 550 S 340 530, 400 570"
      fill="none"
      stroke="#cfe4d2"
      strokeWidth="30"
      opacity="0.7"
    />
    <path
      d="M70 210 L 280 200"
      fill="none"
      stroke="#16a34a"
      strokeWidth="3"
      strokeDasharray="3 9"
      strokeLinecap="round"
    />
    <circle cx="70" cy="210" r="5" fill="#16a34a" />
    <circle cx="280" cy="200" r="5" fill="#dc2626" />
    <text x="34" y="180" fill="#94a3b8" fontSize="9" fontWeight="700">
      BÌNH THẠNH
    </text>
    <text x="214" y="300" fill="#94a3b8" fontSize="9" fontWeight="700">
      THỦ ĐỨC
    </text>
  </svg>
);

const StatusBar = () => (
  <div className="mock__status">
    <span>9:41</span>
    <span className="mock__status-icons">●●●</span>
  </div>
);

const MapControls = () => (
  <div className="mock__top-controls">
    <span className="mock__round">
      <NotificationsNoneIcon fontSize="inherit" />
    </span>
    <span className="mock__round">
      <SettingsIcon fontSize="inherit" />
    </span>
  </div>
);

const MapPins = ({ hotspot = false }: { hotspot?: boolean }) => (
  <>
    <span className="mock__pin mock__pin--a">A</span>
    <span className="mock__pin mock__pin--b">B</span>
    {hotspot && (
      <span className="mock__hazard-pin">
        <WarningAmberIcon fontSize="inherit" />
      </span>
    )}
  </>
);

const Tabs = ({ active }: { active: string }) => (
  <div className="mock__tabs">
    {[
      { id: "route", label: "Route", icon: <RouteIcon fontSize="inherit" /> },
      {
        id: "hazard",
        label: "Hazards",
        icon: <WarningAmberIcon fontSize="inherit" />,
      },
      {
        id: "vehicle",
        label: "Vehicle",
        icon: <TwoWheelerIcon fontSize="inherit" />,
      },
      { id: "more", label: "More", icon: <MoreHorizIcon fontSize="inherit" /> },
    ].map((tab) => (
      <span
        key={tab.id}
        className={`mock__tab ${active === tab.id ? "is-active" : ""}`}
      >
        {tab.icon}
        {tab.label}
      </span>
    ))}
  </div>
);

const RouteScreen = () => (
  <div className="mock mock--route">
    <StatusBar />
    <div className="mock__map">
      <MapArt />
      <MapControls />
      <MapPins />
      <span className="mock__locate">
        <MyLocationIcon fontSize="inherit" />
      </span>
    </div>
    <div className="mock__sheet">
      <div className="mock__chips">
        <span className="mock__chip is-active">Walk</span>
        <span className="mock__chip">Bike</span>
        <span className="mock__chip">Car</span>
        <span className="mock__chip">Tune</span>
      </div>
      <div className="mock__field-row">
        <span className="mock__field">My location</span>
        <span className="mock__swap">
          <SwapVertIcon fontSize="inherit" />
        </span>
        <span className="mock__field">FPT University</span>
      </div>
      <div className="mock__actions-row">
        <span className="mock__add">
          <AddIcon fontSize="inherit" />
        </span>
        <span className="mock__vehicle-pill">
          <TwoWheelerIcon fontSize="inherit" /> Scooter
        </span>
      </div>
      <span className="mock__btn">Find route</span>
      <div className="mock__recent">
        <div className="mock__recent-row">
          <RouteIcon fontSize="inherit" />
          <span>FPT University</span>
          <small>Recent</small>
        </div>
        <div className="mock__recent-row">
          <StarIcon fontSize="inherit" />
          <span>Home</span>
          <small>Saved</small>
        </div>
      </div>
    </div>
    <Tabs active="route" />
  </div>
);

const HazardScreen = () => (
  <div className="mock mock--hazard">
    <StatusBar />
    <div className="mock__map">
      <MapArt />
      <MapControls />
      <MapPins hotspot />
    </div>
    <div className="mock__sheet">
      <div className="mock__sheet-head">
        <b>Hazards nearby</b>
        <span>2 km</span>
      </div>
      <div className="mock__hazard-row">
        <span className="mock__dot mock__dot--flood" />
        <span className="mock__hazard-copy">
          <b>Flooded alley</b>
          <small>200 m · 12 votes</small>
        </span>
        <span className="mock__confirm">
          <CheckCircleIcon fontSize="inherit" />
        </span>
      </div>
      <div className="mock__hazard-row">
        <span className="mock__dot mock__dot--accident" />
        <span className="mock__hazard-copy">
          <b>Accident</b>
          <small>650 m · 8 votes</small>
        </span>
        <span className="mock__confirm">
          <CheckCircleIcon fontSize="inherit" />
        </span>
      </div>
      <div className="mock__hazard-row">
        <span className="mock__dot mock__dot--block" />
        <span className="mock__hazard-copy">
          <b>Road obstruction</b>
          <small>1.1 km · 5 votes</small>
        </span>
        <span className="mock__confirm">
          <CheckCircleIcon fontSize="inherit" />
        </span>
      </div>
    </div>
    <Tabs active="hazard" />
  </div>
);

const VipScreen = () => (
  <div className="mock mock--vip">
    <StatusBar />
    <div className="vip-mock">
      <span className="vip-mock__star">
        <StarIcon fontSize="inherit" />
      </span>
      <b className="vip-mock__title">RoadAssist VIP</b>
      <span className="vip-mock__sub">Member perks, every day</span>
      <div className="vip-mock__plan">
        <span>Weekly</span>
        <b>40.000đ</b>
      </div>
      <div className="vip-mock__plan is-popular">
        <span>Monthly · most popular</span>
        <b>200.000đ</b>
      </div>
      <div className="vip-mock__plan">
        <span>Yearly</span>
        <b>1.500.000đ</b>
      </div>
      <span className="vip-mock__btn">Subscribe with SePay</span>
      <small className="vip-mock__note">Secure checkout · activate instantly</small>
    </div>
  </div>
);

const SCREENS: Record<PhoneStage, () => ReactElement> = {
  route: RouteScreen,
  hazard: HazardScreen,
  vip: VipScreen,
};

export default function PhoneMockup({
  stage,
  className = "",
}: {
  stage: PhoneStage;
  className?: string;
}) {
  const Screen = SCREENS[stage];
  return (
    <div className={`phone ${className}`} aria-hidden="true">
      <div className="phone__glow" />
      <div className="phone__frame">
        <div className="phone__screen" key={stage}>
          <Screen />
          <span className="phone__island" />
        </div>
      </div>
      <span className="phone__reflection" />
    </div>
  );
}
