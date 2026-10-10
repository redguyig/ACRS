'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  X,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { LucideIcon } from 'lucide-react';

/* ─── Types ─── */

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeVariant?: 'default' | 'warn' | 'danger';
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  homeHref: string;
  roleLabel: string;
  children: ReactNode;
}

/* ─── Component ─── */

export default function Sidebar({ sections, homeHref, roleLabel, children }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === homeHref) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const avatarClass = () => {
    if (!user) return 'acrs-topbar__avatar';
    switch (user.role) {
      case 'admin': return 'acrs-topbar__avatar acrs-topbar__avatar--admin';
      case 'faculty': return 'acrs-topbar__avatar acrs-topbar__avatar--faculty';
      default: return 'acrs-topbar__avatar acrs-topbar__avatar--student';
    }
  };

  const roleBadgeClass = () => {
    if (!user) return 'acrs-profile-dropdown__role-badge';
    switch (user.role) {
      case 'admin': return 'acrs-profile-dropdown__role-badge acrs-profile-dropdown__role-badge--admin';
      case 'faculty': return 'acrs-profile-dropdown__role-badge acrs-profile-dropdown__role-badge--faculty';
      default: return 'acrs-profile-dropdown__role-badge acrs-profile-dropdown__role-badge--student';
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="acrs-layout">
      {/* ── Top Bar ── */}
      <header className="acrs-topbar">
        <div className="acrs-topbar__left">
          {/* Mobile hamburger */}
          <button
            className="acrs-topbar__mobile-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <PanelLeft size={20} />
          </button>
          <Link href={homeHref} className="acrs-topbar__brand">
            <span className="acrs-topbar__brand-icon">AC</span>
            <span className="acrs-topbar__brand-text">ACRS</span>
          </Link>
        </div>

        {/* Profile (top right) */}
        <div className="acrs-topbar__right" ref={profileRef}>
          <div
            className="acrs-topbar__profile"
            onClick={() => setProfileOpen(!profileOpen)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setProfileOpen(!profileOpen)}
          >
            <div className={avatarClass()}>
              {initials}
            </div>
            <div className="acrs-topbar__profile-info">
              <span className="acrs-topbar__profile-name">{user?.name || 'Loading...'}</span>
              <span className="acrs-topbar__profile-role">{roleLabel}</span>
            </div>
            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
              }}
            />
          </div>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="acrs-topbar__dropdown">
              <div className="acrs-profile-dropdown__header">
                <div className="acrs-profile-dropdown__name">{user?.name}</div>
                <div className="acrs-profile-dropdown__email">{user?.email}</div>
                <div className={roleBadgeClass()}>
                  {user?.role === 'admin' ? '🛡 Admin' :
                   user?.role === 'faculty' ? '👨‍🏫 Faculty' :
                   '🎓 Student'}
                </div>
              </div>
              <div className="acrs-profile-dropdown__divider" />
              <button
                className="acrs-profile-dropdown__item acrs-profile-dropdown__item--danger"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile Overlay ── */}
      <div
        className={`acrs-sidebar-overlay ${mobileOpen ? 'acrs-sidebar-overlay--visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Sidebar (auto-hide, shows on hover) ── */}
      <aside
        className={`acrs-sidebar ${sidebarHovered ? 'acrs-sidebar--expanded' : ''} ${mobileOpen ? 'acrs-sidebar--mobile-open' : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Mobile close */}
        <button
          className="acrs-sidebar__mobile-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          style={{ display: mobileOpen ? 'flex' : 'none' }}
        >
          <X size={18} />
        </button>

        {/* Logo strip */}
        <div className="acrs-sidebar__logo">
          <div className="acrs-sidebar__logo-icon">AC</div>
          <div className="acrs-sidebar__logo-text-wrap">
            <div className="acrs-sidebar__logo-text">ACRS</div>
            <div className="acrs-sidebar__logo-sub">Code Review System</div>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="acrs-sidebar__nav">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="acrs-sidebar__section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`acrs-sidebar__nav-item ${active ? 'acrs-sidebar__nav-item--active' : ''}`}
                    title={item.name}
                  >
                    <Icon className="acrs-sidebar__nav-item-icon" size={20} />
                    <span className="acrs-sidebar__nav-label">{item.name}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`acrs-sidebar__nav-badge ${
                          item.badgeVariant === 'warn'
                            ? 'acrs-sidebar__nav-badge--warn'
                            : item.badgeVariant === 'danger'
                            ? 'acrs-sidebar__nav-badge--danger'
                            : ''
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="acrs-main">
        <div className="acrs-main__content">
          {children}
        </div>
      </main>
    </div>
  );
}
