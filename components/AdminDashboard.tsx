
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Exam } from '../types';
import { getTeachers, toggleTeacherPermission, getAllExams, deleteExam, deleteTeacher, getDatabaseState, importDatabaseState } from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const ImportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;


const AdminDashboard: React.FC = () => {
    const [teachers, setTeachers] = useState<User[]>([]);
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [importMessage, setImportMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTeachers = useCallback(async () => {
        setIsLoadingTeachers(true);
        const data = await getTeachers();
        setTeachers(data);
        setIsLoadingTeachers(false);
    }, []);

    const fetchExams = useCallback(async () => {
        setIsLoadingExams(true);
        const data = await getAllExams();
        setExams(data);
        setIsLoadingExams(false);
    }, []);

    useEffect(() => {
        fetchTeachers();
        fetchExams();
    }, [fetchTeachers, fetchExams]);

    const handlePermissionToggle = async (teacherId: string) => {
        await toggleTeacherPermission(teacherId);
        fetchTeachers(); // Refresh the list
    };
    
    const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
        if (window.confirm(`Are you sure you want to permanently delete the account for "${teacherName}"? This action cannot be undone and will also delete all exams created by this teacher.`)) {
            const success = await deleteTeacher(teacherId);
            if (success) {
                fetchTeachers(); // Refresh the teacher list
                fetchExams(); // Also refresh the exam list
            }
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this exam? This action cannot be undone.')) {
            await deleteExam(examId);
            if (selectedExam?.id === examId) {
                setSelectedExam(null);
            }
            fetchExams();
        }
    };

    const getTeacherName = (teacherId: string) => {
        return teachers.find(t => t.id === teacherId)?.name || 'Unknown Teacher';
    };

    const handleExport = async () => {
        try {
            const dbState = await getDatabaseState();
            const jsonString = JSON.stringify(dbState, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smart-exam-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed", error);
            setImportMessage({ type: 'error', text: 'Failed to export data.' });
        }
    };

    const handleImportClick = () => {
        setImportMessage(null); // Clear previous messages
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (window.confirm("Are you sure you want to import this file? This will overwrite ALL existing data in the application.")) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') {
                        throw new Error('Error reading file content.');
                    }
                    const newState = JSON.parse(text);
                    const success = await importDatabaseState(newState);
                    if (success) {
                        setImportMessage({ type: 'success', text: 'Data imported successfully! Refreshing data...' });
                        // Force a full refresh of data
                        await Promise.all([fetchTeachers(), fetchExams()]);
                         // Unselect exam if it no longer exists
                        setSelectedExam(prev => {
                            if (prev && !newState.exams.some((ex: Exam) => ex.id === prev.id)) {
                                return null;
                            }
                            return prev;
                        });
                    } else {
                        throw new Error('Import failed. The file may be corrupt or in the wrong format.');
                    }
                } catch (error: any) {
                    console.error("Import error:", error);
                    setImportMessage({ type: 'error', text: error.message || 'Import failed. Invalid file.' });
                } finally {
                    // Reset file input value to allow importing the same file again
                    if (event.target) {
                        event.target.value = '';
                    }
                }
            };
            reader.readAsText(file);
        } else {
             if (event.target) {
                event.target.value = '';
            }
        }
    };

    if (selectedExam) {
        return (
             <div className="min-h-screen bg-slate-50">
                <Header />
                <main className="max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-4">
                        <Button onClick={() => setSelectedExam(null)} variant="secondary">
                            &larr; Back to Dashboard
                        </Button>
                        <Button
                            onClick={() => handleDeleteExam(selectedExam.id)}
                            variant="danger"
                        >
                            Delete Exam
                        </Button>
                    </div>
                    <Card className="mb-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-2xl font-bold text-violet-700">{selectedExam.title}</h3>
                                <p className="text-slate-500 mt-1">Date: {selectedExam.date}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-semibold text-slate-600">Created by:</p>
                                <p className="text-slate-500">{getTeacherName(selectedExam.createdBy)}</p>
                             </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                             <Card>
                                <h4 className="text-lg font-semibold mb-3 border-b pb-2">Halls ({selectedExam.halls.length})</h4>
                                <ul className="space-y-2 text-sm">
                                    {selectedExam.halls.map(hall => (
                                        <li key={hall.id} className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span>{hall.name}</span>
                                            <span className="text-slate-500">{hall.rows} rows &times; {hall.cols} cols</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                             <Card>
                                <h4 className="text-lg font-semibold mb-3 border-b pb-2">Student Sets ({selectedExam.studentSets.length})</h4>
                                <ul className="space-y-2 text-sm">
                                    {selectedExam.studentSets.map(set => (
                                        <li key={set.id} className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span>{set.subject}</span>
                                            <span className="text-slate-500">{set.studentCount} students</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                             <Card>
                                 <h3 className="text-xl font-semibold mb-4 text-center">Seating Arrangement</h3>
                                {selectedExam.seatingPlan ? (
                                    <div className="space-y-8">
                                    {selectedExam.halls.map(hall => (
                                        <SeatingPlanVisualizer 
                                            key={hall.id} 
                                            hall={hall} 
                                            plan={selectedExam.seatingPlan!}
                                            studentSets={selectedExam.studentSets}
                                        />
                                    ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500 py-10">
                                        <p>No seating plan has been generated for this exam yet.</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Header />
            <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-6">Admin Dashboard</h2>
                <div className="space-y-8">
                    <Card>
                        <h3 className="text-xl font-semibold mb-4">Teacher Management</h3>
                        {isLoadingTeachers ? (
                            <p>Loading teachers...</p>
                        ) : (
                            <div className="space-y-4">
                                {teachers.map(teacher => (
                                    <div key={teacher.id} className="group flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                        <div className="flex items-center">
                                            <UserIcon />
                                            <div className="ml-4">
                                                <p className="font-semibold">{teacher.name}</p>
                                                <p className="text-sm text-slate-500">{teacher.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                             <span className={`text-sm font-medium px-2 py-1 rounded-full ${teacher.permissionGranted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {teacher.permissionGranted ? 'Permission Granted' : 'Permission Revoked'}
                                            </span>
                                            <Button 
                                                variant={teacher.permissionGranted ? 'danger' : 'primary'}
                                                className="!py-1 !px-3 text-xs"
                                                onClick={() => handlePermissionToggle(teacher.id)}
                                            >
                                                {teacher.permissionGranted ? 'Revoke' : 'Grant'}
                                            </Button>
                                            <Button 
                                                variant="danger" 
                                                className="!py-1 !px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold mb-4">All Exam Schedules</h3>
                        {isLoadingExams ? (
                             <p>Loading exams...</p>
                        ) : exams.length > 0 ? (
                            <div className="space-y-4">
                                {exams.map(exam => (
                                     <div key={exam.id} className="group flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                                        <div className="flex-grow cursor-pointer" onClick={() => setSelectedExam(exam)}>
                                            <p className="font-semibold">{exam.title}</p>
                                            <p className="text-sm text-slate-500">Date: {exam.date} | By: {getTeacherName(exam.createdBy)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${exam.seatingPlan ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {exam.seatingPlan ? 'Plan Generated' : 'Pending Plan'}
                                            </span>
                                            <Button 
                                                variant="danger" 
                                                className="!py-1 !px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteExam(exam.id);
                                                }}
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
                           <p className="text-center text-slate-500 py-4">No exams have been scheduled yet.</p>
                        )}
                    </Card>

                     <Card>
                        <h3 className="text-xl font-semibold mb-2">Data Management</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Save all application data (teachers, exams, etc.) to a file on your computer for backup or to move to another browser. Importing a file will overwrite all current data.
                        </p>
                        {importMessage && (
                            <div className={`p-3 rounded-md text-sm mb-4 text-center ${importMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                {importMessage.text}
                            </div>
                        )}
                        <div className="flex gap-4">
                            <Button onClick={handleExport} variant="secondary">
                                <ExportIcon />
                                Export All Data
                            </Button>
                            <Button onClick={handleImportClick} variant="secondary">
                                <ImportIcon />
                                Import Data
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileImport}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
