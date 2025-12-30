
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Exam, Role, Hall, HallTemplate, StudentSetTemplate, SeatDefinition, AuditLog } from '../types';
import { 
    getTeachersForAdmin, 
    getUnassignedTeachers,
    grantTeacherPermission,
    revokeTeacherPermission,
    getExamsForAdmin, 
    deleteExam, 
    deleteTeacher,
    getHallTemplatesForAdmin,
    createHallTemplate,
    deleteHallTemplate,
    getStudentSetTemplatesForAdmin,
    createStudentSetTemplate,
    deleteStudentSetTemplate,
    getAuditLogs
} from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';
import HallLayoutEditor from './common/HallLayoutEditor';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

// Icons
const DownloadIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const ExcelIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="currentColor"><path d="M21.16,3.16a1.2,1.2,0,0,0-.81-.29H3.65A1.2,1.2,0,0,0,2.45,4.07V19.93a1.2,1.2,0,0,0,1.2,1.2h16.7a1.2,1.2,0,0,0,1.2-1.2V4.07a1.2,1.2,0,0,0-.39-.91ZM14.21,12.19,11.83,15a.34.34,0,0,1-.31.18.33.33,0,0,1-.3-.17l-2.4-2.82a.33.33,0,0,1,.24-.53h1.37a.33.33,0,0,1,.3.17l1,1.18,1-1.18a.33.33,0,0,1,.3-.17h1.37a.33.33,0,0,1,.24.53Z"/></svg>;
const TrashIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;
const ClockIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const UsersIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const TemplateIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
const CalendarIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const SearchIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ActivityIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
    <div className={`p-6 rounded-xl border shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02] ${colorClass}`}>
        <div>
            <p className="text-sm font-medium opacity-80 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            {icon}
        </div>
    </div>
);

