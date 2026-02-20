import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Brain,
  Wrench,
  Puzzle,
  Clock,
  Shield,
  BarChart3,
  Radio,
  Settings,
  LogOut,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  key: string;
  icon: React.ElementType;
  path: string;
  enabled: boolean;
}

const navItems: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, path: "/", enabled: true },
  { key: "chat", icon: MessageSquare, path: "/chat", enabled: true },
  { key: "prompts", icon: FileText, path: "/prompts", enabled: false },
  { key: "memory", icon: Brain, path: "/memory", enabled: false },
  { key: "tools", icon: Wrench, path: "/tools", enabled: false },
  { key: "skills", icon: Puzzle, path: "/skills", enabled: false },
  { key: "scheduler", icon: Clock, path: "/scheduler", enabled: false },
  { key: "audit", icon: Shield, path: "/audit", enabled: false },
  { key: "metrics", icon: BarChart3, path: "/metrics", enabled: false },
  { key: "channels", icon: Radio, path: "/channels", enabled: false },
  { key: "settings", icon: Settings, path: "/settings", enabled: false },
];

export function Sidebar() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const toggleLang = () => {
    const next = i18n.language === "zh" ? "en" : "zh";
    i18n.changeLanguage(next);
    localStorage.setItem("zeroclaw_lang", next);
  };

  const handleLogout = () => {
    localStorage.removeItem("zeroclaw_token");
    navigate("/pair");
  };

  return (
    <aside
      className={`flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight">ZeroClaw</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 px-3 py-2 text-muted-foreground/50 cursor-not-allowed"
                title={t("status.comingSoon")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="text-sm flex items-center gap-2">
                    {t(`nav.${item.key}`)}
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {t("status.comingSoon")}
                    </span>
                  </span>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md mx-1 text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/50"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={toggleLang}
        >
          <Globe className="h-4 w-4" />
          {!collapsed && (
            <span className="text-xs">
              {i18n.language === "zh" ? "EN" : "中文"}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-xs">{t("nav.logout")}</span>}
        </Button>
      </div>
    </aside>
  );
}
