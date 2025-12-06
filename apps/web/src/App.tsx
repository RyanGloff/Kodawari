import { useState } from 'react';
import { NavLink, Outlet } from "react-router-dom";
import './App.css';
import { ToastProvider } from './components/toast/ToastProvider';

function App() {
  const active = ({ isActive }: { isActive: boolean }) =>
    isActive ? { textDecoration: "underline" } : undefined;

  const [ isExpanded, setExpanded ] = useState(true);
  const navOn = false;

  const expandCollapseClicked = () => {
    setExpanded(!isExpanded);
  }

  return <ToastProvider>
    <div className="App">
      <nav>
        { navOn ? 
          <>
            <div className="nav-header">
              <div className="expander" onClick={expandCollapseClicked}>
                { isExpanded ? '<' : '>' }
              </div>
              <div className="user-view">
                UserView
              </div>
            </div>
            <NavLink to="/" style={active} end>{ isExpanded ? 'Home' : 'H' }</NavLink>
            <NavLink to='/tasks' style={active}>{ isExpanded ? 'Tasks' : 'T' }</NavLink>
          </> : '' }
      </nav>
      <div className="main">
        <Outlet />
      </div>
    </div>
  </ToastProvider>;
}

export default App;
