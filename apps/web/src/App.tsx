import { useState } from 'react';
import { NavLink, Outlet } from "react-router-dom";
import './App.css';

function App() {
  const active = ({ isActive }: { isActive: boolean }) =>
    isActive ? { textDecoration: "underline" } : undefined;

  const [ isExpanded, setExpanded ] = useState(true);

  const expandCollapseClicked = () => {
    setExpanded(!isExpanded);
  }

  return <div className="App">
    <nav>
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
    </nav>
    <Outlet />
  </div>;
}

export default App;
