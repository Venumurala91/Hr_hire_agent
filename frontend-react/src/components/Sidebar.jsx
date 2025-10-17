import React, { useState, useEffect } from 'react';

const Logo = () => ( <a href="#" className="flex items-center gap-3 text-xl font-bold text-slate-800 px-2 h-10 shrink-0"> <img src="/logo-icon.png" alt="Logo" className="w-7 h-7" /> <span className="opacity-100 transition-opacity duration-200">Asset Telematics</span> </a> );
const LogoIcon = () => ( <a href="#" className="flex items-center justify-center h-10 shrink-0"> <img src="/logo-icon.png" alt="Logo" className="w-7 h-7" /> </a> );

const SidebarLink = ({ link, activePage, setActivePage, isClosed }) => {
    const isActive = activePage === link.id;
    return (
        <a href="#" onClick={(e) => { e.preventDefault(); setActivePage(link.id); }} className={`flex items-center gap-3 py-2.5 rounded-md font-semibold transition-all duration-200 border-l-4 ${isClosed ? 'px-3 justify-center' : 'px-4'} ${isActive ? 'bg-primary-light text-primary-dark border-primary' : 'text-slate-500 border-transparent hover:bg-primary-light hover:text-primary-dark'}`}>
            <span className="shrink-0">{link.icon}</span>
            <span className={`whitespace-nowrap transition-all duration-200 ${isClosed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>{link.label}</span>
        </a>
    );
};

// UPDATED: Now accepts an onLogout prop
export function Sidebar({ activePage, setActivePage, onLogout }) {
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => { const handleResize = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);

    const mainLinks = [
        { id: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
        { id: 'candidates', label: 'Candidates', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
        { id: 'messages', label: 'Messages', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
        // NEW: Admin link, visible to all logged-in users
        { id: 'admin', label: 'User Management', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg> }
    ];

    const sidebarContent = (
        <div className="flex flex-col justify-between h-full">
            <div>
                {open ? <Logo /> : <LogoIcon />}
                <nav className="mt-8 flex flex-col gap-1">
                    {mainLinks.map((link) => ( <SidebarLink key={link.id} link={link} activePage={activePage} setActivePage={setActivePage} isClosed={!open} /> ))}
                </nav>
            </div>
            <div className="border-t border-slate-200 pt-4">
                 {/* NEW: Logout Button */}
                 <a href="#" onClick={onLogout} className={`flex items-center gap-3 py-2.5 rounded-md font-semibold transition-colors duration-200 border-l-4 border-transparent text-slate-500 hover:bg-red-50 hover:text-red-600 ${!open ? 'px-3 justify-center' : 'px-4'}`}>
                    <span className="shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
                    <span className={`whitespace-nowrap transition-all duration-200 ${!open ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Logout</span>
                </a>
            </div>
        </div>
    );
    
    if (isMobile) {
        return ( <> <header className="flex md:hidden items-center justify-between p-4 bg-white border-b border-slate-200"> <Logo /> <button className="p-2" onClick={() => setOpen(true)}> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg> </button> </header> <div className={`fixed inset-0 bg-black/40 z-40 transition-opacity md:hidden ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)}></div> <div className={`fixed inset-y-0 left-0 w-72 bg-white z-50 p-6 transition-transform md:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}> <button className="absolute top-5 right-5 p-2" onClick={() => setOpen(false)}> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> </button> {sidebarContent} </div> </> );
    }

    return ( <aside className={`hidden md:block bg-white border-r border-slate-200 p-4 transition-all duration-300 ease-in-out ${open ? 'w-64' : 'w-20'}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}> {sidebarContent} </aside> );
}