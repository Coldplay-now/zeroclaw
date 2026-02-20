import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import i18n from "@/i18n";

function renderSidebar(initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    // 重置语言为英文
    i18n.changeLanguage("en");
    try {
      localStorage.removeItem("zeroclaw_token");
      localStorage.removeItem("zeroclaw_lang");
    } catch {
      // localStorage 可能在 jsdom 早期不可用
    }
  });

  it("渲染 ZeroClaw 标题", () => {
    renderSidebar();
    expect(screen.getByText("ZeroClaw")).toBeInTheDocument();
  });

  it("渲染已启用的导航链接", () => {
    renderSidebar();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("渲染禁用的导航项（Coming Soon）", () => {
    renderSidebar();
    // 应该有多个 "Coming Soon" 标签
    const badges = screen.getAllByText("Coming Soon");
    expect(badges.length).toBeGreaterThanOrEqual(5);
  });

  it("折叠/展开侧边栏", async () => {
    const user = userEvent.setup();
    renderSidebar();
    // 初始状态 — 标题可见
    expect(screen.getByText("ZeroClaw")).toBeInTheDocument();
    // 找到所有 ghost 按钮中的折叠按钮（侧边栏头部的第一个按钮）
    const buttons = screen.getAllByRole("button");
    // 折叠按钮是头部区域的按钮
    const collapseBtn = buttons[0];
    await user.click(collapseBtn);
    // 折叠后标题隐藏
    expect(screen.queryByText("ZeroClaw")).not.toBeInTheDocument();
  });

  it("语言切换按钮", async () => {
    const user = userEvent.setup();
    renderSidebar();
    // 默认英文 — 按钮显示中文切换选项
    const langBtn = screen.getByText("中文");
    expect(langBtn).toBeInTheDocument();
    // 点击切换
    await user.click(langBtn);
    // 切换到中文后，按钮显示 EN
    expect(await screen.findByText("EN")).toBeInTheDocument();
  });

  it("退出按钮", () => {
    renderSidebar();
    const logoutBtn = screen.getByText("Logout");
    expect(logoutBtn).toBeInTheDocument();
  });
});
