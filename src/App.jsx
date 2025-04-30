import React, { lazy, Suspense, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import {
  Home as HomeIcon,
  Activity,
  DoorOpen,
  User,
  Mic,
  Moon,
} from "lucide-react";
import "./App.css";
import VoiceAssistant from "./pages/VoiceAssistant";
import { LLMProvider } from "./services/llmService";

// Lazy Imports
const HomeComponent = lazy(() => import("./pages/Home"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Usage = lazy(() => import("./pages/Usage"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/Home"));

function App() {
  const [isBlackBg, setIsBlackBg] = useState(false);

  const toggleBackground = () => {
    setIsBlackBg((prev) => !prev); // Toggle background
  };

  return (
    <LLMProvider>
      <div
        className={`h-screen flex flex-col ${
          isBlackBg ? "bg-black text-white" : "bg-white text-gray-900"
        }`}
      >
        {/* Top navigation */}
        <div
          className={`fixed w-full top-0 z-[8888] ${
            isBlackBg ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          } rounded-t-2xl flex justify-between items-center p-1 shadow-lg`}
        >
          <span className="font-extrabold flex justify-between items-center">
            <img src="/nakprc.png" alt="nakprc logo" className="h-[51px]" />
            IOT Systems Labs Home
          </span>
          {/* <button
            onClick={toggleBackground}
            className={`p-2 rounded-full ${
              isBlackBg ? "bg-white text-black" : "bg-[#7000A6] text-white"
            }`}
          >
            <Moon size={20} />
          </button> */}
        </div>

        {/* Main Content Area (Scrollable) */}
        <Main>
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                Loading...
              </div>
            }
          >
            <Routes>
              <Route
                path="/"
                element={
                  <HomeComponent
                    isBlackBg={isBlackBg}
                    toggleBackground={toggleBackground}
                  />
                }
              />
              <Route
                path="/rooms"
                element={
                  <Rooms
                    isBlackBg={isBlackBg}
                    toggleBackground={toggleBackground}
                  />
                }
              />
              <Route
                path="/usage"
                element={
                  <Usage
                    isBlackBg={isBlackBg}
                    toggleBackground={toggleBackground}
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <Profile
                    isBlackBg={isBlackBg}
                    toggleBackground={toggleBackground}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <NotFound
                    isBlackBg={isBlackBg}
                    toggleBackground={toggleBackground}
                  />
                }
              />
            </Routes>
          </Suspense>
        </Main>

        {/* Bottom navigation */}
        <div
          className={`fixed w-full bottom-4 z-[8888] ${
            isBlackBg ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          } rounded-t-2xl flex justify-around p-4 shadow-lg`}
        >
          <NavButton
            to="/"
            icon={<HomeIcon size={20} />}
            label="Home"
            isBlackBg={isBlackBg}
          />
          <NavButton
            to="/rooms"
            icon={<DoorOpen size={20} />}
            label="Rooms"
            isBlackBg={isBlackBg}
          />
          <VoiceAssistant isBlackBg={isBlackBg} label="AI Voice" />
          <div className="w-[70px]"></div>
          <NavButton
            to="/usage"
            icon={<Activity size={20} />}
            label="Usage"
            isBlackBg={isBlackBg}
          />
          <NavButton
            to="/profile"
            icon={<User size={20} />}
            label="Profile"
            isBlackBg={isBlackBg}
          />
        </div>
        <span
          className={`fixed w-full bottom-0 z-[8888] h-0 text-xs ${
            isBlackBg ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          } rounded-t-2xl flex justify-around p-4 shadow-lg`}
        >
          IOT Systems Labs &copy; by iot.nakprc.com
        </span>
      </div>
    </LLMProvider>
  );
}

export default App;

// Main Component for Scrollable Content
function Main({ children }) {
  return (
    <div className="pt-21 flex-grow overflow-y-auto">
      {children}
      <div className="pb-36"></div>
    </div>
  );
}

// NavButton Component
function NavButton({ to, icon, label, isBlackBg }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center ${
          isActive
            ? isBlackBg
              ? "text-blue-400"
              : "text-indigo-600"
            : isBlackBg
            ? "text-gray-400"
            : "text-gray-400"
        }`
      }
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </NavLink>
  );
}
