import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Capture3D from "./pages/Capture3D";
import ProcessingProgress from "./pages/ProcessingProgress";
import KiriEngineTestPage from "./pages/KiriEngineTestPage";
import SplatViewerTest from "./pages/SplatViewerTest";
import OBJViewerTest from "./pages/OBJViewerTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/capture-3d" element={<Capture3D />} />
          <Route path="/processing" element={<ProcessingProgress />} />
          <Route path="/processing/:taskId" element={<ProcessingProgress />} />
          <Route path="/kiri-test" element={<KiriEngineTestPage />} />
          <Route path="/splat-viewer" element={<SplatViewerTest />} />
          <Route path="/obj-viewer" element={<OBJViewerTest />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
