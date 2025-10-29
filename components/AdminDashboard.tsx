import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Exam, Role, Hall } from '../types';
import { 
    getTeachersForAdmin, 
    getUnassignedTeachers,
    grantTeacherPermission,
    revokeTeacherPermission,
    getExamsForAdmin, 
    deleteExam, 
    deleteTeacher 
} from '../services/api';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const ExcelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M21.16,3.16a1.2,1.2,0,0,0-.81-.29H3.65A1.2,1.2,0,0,0,2.45,4.07V19.93a1.2,1.2,0,0,0,1.2,1.2h16.7a1.2,1.2,0,0,0,1.2-1.2V4.07a1.2,1.2,0,0,0-.39-.91ZM14.21,12.19,11.83,15a.34.34,0,0,1-.31.18.33.33,0,0,1-.3-.17l-2.4-2.82a.33.33,0,0,1,.24-.53h1.37a.33.33,0,0,1,.3.17l1,1.18,1-1.18a.33.33,0,0,1,.3-.17h1.37a.33.33,0,0,1,.24.53Z"/></svg>;


const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myTeachers, setMyTeachers] = useState<User[]>([]);
    const [unassignedTeachers, setUnassignedTeachers] = useState<User[]>([]);
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const visibleHallRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // State for bulk downloading
    const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);
    const downloadRefs = useRef<Record<string, HTMLDivElement | null>>({});


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

    useEffect(() => {
        fetchAllTeachers();
        fetchExams();
    }, [fetchAllTeachers, fetchExams]);

    const handleGrantPermission = async (teacherId: string) => {
        if (!user) return;
        await grantTeacherPermission(teacherId, user.id);
        fetchAllTeachers();
    };

    const handleRevokePermission = async (teacherId: string) => {
        await revokeTeacherPermission(teacherId);
        fetchAllTeachers();
    };
    
    const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
        if (!user) return;
        if (window.confirm(`Are you sure you want to permanently delete the account for "${teacherName}"? This action cannot be undone and will also delete all exams created by this teacher.`)) {
            const success = await deleteTeacher(teacherId, user.id);
            if (success) {
                fetchAllTeachers();
                fetchExams();
            }
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (!user) return;
        if (window.confirm('Are you sure you want to permanently delete this exam? This action cannot be undone.')) {
            await deleteExam(examId, user.id, user.role);
            if (selectedExam?.id === examId) {
                setSelectedExam(null);
            }
            fetchExams();
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


    const getTeacherName = (teacherId: string) => {
        return [...myTeachers, ...unassignedTeachers].find(t => t.id === teacherId)?.name || 'Unknown Teacher';
    };

    if (selectedExam) {
        return (
             <>
                <div className="min-h-screen">
                    <Header />
                    <main className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center mb-4">
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
                                            {downloadingExamId === selectedExam.id ? 'Downloading...' : <><DownloadIcon /> Download PNGs</>}
                                        </Button>
                                        <Button 
                                            onClick={() => handleDownloadAllExcel(selectedExam)}
                                            className="flex items-center"
                                        >
                                            <ExcelIcon />
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
                                    <p className="text-slate-500 dark:text-slate-400">{getTeacherName(selectedExam.createdBy)}</p>
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
                                                    <DownloadIcon /> Download PNG
                                                </Button>
                                                <Button 
                                                    onClick={() => handleDownloadHallExcel(hall)}
                                                    variant="secondary" 
                                                    className="flex items-center mx-auto !py-1 !px-3 text-sm"
                                                >
                                                    <ExcelIcon /> Download Excel
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

    return (
        <div className="min-h-screen">
            <Header />
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">Admin Dashboard</h2>
                <div className="space-y-8">
                    <Card>
                        <h3 className="text-xl font-semibold mb-4">Teacher Management</h3>
                        {isLoadingTeachers ? <p>Loading teachers...</p> : (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">My Managed Teachers ({myTeachers.length})</h4>
                                    <div className="space-y-4">
                                        {myTeachers.map(teacher => (
                                            <div key={teacher.id} className="group flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                                <div className="flex items-center">
                                                    <UserIcon />
                                                    <div className="ml-4">
                                                        <p className="font-semibold">{teacher.name}</p>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{teacher.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${teacher.permissionGranted ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'}`}>
                                                        {teacher.permissionGranted ? 'Permission Granted' : 'Permission Revoked'}
                                                    </span>
                                                    <Button variant={teacher.permissionGranted ? 'danger' : 'primary'} className="!py-1 !px-3 text-xs" onClick={() => teacher.permissionGranted ? handleRevokePermission(teacher.id) : handleGrantPermission(teacher.id)}>
                                                        {teacher.permissionGranted ? 'Revoke' : 'Grant'}
                                                    </Button>
                                                    <Button variant="danger" className="!py-1 !px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {myTeachers.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No teachers are assigned to you.</p>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">Pending Registrations ({unassignedTeachers.length})</h4>
                                    <div className="space-y-4">
                                        {unassignedTeachers.map(teacher => (
                                            <div key={teacher.id} className="group flex items-center justify-between p-4 bg-slate-50 border dark:bg-slate-800 dark:border-slate-700 rounded-lg">
                                                <div className="flex items-center">
                                                    <UserIcon />
                                                    <div className="ml-4">
                                                        <p className="font-semibold">{teacher.name}</p>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{teacher.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <Button variant="primary" className="!py-1 !px-3 text-xs" onClick={() => handleGrantPermission(teacher.id)}>
                                                        Approve
                                                    </Button>
                                                     <Button variant="danger" className="!py-1 !px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {unassignedTeachers.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No new teacher registrations.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold mb-4">My Exam Schedules</h3>
                        {isLoadingExams ? <p>Loading exams...</p> : exams.length > 0 ? (
                            <div className="space-y-4">
                                {exams.map(exam => (
                                     <div key={exam.id} className="group flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition">
                                        <div className="flex-grow cursor-pointer" onClick={() => setSelectedExam(exam)}>
                                            <p className="font-semibold">{exam.title}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Date: {exam.date} | By: {getTeacherName(exam.createdBy)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${exam.seatingPlan ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                                                {exam.seatingPlan ? 'Plan Generated' : 'Pending Plan'}
                                            </span>
                                            <Button 
                                                variant="danger" 
                                                className="!py-1 !px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                                            >
                                                Delete
                                            </Button>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" onClick={() => setSelectedExam(exam)}>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                           <p className="text-center text-slate-500 dark:text-slate-400 py-4">No exams have been scheduled by your teachers yet.</p>
                        )}
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;