import { useState } from "react";
import { Outlet } from "react-router-dom";
import "./App.css";
import { ToastProvider } from "./components/toast/ToastProvider";
import { AuthGate } from "./components/AuthGate";
import { AuthProvider } from "./provider/AuthProvider";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { user, logout } = useAuth();
  const [profileMenuIsOpen, setProfileMenuIsOpen] = useState(false);
  const [optionsMenuIsOpen, setOptionsMenuIsOpen] = useState(false);

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGate>
          <div className="App">
            <div className="header">
              <div className="profile">
                <img src={user?.user_metadata.avatar_url} onClick={() => setProfileMenuIsOpen(!profileMenuIsOpen)}/>
              </div>
              <div className="profile-menu" hidden={!profileMenuIsOpen}>
                <button onClick={logout}>Sign Out</button>
              </div>
              <h1>Kodawari</h1>
              <div className="options">
                <img src="/menu.svg" onClick={() => setOptionsMenuIsOpen(!optionsMenuIsOpen)}/>
              </div>
              <div className="options-menu" hidden={!optionsMenuIsOpen}>
                <button>Unused</button>
                <button>Unused</button>
                <button>Unused</button>
              </div>
            </div>
            <div className="main">
              <Outlet />
            </div>
          </div>
        </AuthGate>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
