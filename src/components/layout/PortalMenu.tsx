import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  { label: "HOME", href: "/" },
  { label: "WORK", href: "/work" },
  { label: "ABOUT", href: "/about-me" },
  { label: "CONNECT", href: "mailto:hello@aaronjcunningham.com" },
];

export default function PortalMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      firstLinkRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;

      const focusable = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('button, a[href]'),
      ).filter((element) => element.tabIndex !== -1);
      if (focusable.length === 0) return;

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex === focusable.length - 1
          ? 0
          : currentIndex + 1;

      event.preventDefault();
      focusable[nextIndex].focus();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      className={`portal-menu ${isOpen ? "portal-menu--open" : ""}`}
    >
      <span className="portal-menu__label" aria-hidden="true">
        {isOpen ? "CLOSE" : "MENU"}
      </span>
      <button
        ref={triggerRef}
        className="portal-menu__trigger"
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="portal-menu-overlay"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="portal-menu__trigger-core" />
      </button>

      <div
        id="portal-menu-overlay"
        className="portal-menu__overlay"
        role="dialog"
        aria-modal={isOpen ? "true" : undefined}
        aria-hidden={!isOpen}
        aria-label="Site navigation"
      >
        <nav className="portal-menu__panel" aria-label="Primary navigation">
          <div className="portal-menu__meta" aria-hidden="true">
            <span>{"// NAVIGATION"}</span>
            <span>AARON J. CUNNINGHAM / 2026</span>
          </div>

          <div className="portal-menu__links">
            {menuItems.map((item, index) => {
              const isActive =
                router.pathname === item.href ||
                (item.href.includes("#") && router.asPath === item.href);
              const className = `portal-menu__link ${
                isActive ? "portal-menu__link--active" : ""
              }`;

              return (
                <Link
                  ref={index === 0 ? firstLinkRef : undefined}
                  key={item.href}
                  className={className}
                  href={item.href}
                  tabIndex={isOpen ? undefined : -1}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="portal-menu__index">
                    {`//${String(index + 1).padStart(2, "0")}`}
                  </span>
                  <span className="portal-menu__name">{item.label}</span>
                  <span className="portal-menu__action">
                    <span>
                      {isActive
                        ? "CURRENT"
                        : item.href.startsWith("mailto:")
                          ? "EMAIL"
                          : "OPEN"}
                    </span>
                    <i aria-hidden="true">↗</i>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="portal-menu__footer" aria-hidden="true">
            <span>LEAD FULL-STACK DEVELOPER / CREATIVE TECHNOLOGIST</span>
            <span>BERLIN / REMOTE</span>
          </div>
        </nav>
      </div>
    </div>
  );
}
