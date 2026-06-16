import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const menuItems = [
  { label: "HOME", href: "/" },
  { label: "WORK", href: "/work" },
  { label: "CONTACT", href: "mailto:hello@aaronjcunningham.com" },
];

export default function PortalMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`portal-menu ${isOpen ? "portal-menu--open" : ""}`}>
      <button
        className="portal-menu__trigger"
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="portal-menu__trigger-core" />
      </button>

      <div className="portal-menu__overlay" aria-hidden={!isOpen}>
        <nav className="portal-menu__panel" aria-label="Primary navigation">
          <svg
            className="portal-menu__plate"
            viewBox="0 0 1000 420"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="portal-menu__plate-fill"
              d="M72 28 H314 L350 62 H650 L686 28 H928 L972 72 V166 L946 198 V332 L902 392 H98 L54 348 V242 L28 210 V72 Z"
            />
            <path
              className="portal-menu__plate-line"
              d="M72 28 H314 L350 62 H650 L686 28 H928 L972 72 V166 L946 198 V332 L902 392 H98 L54 348 V242 L28 210 V72 Z"
            />
            <path
              className="portal-menu__plate-detail"
              d="M94 82 H278 M722 82 H906 M94 338 H244 M756 338 H906"
            />
            <path
              className="portal-menu__plate-detail portal-menu__plate-detail--dim"
              d="M112 112 H194 V128 H112 Z M806 112 H888 V128 H806 Z M112 292 H184 V308 H112 Z M816 292 H888 V308 H816 Z"
            />
          </svg>
          <div className="portal-menu__links">
            {menuItems.map((item) => {
              const isExternal = item.href.startsWith("mailto:");
              const isActive = router.pathname === item.href;
              const className = `portal-menu__link ${
                isActive ? "portal-menu__link--active" : ""
              }`;

              return isExternal ? (
                <a
                  key={item.href}
                  className={className}
                  href={item.href}
                  tabIndex={isOpen ? undefined : -1}
                  onClick={() => setIsOpen(false)}
                >
                  <span>{item.label}</span>
                </a>
              ) : (
                <Link
                  key={item.href}
                  className={className}
                  href={item.href}
                  tabIndex={isOpen ? undefined : -1}
                  onClick={() => setIsOpen(false)}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
