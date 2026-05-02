import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ToastDisplay } from "@/components/ToastDisplay";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useAuth } from "@/context/AuthContext";
import { useWelcomeVoice } from "@/hooks/useWelcomeVoice";

const Home = lazy(() => import("@/pages/Home"));
const Search = lazy(() => import("@/pages/Search"));
const Browse = lazy(() => import("@/pages/Browse"));
const Detail = lazy(() => import("@/pages/Detail"));
const Watch = lazy(() => import("@/pages/Watch"));
const Staff = lazy(() => import("@/pages/Staff"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const MyRoom = lazy(() => import("@/pages/MyRoom"));
const Rooms = lazy(() => import("@/pages/Rooms"));
const RoomWatch = lazy(() => import("@/pages/RoomWatch"));
const AuthGate = lazy(() => import("@/pages/AuthGate"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
    </div>
  );
}

function WithLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <Sidebar />
      <div className="pl-16">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
        <Footer />
      </div>
    </>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={() => <WithLayout><Home /></WithLayout>} />
      <Route path="/search" component={() => <WithLayout><Search /></WithLayout>} />
      <Route path="/browse" component={() => <WithLayout><Browse /></WithLayout>} />
      <Route path="/detail/:id" component={() => <WithLayout><Detail /></WithLayout>} />
      <Route path="/staff/:id" component={() => <WithLayout><Staff /></WithLayout>} />
      <Route path="/profile" component={() => <WithLayout><Profile /></WithLayout>} />
      <Route path="/profile/list" component={() => <WithLayout><Profile /></WithLayout>} />
      <Route path="/profile/settings" component={() => <WithLayout><Settings /></WithLayout>} />
      <Route path="/profile/room" component={() => <WithLayout><MyRoom /></WithLayout>} />
      <Route path="/rooms" component={() => <WithLayout><Rooms /></WithLayout>} />
      <Route path="/rooms/:id" component={() => (
        <Suspense fallback={<PageLoader />}><RoomWatch /></Suspense>
      )} />
      <Route path="/watch/:id" component={() => (
        <Suspense fallback={<PageLoader />}><Watch /></Suspense>
      )} />
      <Route component={() => (
        <WithLayout>
          <div className="pt-20 min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl mb-4">🎭</p>
              <h2 className="text-white text-2xl font-bold mb-2">Page not found</h2>
              <p className="text-gray-400 text-sm">This page doesn't exist.</p>
            </div>
          </div>
        </WithLayout>
      )} />
    </Switch>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  useWelcomeVoice(!!user && !loading);

  if (loading) return <PageLoader />;

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthGate />
      </Suspense>
    );
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppRouter />
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <ToastDisplay />
        <InstallPrompt />
      </AuthProvider>
    </ToastProvider>
  );
}
