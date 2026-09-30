import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, Bell, BookOpen, ChevronRight, CircleHelp, Database,
  Droplets, FlaskConical, Home, Info, LayoutDashboard, Map, MapPin, Menu,
  Settings2, ShieldCheck, Users, X,
} from 'lucide-react';
import { useLocationData } from './LocationContext.js';
import { StatusBadge } from './components.js';

const navGroups = [
  { label: 'OBSERVE', links: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/location', label: 'Location', icon: MapPin },
    { to: '/environment', label: 'Environment', icon: Droplets },
    { to: '/risk', label: 'Risk assessment', icon: Activity },
    { to: '/map', label: 'Community map', icon: Map },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ] },
  { label: 'PREPARE', links: [
    { to: '/community', label: 'Community reports', icon: Users },
    { to: '/trends', label: 'Trends', icon: Activity },
    { to: '/preparedness', label: 'Preparedness', icon: BookOpen },
    { to: '/emergency', label: 'Emergency guidance', icon: ShieldCheck },
    { to: '/simulation', label: 'Scenario lab', icon: FlaskConical },
  ] },
  { label: 'SYSTEM', links: [
    { to: '/data-quality', label: 'Data quality & sources', icon: Database },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/saved', label: 'Saved places', icon: Home },
    { to: '/settings', label: 'Settings', icon: Settings2 },
    { to: '/privacy', label: 'Privacy center', icon: ShieldCheck },
    { to: '/about', label: 'About AI·FEWS', icon: Info },
  ] },
];

const titles: Record<string, { section: string; title: string }> = {
  '/': { section: 'OBSERVE', title: 'Overview' },
  '/dashboard': { section: 'OBSERVE', title: 'Overview' },
  '/location': { section: 'LOCATION', title: 'Choose an area' },
  '/environment': { section: 'CONDITIONS', title: 'Environment' },
  '/risk': { section: 'DECISION SUPPORT', title: 'Risk assessment' },
  '/alerts': { section: 'MONITORING', title: 'Alerts' },
  '/map': { section: 'COMMUNITY', title: 'Community map' },
  '/community': { section: 'COMMUNITY', title: 'Community reports' },
  '/trends': { section: 'HISTORY', title: 'Trends' },
  '/preparedness': { section: 'SAFETY', title: 'Preparedness' },
  '/emergency': { section: 'SAFETY', title: 'Emergency guidance' },
  '/simulation': { section: 'PLANNING TOOL', title: 'Scenario lab' },
  '/data-quality': { section: 'PROVENANCE', title: 'Data quality & sources' },
  '/notifications': { section: 'PREFERENCES', title: 'Notifications' },
  '/saved': { section: 'YOUR PLACES', title: 'Saved places' },
  '/settings': { section: 'PREFERENCES', title: 'Settings' },
  '/privacy': { section: 'YOUR DATA', title: 'Privacy center' },
  '/about': { section: 'PRODUCT', title: 'About AI·FEWS' },
};

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const pathname = location.pathname;
  return <nav className="nav-groups" aria-label="Primary navigation">
    {navGroups.map((group) => <div className="nav-group" key={group.label}>
      <div className="nav-label">{group.label}</div>
      {group.links.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || (to === '/dashboard' && pathname === '/');
        return <NavLink key={to} to={to} onClick={onNavigate} className={`nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
          {active && <ChevronRight size={14} className="nav-current" aria-hidden="true" />}
        </NavLink>;
      })}
    </div>)}
  </nav>;
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { selected, environment, online, refresh, loading } = useLocationData();
  const title = titles[location.pathname] ?? { section: 'AI·FEWS', title: 'Environmental intelligence' };
  const displayLocation = selected?.name ?? (selected ? `${selected.coordinates.latitude.toFixed(4)}, ${selected.coordinates.longitude.toFixed(4)}` : 'No location selected');

  return <div className="app-frame">
    <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`} aria-label="Application menu">
      <NavLink className="brand" to="/dashboard" onClick={() => setMenuOpen(false)} aria-label="AI·FEWS overview">
        <img src="/aifews-icon.svg" alt="" width="38" height="38" />
        <span><strong>AI·FEWS</strong><small>Environmental intelligence</small></span>
      </NavLink>
      <div className="sidebar-divider" />
      <NavItems onNavigate={() => setMenuOpen(false)} />
      <div className="sidebar-footer">
        <div className="sidebar-location"><span className="tiny-marker" aria-hidden="true" />
          <div><small>ACTIVE AREA</small><strong title={displayLocation}>{displayLocation}</strong></div>
        </div>
        <div className="sidebar-footnote">Decision support · Not an official warning</div>
      </div>
    </aside>

    {menuOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}

    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <button type="button" className="icon-button mobile-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div><span className="topbar-section">{title.section}</span><span className="topbar-page">{title.title}</span></div>
        </div>
        <div className="topbar-actions">
          <span className={`connection-pill${online ? ' online' : ' offline'}`}><span className="status-dot" />{online ? 'ONLINE' : 'OFFLINE'}</span>
          <span className="topbar-location" title={displayLocation}><MapPin size={14} aria-hidden="true" />{displayLocation}</span>
          {environment && <StatusBadge status={environment.status} />}
          <button type="button" className="button button-secondary button-compact topbar-refresh" onClick={() => void refresh()} disabled={!selected || loading}>
            <Activity size={15} aria-hidden="true" />{loading ? 'Updating' : 'Refresh'}</button>
          <button type="button" className="button button-primary button-compact location-cta" onClick={() => navigate('/location')}>
            <MapPin size={15} aria-hidden="true" />Location
          </button>
        </div>
      </header>
      <div className="workspace-main" id="main-content" tabIndex={-1}>
        {children ?? <Outlet />}
      </div>
      <footer className="app-footer"><span>AI·FEWS · ENVIRONMENTAL INTELLIGENCE</span><span>Provider-based decision support · Follow official local guidance</span></footer>
    </div>

    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {[
        { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { to: '/location', label: 'Location', icon: MapPin },
        { to: '/map', label: 'Map', icon: Map },
        { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
      ].map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}>
        <Icon size={18} aria-hidden="true" /><span>{label}</span>
      </NavLink>)}
      <button type="button" className={`mobile-nav-link${mobileMore ? ' is-active' : ''}`} onClick={() => setMobileMore((more) => !more)} aria-expanded={mobileMore}>
        {mobileMore ? <X size={18} /> : <CircleHelp size={18} />}<span>More</span>
      </button>
    </nav>
    {mobileMore && <div className="mobile-more-menu"><NavItems onNavigate={() => setMobileMore(false)} /></div>}
  </div>;
}
