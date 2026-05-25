import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Landing from "./pages/Landing";
import { AppShell } from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import SavingsPage from "./pages/SavingsPage";
import ConvertPage from "./pages/ConvertPage";
import PayPage from "./pages/PayPage";
import LearnPage from "./pages/LearnPage";
import ActivityPage from "./pages/ActivityPage";
import SettingsPage from "./pages/SettingsPage";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* MiraBit app */}
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="savings" element={<SavingsPage />} />
          <Route path="convert" element={<ConvertPage />} />
          <Route path="pay" element={<PayPage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
