import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const menuItems = [
  { label: "HOME", href: "/" },
  { label: "WORK", href: "/work" },
  { label: "CONNECT", href: "/work#contact" },
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
          <div className="portal-menu__links">
            {menuItems.map((item) => {
              const isActive =
                router.pathname === item.href ||
                (item.href.includes("#") && router.asPath === item.href);
              const className = `portal-menu__link ${
                isActive ? "portal-menu__link--active" : ""
              }`;

              return (
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
