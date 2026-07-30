import { BrowserRouter, Link, Navigate, Routes, Route, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import GameDetail from "@/pages/GameDetail";
import CreatorProfile from "@/pages/CreatorProfile";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import CreateGame from "@/pages/CreateGame";
import CreatorConsole from "@/pages/CreatorConsole";
import Clips from "@/pages/Clips";
import ClipDetail from "@/pages/ClipDetail";
import Communities from "@/pages/Communities";
import CommunityDetail from "@/pages/CommunityDetail";
import CommunityModeration from "@/pages/CommunityModeration";
import Settings from "@/pages/Settings";
import TagPage from "@/pages/TagPage";
import Search from "@/pages/Search";
import Forge from "@/pages/Forge";
import Feed from "@/pages/Feed";
import News from "@/pages/News";
import NewsArticle from "@/pages/NewsArticle";
import Creators from "@/pages/Creators";
import Legal from "@/pages/Legal";
import Admin from "@/pages/Admin";
import Activity from "@/pages/Activity";
import Leaderboards from "@/pages/Leaderboards";
import { Toaster } from "sonner";
import "@/App.css";

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center" data-testid="not-found">
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">404</div>
      <h1 className="text-4xl font-bold uppercase text-white mt-2 tracking-tight">
        Off the grid
      </h1>
      <p className="text-[#A1A1AA] mt-4">That page doesn&apos;t exist.</p>
      <div className="mt-6 flex justify-center gap-2 flex-wrap">
        <Link to="/games" className="btn-primary">Browse games</Link>
        <Link to="/" className="btn-secondary">Go home</Link>
      </div>
    </div>
  );
}

function CommunityAlias() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/communities/${slug}` : "/communities"} replace />;
}

function SafetyAlias() {
  const { topic } = useParams();
  const map = { dmca: "dmca", privacy: "privacy", terms: "terms", ratings: "content" };
  return <Navigate to={`/legal/${map[topic] || "terms"}`} replace />;
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/games" element={<Browse />} />
              <Route path="/games/browser" element={<Browse />} />
              <Route path="/games/:slug" element={<GameDetail />} />
              <Route path="/games/:slug/play" element={<GameDetail />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/leaderboards" element={<Leaderboards />} />
              <Route path="/tags/:tag" element={<TagPage />} />
              <Route path="/search" element={<Search />} />
              <Route path="/signup" element={<Navigate to="/onboarding" replace />} />
              <Route path="/dashboard" element={<Navigate to="/feed" replace />} />
              <Route path="/studio" element={<Navigate to="/create" replace />} />
              <Route path="/forge" element={<Navigate to="/create" replace />} />
              <Route path="/forge/:slug" element={<Forge />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<NewsArticle />} />
              <Route path="/creators" element={<Creators />} />
              <Route path="/creators/:username" element={<CreatorProfile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/create" element={<CreateGame />} />
              <Route path="/console" element={<CreatorConsole />} />
              <Route path="/console/:slug" element={<CreatorConsole />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/clips" element={<Clips />} />
              <Route path="/clips/:idslug" element={<ClipDetail />} />
              <Route path="/community" element={<CommunityAlias />} />
              <Route path="/community/:slug" element={<CommunityAlias />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/communities/:slug" element={<CommunityDetail />} />
              <Route path="/communities/:slug/moderate" element={<CommunityModeration />} />
              <Route path="/safety" element={<SafetyAlias />} />
              <Route path="/safety/:topic" element={<SafetyAlias />} />
              <Route path="/legal/:topic" element={<Legal />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          <Toaster
            theme="dark"
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              style: { borderRadius: 0, borderColor: "#27272A", background: "#080808" },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}
