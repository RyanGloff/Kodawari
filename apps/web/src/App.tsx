import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./App.css";
import { ToastProvider } from "./components/toast/ToastProvider";
import { supabase } from './utils/supabase';
import { useApiAuth } from './hooks/useApiAuth';

function App() {
  const {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  } = useApiAuth();
  const [profileMenuIsOpen, setProfileMenuIsOpen] = useState(false);
  const [optionsMenuIsOpen, setOptionsMenuIsOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="App">
        <div className="header">
          <div className="profile">
            <img src={isAuthenticated ? user?.user_metadata.avatar_url : '/login.svg'} onClick={() => setProfileMenuIsOpen(!profileMenuIsOpen)}/>
          </div>
          <div className="profile-menu" hidden={!profileMenuIsOpen}>
            {
              isAuthenticated
              ? <button onClick={logout}>Sign Out</button>
              : <button onClick={login}>Sign In</button>
            }
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
    </ToastProvider>
  );
}

export default App;
