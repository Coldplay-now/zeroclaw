import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { PairingForm } from "@/components/PairingForm";
import { Chat } from "@/components/Chat";
import { Dashboard } from "@/pages/Dashboard";
import { Prompts } from "@/pages/Prompts";
import { Memory } from "@/pages/Memory";
import { Tools } from "@/pages/Tools";
import { Scheduler } from "@/pages/Scheduler";
import { ComingSoon } from "@/pages/ComingSoon";
import "@/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
    },
  },
});

function isAuthenticated(): boolean {
  return !!localStorage.getItem("zeroclaw_token");
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/pair" replace />;
  }
  return <>{children}</>;
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function PairPage() {
  return (
    <PairingForm
      onPaired={(token) => {
        localStorage.setItem("zeroclaw_token", token);
        window.location.href = "/";
      }}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/pair" element={<PairPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route
                      path="/chat"
                      element={
                        <Chat />
                      }
                    />
                    <Route
                      path="/prompts"
                      element={<Prompts />}
                    />
                    <Route path="/memory" element={<Memory />} />
                    <Route path="/tools" element={<Tools />} />
                    <Route
                      path="/skills"
                      element={<ComingSoon page="skills" />}
                    />
                    <Route path="/scheduler" element={<Scheduler />} />
                    <Route
                      path="/audit"
                      element={<ComingSoon page="audit" />}
                    />
                    <Route
                      path="/metrics"
                      element={<ComingSoon page="metrics" />}
                    />
                    <Route
                      path="/channels"
                      element={<ComingSoon page="channels" />}
                    />
                    <Route
                      path="/settings"
                      element={<ComingSoon page="settings" />}
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
