import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import Index from "./pages/Index";
import Login from "./pages/Login";
import OnboardingPage from "./pages/OnboardingPage";
import HistoryPage from "./pages/HistoryPage";
import UploadsPage from "./pages/UploadsPage";
import NewChatPage from "./pages/NewChatPage";
import ChatPage from "./pages/ChatPage";
import ChatHistoryPage from "./pages/ChatHistoryPage";
import PatientReportsPage from "./pages/PatientReportsPage";
import PatientReportDetailPage from "./pages/PatientReportDetailPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/uploads" element={<UploadsPage />} />
          <Route path="/chat/new" element={<NewChatPage />} />
          <Route path="/chat/:chatId" element={<ChatPage />} />
          <Route path="/chat/history" element={<ChatHistoryPage />} />
          <Route path="/reports" element={<PatientReportsPage />} />
          <Route path="/reports/:reportId" element={<PatientReportDetailPage />} />
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/reports" element={<DoctorDashboard view="pending" />} />
          <Route path="/doctor/approved" element={<DoctorDashboard view="approved" />} />
          <Route path="/doctor/search" element={<DoctorDashboard view="search" />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    <Toaster />
    <Sonner />
  </QueryClientProvider>
);

export default App;
