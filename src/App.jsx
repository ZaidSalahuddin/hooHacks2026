import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import ScannerPage from "./pages/ScannerPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<ScannerPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
      <NavBar />
    </BrowserRouter>
  );
}
