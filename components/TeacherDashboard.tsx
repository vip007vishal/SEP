
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Exam, Hall, StudentSet, SeatingPlan } from '../types';
import { getExamsForTeacher, generateSeatingPlan, updateExam, createExam, deleteExam } from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';

// Types for form state to allow empty strings for number inputs
interface FormHall extends Omit<Hall, 'rows'|'cols'> {
    rows: string | number;
    cols: string | number;
}
interface FormStudentSet extends Omit<StudentSet, 'studentCount'> {
    studentCount: string | number;
}
interface FormExam extends Omit<Exam, 'halls' | 'studentSets'> {
    halls: FormHall[];
    studentSets: FormStudentSet[];
}

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
  </svg>
);

const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeExam, setActiveExam] = useState<FormExam | null>(null);
    const [formError, setFormError] = useState('');
    
    const initialNewExamState: FormExam = {
        id: '',
        title: '',
        date: '',
        halls: [{ id: `new-hall-${Date.now()}`, name: 'Hall A', rows: 8, cols: 10 }],
        studentSets: [{ id: `new-set-${Date.now()}`, subject: '101', studentCount: 20 }],
        createdBy: user?.id || ''
    };

    const fetchExams = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            const data = await getExamsForTeacher(user.id);
            setExams(data);
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.permissionGranted) {
            fetchExams();
        } else {
            setIsLoading(false);
        }
    }, [fetchExams, user]);

    // --- Form State Handlers ---
    const handleFormChange = (field: 'title' | 'date', value: string) => {
        if (!activeExam) return;
        setActiveExam(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleHallChange = (index: number, field: keyof Omit<FormHall, 'id'>, value: string) => {
        if (!activeExam) return;
        const updatedHalls = [...activeExam.halls];
        updatedHalls[index] = { ...updatedHalls[index], [field]: value };
        setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
    };

    const handleAddHall = () => {
        if (!activeExam) return;
        const newHallName = `Hall ${String.fromCharCode(65 + activeExam.halls.length)}`;
        const newHall: FormHall = { id: `new-hall-${Date.now()}`, name: newHallName, rows: 8, cols: 10 };
        setActiveExam(prev => prev ? { ...prev, halls: [...prev.halls, newHall] } : null);
    };
    
    const handleRemoveHall = (index: number) => {
        if (!activeExam || activeExam.halls.length <= 1) return;
        setActiveExam(prev => prev ? { ...prev, halls: prev.halls.filter((_, i) => i !== index) } : null);
    };

    const handleSetChange = (index: number, field: keyof Omit<FormStudentSet, 'id'>, value: string) => {
        if (!activeExam) return;
        const updatedSets = [...activeExam.studentSets];
        updatedSets[index] = { ...updatedSets[index], [field]: value };
        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
    };

    const handleAddSet = () => {
        if (!activeExam) return;
        const newSet: FormStudentSet = { id: `new-set-${Date.now()}`, subject: 'New Subject', studentCount: 20 };
        setActiveExam(prev => prev ? { ...prev, studentSets: [...prev.studentSets, newSet] } : null);
    };

    const handleRemoveSet = (index: number) => {
        if (!activeExam || activeExam.studentSets.length <= 1) return;
        setActiveExam(prev => prev ? { ...prev, studentSets: prev.studentSets.filter((_, i) => i !== index) } : null);
    };

    // --- Actions ---

    const validateAndParseForm = (): Exam | null => {
        if (!activeExam) return null;

        if (!activeExam.title.trim() || !activeExam.date || activeExam.halls.length === 0 || activeExam.studentSets.length === 0) {
            setFormError("Please fill in all exam details, and add at least one hall and one student set.");
            return null;
        }

        try {
            const parsedHalls = activeExam.halls.map(h => {
                const rows = parseInt(String(h.rows), 10);
                const cols = parseInt(String(h.cols), 10);
                if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
                    throw new Error(`Invalid dimensions for hall "${h.name}". Please enter positive numbers.`);
                }
                return { ...h, id: h.id || `hall-${Date.now()}`, rows, cols };
            });

            const parsedSets = activeExam.studentSets.map(s => {
                const studentCount = parseInt(String(s.studentCount), 10);
                if (isNaN(studentCount) || studentCount <= 0) {
                    throw new Error(`Invalid student count for set "${s.subject}". Please enter a positive number.`);
                }
                return { ...s, id: s.id || `set-${Date.now()}`, studentCount };
            });

            return {
                ...activeExam,
                halls: parsedHalls,
                studentSets: parsedSets,
                id: activeExam.id || `exam${Date.now()}`,
                createdBy: activeExam.createdBy || user?.id || '',
            };
        } catch (e: any) {
            setFormError(e.message);
            return null;
        }
    };
    
    const handleSave = async () => {
        if (!activeExam || !user) return;
        setFormError('');

        const parsedExam = validateAndParseForm();
        if (!parsedExam) return;
        
        if (activeExam.id) { // Is an update
            const originalExam = exams.find(e => e.id === activeExam.id);
            if(originalExam) {
                 const hallsChanged = JSON.stringify(parsedExam.halls.map(({id, ...rest}) => rest)) !== JSON.stringify(originalExam.halls.map(({id, ...rest}) => rest));
                 const setsChanged = JSON.stringify(parsedExam.studentSets.map(({id, ...rest}) => rest)) !== JSON.stringify(originalExam.studentSets.map(({id, ...rest}) => rest));
                 if ((hallsChanged || setsChanged) && parsedExam.seatingPlan) {
                    parsedExam.seatingPlan = undefined;
                 }
            }
        }
        
        setIsLoading(true);
        if (activeExam.id) {
            await updateExam(parsedExam);
        } else {
             await createExam({
                title: parsedExam.title,
                date: parsedExam.date,
                halls: parsedExam.halls,
                studentSets: parsedExam.studentSets
            }, user.id);
        }
        
        await fetchExams();
        setIsLoading(false);
        setActiveExam(null);
    };

    const handleGeneratePlan = async () => {
        if (!activeExam) return;
        setFormError('');

        const parsedExam = validateAndParseForm();
        if (!parsedExam) return;
        
        const plan = generateSeatingPlan(parsedExam.halls, parsedExam.studentSets);
        if (plan) {
            const examWithPlan = { ...parsedExam, seatingPlan: plan };
            setIsLoading(true);
            const updated = await updateExam(examWithPlan);
            await fetchExams();
            setActiveExam(JSON.parse(JSON.stringify(updated)));
            setIsLoading(false);
        } else {
            setFormError('Failed to generate seating plan. Not enough seats for all students. Please add more hall space or reduce the number of students.');
        }
    };
    
    const handleDeleteExam = async (examId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this exam? This action cannot be undone.')) {
            setIsLoading(true);
            await deleteExam(examId);
            if (activeExam?.id === examId) {
                setActiveExam(null);
            }
            await fetchExams();
            setIsLoading(false);
        }
    };

    const handleSelectExam = (exam: Exam) => {
        setActiveExam(JSON.parse(JSON.stringify(exam))); // Deep copy to avoid mutation issues
        setFormError('');
    };

    const handleStartCreating = () => {
        setActiveExam({ ...initialNewExamState, createdBy: user?.id || '' });
        setFormError('');
    };
    
    const handleCancel = () => {
        setActiveExam(null);
        setFormError('');
    }

    if (!user?.permissionGranted) {
        return (
             <div className="min-h-screen bg-slate-50">
                <Header />
                 <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
                    <Card>
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Permission Denied</h2>
                        <p className="text-slate-600">Your account does not have the necessary permissions to manage exams. Please contact the administrator.</p>
                    </Card>
                </main>
            </div>
        )
    }

    if (isLoading && !activeExam) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Header />
                <main className="max-w-7xl mx-auto py-6 px-4 text-center">Loading exam data...</main>
            </div>
        );
    }
    
    if (activeExam) {
        const isNewExam = !activeExam.id;
        const originalExam = isNewExam ? null : exams.find(e => e.id === activeExam.id);
        const isDirty = originalExam ? JSON.stringify(activeExam) !== JSON.stringify(originalExam) : true;

        const parsedStudentSetsForVisualizer: StudentSet[] = activeExam.studentSets.map(set => ({
            ...set,
            studentCount: Number(set.studentCount) || 0,
        }));

        return (
             <div className="min-h-screen bg-slate-50">
                <Header />
                <main className="max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="relative mb-6">
                        <h2 className="text-3xl font-bold text-slate-800 text-center">{isNewExam ? 'Create New Exam' : 'Edit Exam'}</h2>
                        <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
                            <Button onClick={handleCancel} variant="secondary">&larr; Back to Exams</Button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="mx-auto max-w-2xl space-y-8">
                            <Card>
                                <h3 className="text-xl font-semibold mb-4 border-b pb-2">Exam Details</h3>
                                <div className="space-y-4">
                                    <Input label="Exam Title" value={activeExam.title} onChange={e => handleFormChange('title', e.target.value)} placeholder="e.g., Final Term Exam"/>
                                    <Input label="Date" type="date" value={activeExam.date} onChange={e => handleFormChange('date', e.target.value)} />
                                </div>
                            </Card>

                            <Card>
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h3 className="text-xl font-semibold">Hall Configuration</h3>
                                    <Button onClick={handleAddHall} variant="secondary" className="text-sm !py-1 !px-3">+ Add Hall</Button>
                                </div>
                                <div className="space-y-3">
                                    {activeExam.halls.map((hall, index) => (
                                        <div key={hall.id || index} className="p-2 bg-slate-50 rounded-lg space-y-2">
                                            <div className="flex justify-between items-start">
                                                <Input containerClassName="flex-grow" placeholder="Hall Name" value={hall.name} onChange={e => handleHallChange(index, 'name', e.target.value)} />
                                                {activeExam.halls.length > 1 && <button onClick={() => handleRemoveHall(index)} className="text-red-500 hover:text-red-700 p-2 ml-1"><TrashIcon /></button>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input type="number" min="1" label="Rows" value={hall.rows} onChange={e => handleHallChange(index, 'rows', e.target.value)} />
                                                <Input type="number" min="1" label="Cols" value={hall.cols} onChange={e => handleHallChange(index, 'cols', e.target.value)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                             <Card>
                                 <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h3 className="text-xl font-semibold">Student Sets</h3>
                                    <Button onClick={handleAddSet} variant="secondary" className="text-sm !py-1 !px-3">+ Add Set</Button>
                                </div>
                                <div className="space-y-3">
                                    {activeExam.studentSets.map((set, index) => (
                                        <div key={set.id || index} className="p-2 bg-slate-50 rounded-lg space-y-2">
                                             <div className="flex justify-between items-start">
                                                <Input containerClassName="flex-grow" placeholder="Set Code (e.g., 101)" value={set.subject} onChange={e => handleSetChange(index, 'subject', e.target.value)} />
                                                {activeExam.studentSets.length > 1 && <button onClick={() => handleRemoveSet(index)} className="text-red-500 hover:text-red-700 p-2 ml-1"><TrashIcon /></button>}
                                             </div>
                                            <Input type="number" min="1" label="# of Students" value={set.studentCount} onChange={e => handleSetChange(index, 'studentCount', e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card>
                                 <h3 className="text-xl font-semibold mb-4">Actions</h3>
                                <div className="space-y-2">
                                    <Button onClick={handleSave} className="w-full" disabled={!isDirty || isLoading}>
                                        {isLoading && isDirty ? 'Saving...' : (isNewExam ? 'Create Exam' : 'Save Changes')}
                                    </Button>
                                    <Button onClick={handleGeneratePlan} className="w-full" variant="secondary" disabled={isDirty || isLoading}>
                                        {activeExam.seatingPlan ? 'Re-generate Plan' : 'Generate Seating Plan'}
                                    </Button>
                                </div>
                                {isDirty && !isNewExam && <p className="text-xs text-amber-600 mt-2 text-center">You have unsaved changes.</p>}
                                {formError && <p className="text-sm text-red-600 mt-3 text-center">{formError}</p>}

                                 {!isNewExam && (
                                     <div className="mt-6 pt-4 border-t border-red-200">
                                        <h4 className="text-lg font-semibold text-red-600 mb-2 text-center">Danger Zone</h4>
                                        <Button
                                            onClick={() => handleDeleteExam(activeExam.id)}
                                            variant="danger"
                                            className="w-full"
                                            disabled={isLoading}
                                        >
                                            Delete This Exam
                                        </Button>
                                        <p className="text-xs text-slate-500 mt-2 text-center">This action is permanent and cannot be undone.</p>
                                     </div>
                                )}
                             </Card>
                        </div>
                        
                        <Card>
                             <h3 className="text-xl font-semibold mb-4 text-center">Seating Arrangement Preview</h3>
                            {activeExam.seatingPlan ? (
                                <div className="space-y-8">
                                {activeExam.halls.map(hall => {
                                    const hallInPlan = activeExam.seatingPlan?.[hall.id] ? hall : null;
                                    if (!hallInPlan) return null;

                                    const parsedHall: Hall = {
                                        ...hallInPlan,
                                        rows: Number(hallInPlan.rows) || 0,
                                        cols: Number(hallInPlan.cols) || 0,
                                    };

                                    return (
                                        <SeatingPlanVisualizer 
                                            key={hall.id} 
                                            hall={parsedHall}
                                            plan={activeExam.seatingPlan!}
                                            studentSets={parsedStudentSetsForVisualizer}
                                        />
                                    )
                                })}
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 py-10 min-h-[300px] flex flex-col justify-center items-center">
                                    <p className="mb-4">No seating plan generated yet. Configure and save your exam, then generate the plan.</p>
                                    <Button onClick={handleGeneratePlan} variant="primary" disabled={isDirty || isLoading}>Generate Plan</Button>
                                </div>
                            )}
                        </Card>
                    </div>
                </main>
            </div>
        )
    }

    // Main list view
    return (
        <div className="min-h-screen bg-slate-50">
            <Header />
            <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-slate-800">My Exams</h2>
                    <Button onClick={handleStartCreating}>+ Create New Exam</Button>
                </div>
                <Card>
                    {exams.length > 0 ? (
                         <div className="space-y-4">
                            {exams.map(exam => (
                                <div key={exam.id} className="group flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                                    <div className="flex-grow cursor-pointer" onClick={() => handleSelectExam(exam)}>
                                        <p className="font-semibold">{exam.title}</p>
                                        <p className="text-sm text-slate-500">Date: {exam.date}</p>
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-slate-500 mb-4">You have not created any exams yet.</p>
                            <Button onClick={handleStartCreating}>Create Your First Exam</Button>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
};

export default TeacherDashboard;
