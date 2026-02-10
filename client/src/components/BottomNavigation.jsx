import React from 'react';
import { NavLink } from 'react-router-dom';
import { useScrollDirection } from '../useScrollDirection';

const BottomNavigation = ({ onSubmit, currentUser, onLogin }) => {
  const scrollDirection = useScrollDirection();

  return (
    <div className={`bottom-nav ${scrollDirection === 'down' ? 'hide' : ''}`}>
      <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span className="material-symbols-outlined">home</span>
      </NavLink>
      <NavLink to="/explore" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span className="material-symbols-outlined">explore</span>
      </NavLink>
      <button className="bottom-nav-item" onClick={onSubmit}>
        <span className="material-symbols-outlined">add_box</span>
      </button>
      <NavLink to="/notifications" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span className="material-symbols-outlined">notifications</span>
      </NavLink>
      <NavLink 
        to={currentUser ? "/profile" : "#"} 
        onClick={(e) => {
          if (!currentUser) {
            e.preventDefault();
            onLogin();
          }
        }}
        className={({ isActive }) => `bottom-nav-item ${isActive && currentUser ? 'active' : ''}`}
      >
        {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="Me" className="bottom-nav-avatar" /> : <span className="material-symbols-outlined">person</span>}
      </NavLink>
    </div>
  );
};

export default BottomNavigation;