type Tab = 'overview' | 'exams' | 'teachers' | 'templates';

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myTeachers, setMyTeachers] = useState<User[]>([]);
    const [unassignedTeachers, setUnassignedTeachers] = useState<User[]>([]);
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const visibleHallRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Navigation
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [searchQuery, setSearchQuery] = useState('');

    // State for bulk downloading
    const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);
    const downloadRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Template states
    const [hallTemplates, setHallTemplates] = useState<HallTemplate[]>([]);
    const [studentSetTemplates, setStudentSetTemplates] = useState<StudentSetTemplate[]>([]);
    const [hallEditorState, setHallEditorState] = useState<{ mode: 'closed' | 'create-template' }>({ mode: 'closed' });
    const [isGridTemplateModalOpen, setIsGridTemplateModalOpen] = useState(false);
    const [newGridTemplate, setNewGridTemplate] = useState({ name: '', rows: '8', cols: '10' });
    const [gridTemplateFormError, setGridTemplateFormError] = useState('');
    const [newStudentSetTemplate, setNewStudentSetTemplate] = useState({ subject: '', studentCount: '' });
    const [studentSetTemplateFormError, setStudentSetTemplateFormError] = useState('');


    const fetchAllTeachers = useCallback(async () => {
        if (!user) return;
        setIsLoadingTeachers(true);
        const [assigned, unassigned] = await Promise.all([
            getTeachersForAdmin(user.id),
            getUnassignedTeachers()
        ]);
        setMyTeachers(assigned);
        setUnassignedTeachers(unassigned);
        setIsLoadingTeachers(false);
    }, [user]);

    const fetchExams = useCallback(async () => {
        if (!user) return;
        setIsLoadingExams(true);
        const data = await getExamsForAdmin(user.id);
        setExams(data);
        setIsLoadingExams(false);
    }, [user]);

    const fetchHallTemplates = useCallback(async () => {
        if (!user) return;
        const data = await getHallTemplatesForAdmin(user.id);
        setHallTemplates(data);
    }, [user]);

    const fetchStudentSetTemplates = useCallback(async () => {
        if (!user) return;
        const data = await getStudentSetTemplatesForAdmin(user.id);
        setStudentSetTemplates(data);
    }, [user]);

    const fetchLogs = useCallback(async () => {
        if (!user) return;
        const data = await getAuditLogs(user.id);
        setLogs(data);
    }, [user]);

    useEffect(() => {
        fetchAllTeachers();
        fetchExams();
        fetchHallTemplates();
        fetchStudentSetTemplates();
        fetchLogs();
    }, [fetchAllTeachers, fetchExams, fetchHallTemplates, fetchStudentSetTemplates, fetchLogs]);

    const handleGrantPermission = async (teacherId: string) => {
        if (!user) return;
        await grantTeacherPermission(teacherId, user.id);
        fetchAllTeachers();
        fetchLogs();
    };

    const handleRevokePermission = async (teacherId: string) => {
        await revokeTeacherPermission(teacherId);
        fetchAllTeachers();
        fetchLogs();
    };
    
    const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
        if (!user) return;
        if (window.confirm(`Are you sure you want to permanently delete the account for "${teacherName}"? This action cannot be undone and will also delete all exams created by this teacher.`)) {
            const success = await deleteTeacher(teacherId, user.id);
            if (success) {
                await fetchAllTeachers();
                await fetchExams();
                await fetchLogs();
            } else {
                alert("Failed to delete teacher. Ensure you have the correct permissions.");
            }
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (!user) return;
        if (window.confirm('Are you sure you want to permanently delete this exam? This action cannot be undone.')) {
            const success = await deleteExam(examId, user.id, user.role);
            if (success) {
                if (selectedExam?.id === examId) {
                    setSelectedExam(null);
                }
                await fetchExams();
                await fetchLogs();
            } else {
                alert("Failed to delete exam.");
            }
        }
    };

    const handleDownloadPng = async (hallId: string, hallName: string) => {
        const element = visibleHallRefs.current[hallId];
        if (!element || !selectedExam) return;

        const originalShadow = element.style.boxShadow;
        element.style.boxShadow = 'none';

        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });

        element.style.boxShadow = originalShadow;

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const sanitizedTitle = selectedExam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedHallName = hallName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${sanitizedTitle}_${sanitizedHallName}_plan.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = (exam: Exam) => {
        if (!exam.seatingPlan) return;
        downloadRefs.current = {};
        setDownloadingExamId(exam.id);
    };

    const handleDownloadAllExcel = (exam: Exam) => {
        if (!exam.seatingPlan) {
            alert("This exam does not have a seating plan to export.");
            return;
        }

        const wb = XLSX.utils.book_new();

        exam.halls.forEach(hall => {
            const hallPlan = exam.seatingPlan![hall.id];
            if (!hallPlan) return;

            const maxCols = hallPlan.reduce((max, row) => Math.max(max, row.length), 0);
            const headers = ['']; // For Row labels column
            for (let c = 0; c < maxCols; c++) {
                headers.push(`Col ${c + 1}`);
            }
            const data = [headers];

            for (let r = 0; r < hallPlan.length; r++) {
                const rowData = [`Row ${r + 1}`];
                for (let c = 0; c < maxCols; c++) {
                    const seat = hallPlan[r]?.[c];
                    rowData.push(seat?.student?.id || '');
                }
                data.push(rowData);
            }

            const ws = XLSX.utils.aoa_to_sheet(data);
            // Sanitize sheet name (max 31 chars, no invalid chars)
            const sheetName = hall.name.replace(/[*?:/\\\[\]]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        const sanitizedTitle = exam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(wb, `${sanitizedTitle}_seating_plan.xlsx`);
    };

    const handleDownloadHallExcel = (hall: Hall) => {
        if (!selectedExam || !selectedExam.seatingPlan) {
            alert("Seating plan not available for this hall.");
            return;
        }

        const hallPlan = selectedExam.seatingPlan[hall.id];
        if (!hallPlan) return;

        const wb = XLSX.utils.book_new();

        const maxCols = hallPlan.reduce((max, row) => Math.max(max, row.length), 0);
        const headers = ['']; // For Row labels column
        for (let c = 0; c < maxCols; c++) {
            headers.push(`Col ${c + 1}`);
        }
        const data = [headers];

        for (let r = 0; r < hallPlan.length; r++) {
            const rowData = [`Row ${r + 1}`];
            for (let c = 0; c < maxCols; c++) {
                 const seat = hallPlan[r]?.[c];
                rowData.push(seat?.student?.id || '');
            }
            data.push(rowData);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        // Sanitize sheet name (max 31 chars, no invalid chars)
        const sheetName = hall.name.replace(/[*?:/\\\[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const sanitizedTitle = selectedExam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedHallName = hall.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(wb, `${sanitizedTitle}_${sanitizedHallName}_plan.xlsx`);
    };
    
    // --- Template Handlers ---
    const handleSaveFromEditor = async (data: { layout: SeatDefinition[], name?: string }) => {
        if (hallEditorState.mode === 'create-template' && data.name && user) {
            await createHallTemplate({ name: data.name, layout: data.layout }, user.id);
            await fetchHallTemplates();
            fetchLogs();
        }
        setHallEditorState({ mode: 'closed' });
    };

    const handleCreateGridTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setGridTemplateFormError('');

        const { name, rows: rowsStr, cols: colsStr } = newGridTemplate;
        const rows = parseInt(rowsStr, 10);
        const cols = parseInt(colsStr, 10);

        if (!name.trim()) {
            setGridTemplateFormError('Template name cannot be empty.');
            return;
        }
        if (hallTemplates.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
            setGridTemplateFormError('A template with this name already exists.');
            return;
        }
        if (isNaN(rows) || rows <= 0 || rows > 50 || isNaN(cols) || cols <= 0 || cols > 50) {
            setGridTemplateFormError('Rows and columns must be numbers between 1 and 50.');
            return;
        }

        const newLayout: SeatDefinition[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newLayout.push({ id: `seat-${r}-${c}-${Date.now()}`, row: r, col: c, type: 'standard' });
            }
        }

        await createHallTemplate({ name: name.trim(), layout: newLayout }, user.id);
        await fetchHallTemplates();
        fetchLogs();
        
        setIsGridTemplateModalOpen(false);
        setNewGridTemplate({ name: '', rows: '8', cols: '10' }); // Reset form
    };
    
    const handleDeleteHallTemplate = async (templateId: string) => {
        if (user && window.confirm("Are you sure you want to delete this hall template? This cannot be undone.")) {
            const success = await deleteHallTemplate(templateId, user.id, user.role);
            if (success) {
                await fetchHallTemplates();
            } else {
                alert("Failed to delete template. You may not have permission.");
            }
        }
    };
    
    const handleCreateStudentSetTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentSetTemplateFormError('');
        if (!user) return;

        const { subject, studentCount } = newStudentSetTemplate;
        const parsedCount = parseInt(studentCount, 10);

        if (!subject.trim()) {
            setStudentSetTemplateFormError("Subject/code cannot be empty.");
            return;
        }
        if (isNaN(parsedCount) || parsedCount <= 0) {
            setStudentSetTemplateFormError("Student count must be a positive number.");
            return;
        }
        if (studentSetTemplates.some(t => t.subject.toLowerCase() === subject.trim().toLowerCase())) {
            setStudentSetTemplateFormError("A template with this subject/code already exists.");
            return;
        }

        await createStudentSetTemplate({ subject: subject.trim(), studentCount: parsedCount }, user.id);
        setNewStudentSetTemplate({ subject: '', studentCount: '' });
        await fetchStudentSetTemplates();
        fetchLogs();
    };

    const handleDeleteStudentSetTemplate = async (templateId: string) => {
        if (user && window.confirm("Are you sure you want to delete this student set template? This cannot be undone.")) {
            const success = await deleteStudentSetTemplate(templateId, user.id, user.role);
            if (success) {
                await fetchStudentSetTemplates();
            } else {
                alert("Failed to delete template. You may not have permission.");
            }
        }
    };


    const examForDownload = exams.find(e => e.id === downloadingExamId);

    useEffect(() => {
        if (!examForDownload || !examForDownload.seatingPlan) return;

        const timer = setTimeout(async () => {
            const hallElements = Object.entries(downloadRefs.current).filter(([, el]) => el !== null);

            if (hallElements.length !== examForDownload.halls.length) {
                setDownloadingExamId(null);
                return;
            }

            const downloadPromises = hallElements.map(async ([hallId, element]) => {
                const hall = examForDownload.halls.find(h => h.id === hallId);
                if (!element || !hall) return;

                // FIX: Cast element to HTMLDivElement to access style property
                (element as HTMLDivElement).style.boxShadow = 'none';
                const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
                // FIX: Cast element to HTMLDivElement to access style property
                (element as HTMLDivElement).style.boxShadow = '';

                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                const sanitizedTitle = examForDownload.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const sanitizedHallName = hall.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                link.download = `${sanitizedTitle}_${sanitizedHallName}_plan.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            await Promise.all(downloadPromises);
            setDownloadingExamId(null);
        }, 100);

        return () => clearTimeout(timer);
    }, [downloadingExamId, examForDownload]);


    const getUserName = (userId: string) => {
        if (user && user.id === userId) {
            return `${user.name} (Admin)`;
        }
        return [...myTeachers].find(t => t.id === userId)?.name || 'Unknown User';
    };

    // --- Render Logic ---

    if (selectedExam) {
        return (
             <>
                <div className="min-h-screen">
                    <Header />
                    <main className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center mb-6">
                            <Button onClick={() => setSelectedExam(null)} variant="secondary">
                                &larr; Back to Dashboard
                            </Button>
                            <div className="flex flex-wrap justify-end gap-2">
                                {selectedExam.seatingPlan && (
                                    <>
                                        <Button 
                                            onClick={() => handleDownloadAll(selectedExam)}
                                            disabled={!!downloadingExamId}
                                            variant="secondary"
                                            className="flex items-center"
                                        >
                                            {downloadingExamId === selectedExam.id ? 'Downloading...' : <><DownloadIcon className="mr-2 h-4 w-4" /> Download PNGs</>}
                                        </Button>
                                        <Button 
                                            onClick={() => handleDownloadAllExcel(selectedExam)}
                                            className="flex items-center"
                                        >
                                            <ExcelIcon className="mr-2 h-4 w-4" />
                                            Download Excel
                                        </Button>
                                    </>
                                )}
                                <Button onClick={() => handleDeleteExam(selectedExam.id)} variant="danger">
                                    Delete Exam
                                </Button>
                            </div>
                        </div>
                        <Card className="mb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold text-violet-700 dark:text-violet-400">{selectedExam.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mt-1">Date: {selectedExam.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Created by:</p>
                                    <p className="text-slate-500 dark:text-slate-400">{getUserName(selectedExam.createdBy)}</p>
                                </div>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <Card>
                                    <h4 className="text-lg font-semibold mb-3 border-b pb-2 dark:border-slate-700">Halls ({selectedExam.halls.length})</h4>
                                    <ul className="space-y-2 text-sm">
                                        {selectedExam.halls.map(hall => (
                                            <li key={hall.id} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                                                <span>{hall.name}</span>
                                                <span className="text-slate-500 dark:text-slate-400">{hall.layout.filter(s => s.type !== 'faculty').length} seats</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                                <Card>
                                    <h4 className="text-lg font-semibold mb-3 border-b pb-2 dark:border-slate-700">Student Sets ({selectedExam.studentSets.length})</h4>
                                    <ul className="space-y-2 text-sm">
                                        {selectedExam.studentSets.map(set => (
                                            <li key={set.id} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                                                <span>{set.subject}</span>
                                                <span className="text-slate-500 dark:text-slate-400">{set.studentCount} students</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </div>
                            <div className="lg:col-span-2 space-y-8">
                                {selectedExam.seatingPlan ? (
                                    selectedExam.halls.map(hall => (
                                        <Card key={hall.id} ref={el => { if (el) visibleHallRefs.current[hall.id] = el; }}>
                                            <SeatingPlanVisualizer 
                                                hall={hall} 
                                                plan={selectedExam.seatingPlan!}
                                                studentSets={selectedExam.studentSets}
                                            />
                                            <div className="text-center mt-4 flex justify-center gap-2">
                                                <Button 
                                                    onClick={() => handleDownloadPng(hall.id, hall.name)} 
                                                    variant="secondary" 
                                                    className="flex items-center mx-auto !py-1 !px-3 text-sm"
                                                >
                                                    <DownloadIcon className="mr-2 h-4 w-4" /> Download PNG
                                                </Button>
                                                <Button 
                                                    onClick={() => handleDownloadHallExcel(hall)}
                                                    variant="secondary" 
                                                    className="flex items-center mx-auto !py-1 !px-3 text-sm"
                                                >
                                                    <ExcelIcon className="mr-2 h-4 w-4" /> Download Excel
                                                </Button>
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                    <Card>
                                        <h3 className="text-xl font-semibold mb-4 text-center">Seating Arrangement</h3>
                                        <div className="text-center text-slate-500 dark:text-slate-400 py-10">
                                            <p>No seating plan has been generated for this exam yet.</p>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
                {examForDownload && examForDownload.id === selectedExam.id && examForDownload.seatingPlan && (
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
                        {examForDownload.halls.map(hall => (
                            <div key={hall.id} ref={el => { if (el) downloadRefs.current[hall.id] = el; }} style={{ width: '800px', padding: '1px' }}>
                                    <Card>
                                    <SeatingPlanVisualizer
                                        hall={hall}
                                        plan={examForDownload.seatingPlan}
                                        studentSets={examForDownload.studentSets}
                                    />
                                </Card>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )
    }

    const filteredTeachers = myTeachers.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredExams = exams.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen">
            <Header />
            {hallEditorState.mode === 'create-template' && (
                <HallLayoutEditor
                    isOpen={true}
                    onClose={() => setHallEditorState({ mode: 'closed' })}
                    onSave={handleSaveFromEditor}
                    initialLayout={[]}
                    isTemplateCreationMode={true}
                />
            )}
            {isGridTemplateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={() => setIsGridTemplateModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">Create Grid Hall Template</h2>
                        <form onSubmit={handleCreateGridTemplate}>
                            <div className="space-y-4">
                                <Input
                                    label="Template Name"
                                    id="grid-template-name"
                                    value={newGridTemplate.name}
                                    onChange={e => setNewGridTemplate({ ...newGridTemplate, name: e.target.value })}
                                    required
                                    placeholder="e.g., Small Classroom"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Rows"
                                        id="grid-template-rows"
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={newGridTemplate.rows}
                                        onChange={e => setNewGridTemplate({ ...newGridTemplate, rows: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="Columns"
                                        id="grid-template-cols"
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={newGridTemplate.cols}
                                        onChange={e => setNewGridTemplate({ ...newGridTemplate, cols: e.target.value })}
                                        required
                                    />
                                </div>
                                {gridTemplateFormError && <p className="text-sm text-red-600 dark:text-red-400">{gridTemplateFormError}</p>}
                            </div>
                            <div className="mt-6 flex justify-end gap-4">
                                <Button type="button" variant="secondary" onClick={() => setIsGridTemplateModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Template</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                     <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Admin Dashboard</h2>
                     <p className="text-slate-500 dark:text-slate-400">Manage your institution's teachers, exams, and templates.</p>
                </div>
                
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                     <StatCard 
                        title="Active Exams" 
                        value={exams.length} 
                        icon={<CalendarIcon className="h-6 w-6 text-violet-600 dark:text-violet-300" />}
                        colorClass="bg-violet-50 border-violet-100 text-violet-900 dark:bg-violet-900/20 dark:border-violet-900/50 dark:text-violet-100"
                    />
                     <StatCard 
                        title="Managed Teachers" 
                        value={myTeachers.length} 
                        icon={<UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />}
                        colorClass="bg-blue-50 border-blue-100 text-blue-900 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-100"
                    />
                     <StatCard 
                        title="Templates" 
                        value={hallTemplates.length + studentSetTemplates.length} 
                        icon={<TemplateIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />}
                        colorClass="bg-emerald-50 border-emerald-100 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-100"
                    />
                     <StatCard 
                        title="Pending Approvals" 
                        value={unassignedTeachers.length} 
                        icon={<CheckIcon className="h-6 w-6 text-amber-600 dark:text-amber-300" />}
                        colorClass="bg-amber-50 border-amber-100 text-amber-900 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-100"
                    />
                </div>

                {/* Tab Navigation */}
                <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {(['overview', 'teachers', 'exams', 'templates'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors
                                    ${activeTab === tab
                                        ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                    }
                                `}
                            >
                                {tab}
                                {tab === 'teachers' && unassignedTeachers.length > 0 && (
                                    <span className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 py-0.5 px-2 rounded-full text-xs">
                                        {unassignedTeachers.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <Card className="h-full">
                                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                        <ActivityIcon className="h-6 w-6 text-violet-500" /> Recent Activity
                                    </h3>
                                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {logs.length > 0 ? (
                                            <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6 py-2">
                                                {logs.map((log) => (
                                                    <div key={log.id} className="relative pl-6">
                                                        <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white dark:border-slate-800 ${log.role === Role.ADMIN ? 'bg-red-500' : log.role === Role.TEACHER ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                                        <div>
                                                            <p className="text-xs text-slate-400 mb-0.5 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                                <span className={`${log.role === Role.ADMIN ? 'text-red-600 dark:text-red-400' : log.role === Role.TEACHER ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'} font-bold`}>
                                                                    {log.actorName}
                                                                </span>
                                                                <span className="mx-1 text-slate-400">•</span>
                                                                {log.action.replace(/_/g, ' ')}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{log.details}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">No activity logs found.</p>
                                        )}
                                    </div>
                                </Card>
                            </div>
                            <div className="lg:col-span-1">
                                <Card className="bg-gradient-to-br from-violet-50 to-white dark:from-slate-800 dark:to-slate-900 border-violet-100 dark:border-slate-700 h-full">
                                    <h3 className="text-lg font-bold mb-4 text-violet-900 dark:text-violet-100">System Health</h3>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Total Exams</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{exams.length}</span>
                                        </li>
                                        <li className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Generated Plans</span>
                                            <span className="font-bold text-green-600 dark:text-green-400">{exams.filter(e => e.seatingPlan).length}</span>
                                        </li>
                                        <li className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Pending Plans</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">{exams.filter(e => !e.seatingPlan).length}</span>
                                        </li>
                                        <li className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Active Teachers</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{myTeachers.length}</span>
                                        </li>
                                    </ul>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* TEACHERS TAB */}
                    {activeTab === 'teachers' && (
                        <div className="space-y-6">
                            {unassignedTeachers.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-6 shadow-sm">
                                    <h4 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                                        <div className="p-1 bg-amber-200 dark:bg-amber-800 rounded-full">
                                            <CheckIcon className="h-4 w-4" />
                                        </div>
                                        Pending Approvals ({unassignedTeachers.length})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {unassignedTeachers.map(teacher => (
                                            <div key={teacher.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-amber-100 dark:border-slate-700 flex flex-col justify-between h-full">
                                                <div className="mb-3">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{teacher.name}</p>
                                                    <p className="text-sm text-slate-500 break-all">{teacher.email}</p>
                                                </div>
                                                <div className="flex gap-2 mt-auto">
                                                    <Button variant="primary" className="flex-1 !py-1.5 !text-sm bg-emerald-600 hover:bg-emerald-700" onClick={() => handleGrantPermission(teacher.id)}>
                                                        Approve
                                                    </Button>
                                                    <Button 
                                                        type="button" 
                                                        variant="danger" 
                                                        className="!py-1.5 !px-3 !text-sm" 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(teacher.id, teacher.name); }}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Card>
                                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                                    <h3 className="text-xl font-semibold flex items-center gap-2">
                                        <UsersIcon className="h-6 w-6 text-blue-500" /> Active Staff Directory
                                    </h3>
                                    <div className="relative w-full sm:w-72">
                                        <Input 
                                            placeholder="Search by name or email..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            containerClassName="mb-0"
                                            className="pl-10"
                                        />
                                        <div className="absolute left-3 top-2.5 text-slate-400">
                                            <SearchIcon className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                                
                                {isLoadingTeachers ? <p className="text-center py-8">Loading staff data...</p> : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredTeachers.map(teacher => (
                                            <div key={teacher.id} className="group relative p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-transparent hover:border-violet-200 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm ${teacher.permissionGranted ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-red-400'}`}>
                                                        {teacher.name.charAt(0)}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={teacher.name}>{teacher.name}</p>
                                                        <p className="text-xs text-slate-500 truncate" title={teacher.email}>{teacher.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                    <button 
                                                        onClick={() => teacher.permissionGranted ? handleRevokePermission(teacher.id) : handleGrantPermission(teacher.id)}
                                                        className={`px-3 py-1 text-xs rounded-md border transition-colors ${teacher.permissionGranted ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                                                    >
                                                        {teacher.permissionGranted ? "Revoke Access" : "Grant Access"}
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(teacher.id, teacher.name); }}
                                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                        title="Delete Account"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredTeachers.length === 0 && <p className="col-span-full text-center py-12 text-slate-500 italic">No teachers found matching your search.</p>}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* EXAMS TAB */}
                    {activeTab === 'exams' && (
                        <Card>
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <CalendarIcon className="h-6 w-6 text-violet-500" /> Exam Schedules
                                </h3>
                                <div className="relative w-full sm:w-72">
                                    <Input 
                                        placeholder="Search exams by title..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        containerClassName="mb-0"
                                        className="pl-10"
                                    />
                                    <div className="absolute left-3 top-2.5 text-slate-400">
                                        <SearchIcon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            {isLoadingExams ? <p className="text-center py-8">Loading exams...</p> : filteredExams.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredExams.map(exam => (
                                         <div key={exam.id} className="group relative flex flex-col justify-between p-5 bg-white border border-slate-200 hover:border-violet-300 hover:shadow-lg dark:bg-slate-800 dark:border-slate-700 dark:hover:border-violet-600 rounded-xl transition-all duration-200 cursor-pointer h-full" onClick={() => setSelectedExam(exam)}>
                                            <div className="mb-4">
                                                <div className="flex justify-between items-start mb-2">
                                                     <p className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-2" title={exam.title}>{exam.title}</p>
                                                     <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex-shrink-0 ${exam.seatingPlan ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                                                        {exam.seatingPlan ? 'Generated' : 'Pending'}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                                                    <p className="flex items-center gap-2"><span className="opacity-70">📅</span> {exam.date}</p>
                                                    <p className="flex items-center gap-2"><span className="opacity-70">👤</span> {getUserName(exam.createdBy)}</p>
                                                    <p className="flex items-center gap-2"><span className="opacity-70">🏫</span> {exam.halls.length} Halls</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                                <div className="text-xs text-slate-400 font-medium group-hover:text-violet-500 transition-colors">
                                                    View Details &rarr;
                                                </div>
                                                <button 
                                                    type="button"
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                                                    title="Delete Exam"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                               <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                   <CalendarIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                   <p className="text-slate-500 dark:text-slate-400 font-medium">No exams found matching your criteria.</p>
                               </div>
                            )}
                        </Card>
                    )}

                    {/* TEMPLATES TAB */}
                    {activeTab === 'templates' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Hall Templates */}
                            <Card className="h-full">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                        <TemplateIcon className="h-5 w-5 text-emerald-500" /> Hall Layouts
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" className="!py-1.5 !px-3 text-xs" onClick={() => {
                                            setIsGridTemplateModalOpen(true);
                                            setGridTemplateFormError('');
                                            setNewGridTemplate({ name: '', rows: '8', cols: '10' });
                                        }}>+ New Grid</Button>
                                        <Button variant="secondary" className="!py-1.5 !px-3 text-xs" onClick={() => setHallEditorState({ mode: 'create-template' })}>+ Editor</Button>
                                    </div>
                                </div>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                    {hallTemplates.map(template => (
                                        <div key={template.id} className="group relative p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-all hover:border-emerald-300">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{template.name}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{template.layout.length} seats defined</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">Creator: {getUserName(template.createdBy)}</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteHallTemplate(template.id); }} 
                                                    className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                                    title="Delete Template"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {hallTemplates.length === 0 && <p className="text-center text-sm text-slate-500 py-8 italic">No hall templates created yet.</p>}
                                </div>
                            </Card>

                            {/* Student Set Templates */}
                            <Card className="h-full">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                        <UsersIcon className="h-5 w-5 text-blue-500" /> Student Sets
                                    </h3>
                                </div>
                                
                                <form onSubmit={handleCreateStudentSetTemplate} className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <input 
                                        className="flex-grow px-3 py-1.5 text-sm rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-violet-500 outline-none" 
                                        placeholder="Subject (e.g. Math 101)" 
                                        value={newStudentSetTemplate.subject} 
                                        onChange={e => setNewStudentSetTemplate({...newStudentSetTemplate, subject: e.target.value})} 
                                    />
                                    <input 
                                        type="number" 
                                        className="w-20 px-3 py-1.5 text-sm rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-violet-500 outline-none" 
                                        placeholder="#" 
                                        value={newStudentSetTemplate.studentCount} 
                                        onChange={e => setNewStudentSetTemplate({...newStudentSetTemplate, studentCount: e.target.value})} 
                                    />
                                    <Button type="submit" className="!py-1.5 !px-3 text-sm whitespace-nowrap">Add</Button>
                                </form>
                                {studentSetTemplateFormError && <p className="text-xs text-red-600 mb-3 -mt-4">{studentSetTemplateFormError}</p>}

                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                    {studentSetTemplates.map(template => (
                                        <div key={template.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-all hover:border-blue-300">
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{template.subject}</p>
                                                <p className="text-xs text-slate-500">{template.studentCount} students</p>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteStudentSetTemplate(template.id); }} 
                                                className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                                title="Delete Template"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {studentSetTemplates.length === 0 && <p className="text-center text-sm text-slate-500 py-8 italic">No student set templates created yet.</p>}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
