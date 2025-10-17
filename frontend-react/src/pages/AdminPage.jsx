import React, { useState, useEffect, useCallback } from 'react';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';

// Reusable Button Component, defined locally for this page's needs.
const Button = ({ variant = 'primary', children, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary";
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
    };
    return <button className={`${baseClasses} ${variants[variant]}`} {...props}>{children}</button>;
};

export function AdminPage({ apiFetch, showToast }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const usersData = await apiFetch('/api/users');
            setUsers(usersData);
        } catch (error) {
            // Error is handled by the global apiFetch utility
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newUserData = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            password: formData.get('password'),
        };
        try {
            await apiFetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserData),
            });
            setAddUserModalOpen(false);
            fetchData(); // Refresh the user list
        } catch (error) {
            // Error is displayed by global toast
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };
    
    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading User Data...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="p-4 flex justify-between items-center border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">User Management</h2>
                    <Button onClick={() => setAddUserModalOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Add User</span>
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Last Login</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="px-4 py-3 font-semibold text-slate-700">{`${user.first_name} ${user.last_name}`}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                                    <td className="px-4 py-3 text-slate-600">{formatDate(user.last_login)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)}>
                <div className="p-6">
                    <div className="flex justify-between items-start"><h2 className="text-xl font-bold text-slate-800">Add New HR User</h2><button onClick={() => setAddUserModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button></div>
                    <form onSubmit={handleAddUser} className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-slate-600 mb-1 block">First Name *</label><input name="first_name" required className="w-full px-3 py-2 border border-slate-300 rounded-md" /></div>
                            <div><label className="text-sm font-medium text-slate-600 mb-1 block">Last Name *</label><input name="last_name" required className="w-full px-3 py-2 border border-slate-300 rounded-md" /></div>
                        </div>
                        <div><label className="text-sm font-medium text-slate-600 mb-1 block">Email Address *</label><input name="email" type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-md" /></div>
                        <div><label className="text-sm font-medium text-slate-600 mb-1 block">Password *</label><input name="password" type="password" required className="w-full px-3 py-2 border border-slate-300 rounded-md" /></div>
                        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200"><Button type="button" variant="secondary" onClick={() => setAddUserModalOpen(false)}>Cancel</Button><Button type="submit">Create User</Button></div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}