import React from 'react';

// The Sidebar is a "dumb" component. It just displays what it's told.
// It receives the active page and a function to change it from its parent (App.jsx).
export function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { id: 'candidates', name: 'Candidates', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { id: 'messages', name: 'Messages', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5714 2.21957C12.203 2.02074 11.797 2.02074 11.4286 2.21957L3.42857 6.71957C3.06017 6.91839 2.85714 7.31143 2.85714 7.73243V16.2676C2.85714 16.6886 3.06017 17.0816 3.42857 17.2804L11.4286 21.7804C11.797 21.9793 12.203 21.9793 12.5714 21.7804L20.5714 17.2804C20.9398 17.0816 21.1429 16.6886 21.1429 16.2676V7.73243C21.1429 7.31143 20.9398 6.91839 20.5714 6.71957L12.5714 2.21957Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 14.25L12 17L7.5 14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 11.5V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 9.5L12 12L7.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>HR Agent</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map(item => (
            <li key={item.id} className={activePage === item.id ? 'active' : ''}>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage(item.id); }}>
                {item.icon}
                <span>{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <ul>
          <li><a href="#"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-4.44a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.36M18 2l4 4M12.22 2h-4.44a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.36L18 2z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg><span>Settings</span></a></li>
        </ul>
      </div>
    </aside>
  );
}