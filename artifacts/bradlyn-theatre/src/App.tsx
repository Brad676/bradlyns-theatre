import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ToastDisplay } from "@/components/ToastDisplay";
import { Navbar } from "@/components/Navbar";

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
    </div>
  );
}

function WatchRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Watch />
    </Suspense>
  );
}

function RoomWatchRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RoomWatch />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Home /></Suspense>
        </>
      )} />
      <Route path="/search" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Search /></Suspense>
        </>
      )} />
      <Route path="/browse" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Browse /></Suspense>
        </>
      )} />
      <Route path="/detail/:id" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Detail /></Suspense>
        </>
      )} />
      <Route path="/staff/:id" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Staff /></Suspense>
        </>
      )} />
      <Route path="/profile" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Profile /></Suspense>
        </>
      )} />
      <Route path="/profile/list" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Profile /></Suspense>
        </>
      )} />
      <Route path="/profile/settings" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Settings /></Suspense>
        </>
      )} />
      <Route path="/profile/room" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><MyRoom /></Suspense>
        </>
      )} />
      <Route path="/rooms" component={() => (
        <>
          <Navbar />
          <Suspense fallback={<PageLoader />}><Rooms /></Suspense>
        </>
      )} />
      <Route path="/rooms/:id" component={() => (
        <Suspense fallback={<PageLoader />}><RoomWatch /></Suspense>
      )} />
      <Route path="/watch/:id" component={() => (
        <Suspense fallback={<PageLoader />}><Watch /></Suspense>
      )} />
      <Route component={() => (
        <>
          <Navbar />
          <div className="pt-20 text-center text-gray-400">Page not found</div>
        </>
      )} />
    </Switch>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <ToastDisplay />
      </AuthProvider>
    </ToastProvider>
  );
}
