
import React, { useState, useEffect, useCallback } from 'react';
import { User, Role, AuditLog } from '../types';
import { 
    getAllAdmins,
    grantAdminPermission,
    deleteAdminAndInstitution,
    getAuditLogs
} from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import { useAuth } from '../context/AuthContext';

const TrashIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;
const BuildingIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const ShieldIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const TimelineIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-3 w-3"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
    <div className={`p-6 rounded-xl border shadow-sm flex items-center justify-between transition-all hover:scale-[1.02] ${colorClass}`}>
        <div>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-black mt-2">{value}</p>
        </div>
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            {icon}
        </div>
    </div>
);

const SuperAdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [admins, setAdmins] = useState<User[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'institutes' | 'audit'>('institutes');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [adminList, auditLogs] = await Promise.all([
                getAllAdmins(),
                getAuditLogs('') // Empty string for Super Admin to see all
            ]);
            setAdmins(adminList);
            setLogs(auditLogs);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            alert("Error loading system data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGrantAccess = async (adminId: string, instName: string) => {
        if (window.confirm(`Grant administrator access to "${instName}"? This will allow the admin to log in and manage their institution.`)) {
            setIsLoading(true);
            try {
                const result = await grantAdminPermission(adminId);
                if (result) {
                    alert(`SUCCESS: Access granted for "${instName}".`);
                    await fetchData();
                } else {
                    alert("ERROR: Admin record not found.");
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Grant Access Error:", error);
                alert("An unexpected error occurred while granting access.");
                setIsLoading(false);
            }
        }
    };

    const handleDeleteInstitution = async (adminId: string, instName: string) => {
        const confirmMsg = `CRITICAL WARNING: You are about to permanently delete "${instName}". 
This will wipe all associated data:
- Admin account
- All Teacher accounts
- All Student sessions
- All Exam schedules
- All Hall layouts
- All Audit logs

THIS ACTION CANNOT BE UNDONE. Type 'DELETE' to proceed.`;
        
        const input = window.prompt(confirmMsg);
        if (input === 'DELETE') {
            setIsLoading(true);
            try {
                const success = await deleteAdminAndInstitution(adminId);
                if (success) {
                    alert(`SUCCESS: Institution "${instName}" and all associated data wiped.`);
                    await fetchData();
                } else {
                    alert("ERROR: Failed to delete institution.");
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Delete Institution Error:", error);
                alert("An error occurred during the data wipe process.");
                setIsLoading(false);
            }
        } else if (input !== null) {
            alert("Action cancelled. Input did not match 'DELETE'.");
        }
    };

    const filteredAdmins = admins.filter(a => 
        a.institutionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingAdmins = admins.filter(a => !a.permissionGranted);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Header />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">Command Center</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Global management of institutional infrastructures.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    <StatCard 
                        title="Institutions" 
                        value={admins.length} 
                        icon={<BuildingIcon className="h-6 w-6 text-violet-600 dark:text-violet-300" />}
                        colorClass="bg-violet-50 border-violet-100 text-violet-900 dark:bg-violet-900/20 dark:border-violet-900/50 dark:text-violet-100"
                    />
                    <StatCard 
                        title="Pending Requests" 
                        value={pendingAdmins.length} 
                        icon={<ShieldIcon className="h-6 w-6 text-amber-600 dark:text-amber-300" />}
                        colorClass="bg-amber-50 border-amber-100 text-amber-900 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-100"
                    />
                    <StatCard 
                        title="System Uptime" 
                        value="99.9%" 
                        icon={<TimelineIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />}
                        colorClass="bg-emerald-50 border-emerald-100 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-100"
                    />
                </div>

                <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('institutes')}
                            className={`py-4 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'institutes' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Institute Directory
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`py-4 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'audit' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Global Audit Logs
                        </button>
                    </nav>
                </div>

                {activeTab === 'institutes' && (
                    <div className="space-y-8">
                        {pendingAdmins.length > 0 && (
                            <div className="bg-amber-100/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                                <h3 className="text-lg font-black text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                                    <ShieldIcon className="h-5 w-5" /> Urgent: Pending Approvals
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pendingAdmins.map(admin => (
                                        <Card key={admin.id} className="!p-5 border-amber-200 shadow-sm transition-all hover:shadow-md">
                                            <div className="mb-4">
                                                <p className="font-black text-slate-800 dark:text-slate-100 text-lg">{admin.institutionName}</p>
                                                <p className="text-sm font-medium text-slate-500 mt-1">Admin: {admin.name}</p>
                                                <p className="text-xs text-slate-400 font-mono mt-1 truncate">{admin.email}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm" 
                                                    className="flex-1 !bg-emerald-600 hover:!bg-emerald-700 !text-white" 
                                                    onClick={() => handleGrantAccess(admin.id, admin.institutionName || 'Unknown') } 
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? 'Wait...' : 'Approve Access'}
                                                </Button>
                                                <button 
                                                    onClick={() => handleDeleteInstitution(admin.id, admin.institutionName!)} 
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                    title="Reject & Delete"
                                                    disabled={isLoading}
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Card>
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Managed Institutions</h3>
                                <div className="relative w-full sm:w-72">
                                    <Input 
                                        placeholder="Search directory..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        containerClassName="mb-0"
                                    />
                                </div>
                            </div>

                            {isLoading ? <p className="text-center py-12 text-slate-500">Communicating with global database...</p> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredAdmins.length > 0 ? filteredAdmins.map(admin => (
                                        <div key={admin.id} className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col hover:border-violet-300 dark:hover:border-violet-900 transition-colors group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                                                    <BuildingIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${admin.permissionGranted ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}>
                                                    {admin.permissionGranted ? 'Active' : 'Pending'}
                                                </span>
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">{admin.institutionName}</h4>
                                                <p className="text-sm font-bold text-slate-500">{admin.name}</p>
                                                <p className="text-xs text-slate-400 mt-3 font-mono">{admin.email}</p>
                                            </div>
                                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                {!admin.permissionGranted ? (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleGrantAccess(admin.id, admin.institutionName || 'Unknown')} 
                                                        disabled={isLoading}
                                                    >
                                                        {isLoading ? '...' : 'Approve'}
                                                    </Button>
                                                ) : (
                                                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                                        <CheckIcon className="h-3 w-3 text-emerald-500" /> Authorized
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => handleDeleteInstitution(admin.id, admin.institutionName!)} 
                                                    className="flex items-center gap-2 text-xs font-black text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    disabled={isLoading}
                                                >
                                                    <TrashIcon className="h-4 w-4" /> Wipe Data
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="col-span-full text-center py-12 text-slate-500 italic">No institutions match your search criteria.</p>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <Card>
                        <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-slate-100">Global Activity Monitor</h3>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.length > 0 ? logs.map(log => (
                                <div key={log.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
                                    <div className="flex-shrink-0 flex items-center">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-white shadow-sm ${log.role === Role.SUPER_ADMIN ? 'bg-rose-500' : log.role === Role.ADMIN ? 'bg-sky-500' : 'bg-indigo-500'}`}>
                                            {log.actorName.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-slate-800 dark:text-slate-100">{log.actorName} <span className="text-xs font-bold text-slate-400 ml-1">({log.role})</span></p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                            <span className="text-[10px] font-black px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg uppercase tracking-widest">{log.action.replace(/_/g, ' ')}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">{log.details}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center py-12 text-slate-500 italic">No global activity logs available.</p>
                            )}
                        </div>
                    </Card>
                )}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
