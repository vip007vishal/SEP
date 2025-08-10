
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Exam, Hall, StudentSet, SeatingPlan } from '../types';
import { getExamsForTeacher, generateSeatingPlan, updateExam, createExam, deleteExam } from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';

// Make XLSX available from the window object loaded via CDN
declare global {
  interface Window { XLSX: any; }
}
const XLSX = window.XLSX;


// Types for form state to allow empty strings for number inputs
interface FormHall extends Omit<Hall, 'rows'|'cols'> {
    rows: string | number;
    cols: string | number;
}
interface FormStudentSet extends Omit<StudentSet, 'studentCount'> {
    entryType: 'manual' | 'upload';
    studentCount: string | number; // For manual entry
    students: string[]; // For upload
    files: File[];
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

const UploadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);


const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isParsingFile, setIsParsingFile] = useState(false);
    const [activeExam, setActiveExam] = useState<FormExam | null>(null);
    const [originalActiveExam, setOriginalActiveExam] = useState<FormExam | null>(null);
    const [formError, setFormError] = useState('');
    
    const initialNewExamState: FormExam = {
        id: '',
        title: '',
        date: '',
        halls: [{ id: `new-hall-${Date.now()}`, name: 'Hall A', rows: 8, cols: 10 }],
        studentSets: [{ id: `new-set-${Date.now()}`, subject: '', studentCount: '', students: [], files: [], entryType: 'manual' }],
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

    const handleSetChange = (index: number, field: 'subject' | 'studentCount', value: string) => {
        if (!activeExam) return;
        const updatedSets = [...activeExam.studentSets];
        updatedSets[index] = { ...updatedSets[index], [field]: value };
        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
    };

    const handleSetEntryTypeChange = (index: number, type: 'manual' | 'upload') => {
        if (!activeExam) return;
        const updatedSets = [...activeExam.studentSets];
        const currentSet = { ...updatedSets[index], entryType: type };
        
        if (type === 'manual') {
            currentSet.students = [];
            currentSet.files = [];
        } else { // 'upload'
            currentSet.studentCount = '';
        }

        updatedSets[index] = currentSet;
        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
    };

    const handleAddSet = () => {
        if (!activeExam) return;
        const newSet: FormStudentSet = { id: `new-set-${Date.now()}`, subject: '', studentCount: '', students: [], files: [], entryType: 'manual' };
        setActiveExam(prev => prev ? { ...prev, studentSets: [...prev.studentSets, newSet] } : null);
    };

    const handleRemoveSet = (index: number) => {
        if (!activeExam || activeExam.studentSets.length <= 1) return;
        setActiveExam(prev => prev ? { ...prev, studentSets: prev.studentSets.filter((_, i) => i !== index) } : null);
    };

    const handleFileUpload = async (index: number, fileList: FileList | null) => {
        if (!activeExam || !fileList || fileList.length === 0) return;

        if (typeof XLSX === 'undefined') {
            setFormError("File reading library (XLSX) is not loaded. Please check your internet connection and refresh.");
            return;
        }

        setIsParsingFile(true);
        setFormError('');
        
        const updatedSets = [...activeExam.studentSets];
        const currentSet = updatedSets[index];
        
        let allRegisterNumbers: string[] = [];
        const newFiles = Array.from(fileList);
        
        for (const file of newFiles) {
            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const json: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    const registerNumbers = json.map(row => row[0]).filter(val => val != null && String(val).trim() !== '').map(String);
                    allRegisterNumbers.push(...registerNumbers);
                }
            } catch (error) {
                console.error("Error parsing file:", error);
                setFormError(`Error processing file "${file.name}". Please ensure it is a valid Excel file.`);
                setIsParsingFile(false);
                return;
            }
        }
        
        const combinedStudents = [...new Set([...currentSet.students, ...allRegisterNumbers])];
        const combinedFiles = [...(currentSet.files || []), ...newFiles];

        // Auto-generate a subject name from the first uploaded file if the set doesn't have a name yet.
        const subject = currentSet.subject || (fileList && fileList.length > 0 ? fileList[0].name.replace(/\.[^/.]+$/, "") : `Uploaded Set ${index + 1}`);

        updatedSets[index] = { 
            ...currentSet,
            entryType: 'upload',
            subject: subject, // Set the auto-generated subject
            students: combinedStudents,
            studentCount: '',
            files: combinedFiles,
        };

        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
        setIsParsingFile(false);
    };

    const handleClearStudents = (index: number) => {
        if (!activeExam) return;
        const updatedSets = [...activeExam.studentSets];
        updatedSets[index] = { ...updatedSets[index], students: [], files: [], subject: '' }; // Also clear subject
        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
    };

    const validateAndParseForm = (): Exam | null => {
        if (!activeExam) return null;

        try {
            const parsedHalls = activeExam.halls.map(h => {
                const rows = parseInt(String(h.rows), 10);
                const cols = parseInt(String(h.cols), 10);
                if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
                    throw new Error(`Invalid dimensions for hall "${h.name}". Please enter positive numbers.`);
                }
                return { ...h, id: h.id || `hall-${Date.now()}`, rows, cols };
            });

            if (parsedHalls.length === 0) throw new Error("Please add at least one hall.");

            const parsedSets: StudentSet[] = activeExam.studentSets.map((s, index) => {
                if (!s.subject.trim()) {
                    throw new Error(`Please provide a name/code for Set ${index + 1}.`);
                }
                if (s.entryType === 'manual') {
                    const studentCount = parseInt(String(s.studentCount), 10);
                    if (isNaN(studentCount) || studentCount <= 0) {
                        throw new Error(`Please enter a valid number of students for set "${s.subject}".`);
                    }
                    const padding = String(studentCount).length;
                    const generatedStudents = Array.from({ length: studentCount }, (_, i) => `${s.subject.replace(/\s+/g, '')}${(i + 1).toString().padStart(padding, '0')}`);
                    return {
                        id: s.id || `set-${Date.now()}`,
                        subject: s.subject,
                        studentCount: studentCount,
                        students: generatedStudents,
                    };
                } else { // 'upload'
                    if (s.students.length === 0) {
                        throw new Error(`No students have been uploaded for Set "${s.subject}". Please upload an Excel file.`);
                    }
                    
                    return {
                        id: s.id || `set-${Date.now()}`,
                        subject: s.subject,
                        studentCount: s.students.length,
                        students: s.students,
                    };
                }
            });

            if (parsedSets.length === 0) throw new Error("Please add at least one student set.");

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
        
        if (activeExam.id) {
            const originalExam = exams.find(e => e.id === activeExam.id);
            if(originalExam) {
                 const hallsChanged = JSON.stringify(parsedExam.halls.map(({id, ...rest}) => rest)) !== JSON.stringify(originalExam.halls.map(({id, ...rest}) => rest));
                 const setsChanged = JSON.stringify(parsedExam.studentSets.map(s => ({subject: s.subject, students: s.students}))) !== JSON.stringify(originalExam.studentSets.map(s => ({subject: s.subject, students: s.students})));
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
                studentSets: parsedExam.studentSets.map(s => ({ subject: s.subject, students: s.students }))
            }, user.id);
        }
        
        await fetchExams();
        setIsLoading(false);
        setActiveExam(null);
        setOriginalActiveExam(null);
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
            // Reload into form state
            const formExamState = {
                ...examWithPlan,
                studentSets: activeExam.studentSets.map((s, i) => ({
                    ...s,
                    ...examWithPlan.studentSets[i]
                }))
            };
            setActiveExam(formExamState);
            setOriginalActiveExam(JSON.parse(JSON.stringify(formExamState)));
            setIsLoading(false);
        } else {
            setFormError('Failed to generate seating plan. Not enough seats for all students.');
        }
    };
    
    const handleDeleteExam = async (examId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this exam? This action cannot be undone.')) {
            setIsLoading(true);
            await deleteExam(examId);
            if (activeExam?.id === examId) {
                setActiveExam(null);
                setOriginalActiveExam(null);
            }
            await fetchExams();
            setIsLoading(false);
        }
    };

    const handleSelectExam = (exam: Exam) => {
        const formExam: FormExam = {
            ...JSON.parse(JSON.stringify(exam)),
            studentSets: exam.studentSets.map((s: StudentSet): FormStudentSet => ({
                ...s,
                studentCount: s.studentCount,
                files: [],
                entryType: 'upload',
            }))
        };
        setActiveExam(formExam);
        setOriginalActiveExam(JSON.parse(JSON.stringify(formExam)));
        setFormError('');
    };

    const handleStartCreating = () => {
        const newExamState = { ...initialNewExamState, createdBy: user?.id || '' };
        setActiveExam(newExamState);
        setOriginalActiveExam(JSON.parse(JSON.stringify(newExamState)));
        setFormError('');
    };
    
    const handleCancel = () => {
        setActiveExam(null);
        setOriginalActiveExam(null);
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
        const isDirty = originalActiveExam ? JSON.stringify(activeExam) !== JSON.stringify(originalActiveExam) : false;
        
        const parsedStudentSetsForVisualizer: StudentSet[] = (activeExam.studentSets || []).map(set => ({
            id: set.id,
            subject: set.subject || (set.entryType === 'upload' ? 'Uploaded Set' : 'Unnamed Set'),
            studentCount: set.entryType === 'manual' ? (Number(set.studentCount) || 0) : set.students.length,
            students: set.students || [],
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
                                        <div key={hall.id || index} className="p-3 bg-slate-50 rounded-lg space-y-2">
                                            <div className="flex justify-between items-start">
                                                <Input containerClassName="flex-grow mr-2" label={`Hall ${index + 1} Name`} placeholder="e.g., Main Hall" value={hall.name} onChange={e => handleHallChange(index, 'name', e.target.value)} />
                                                {activeExam.halls.length > 1 && <button onClick={() => handleRemoveHall(index)} className="text-red-500 hover:text-red-700 p-2 mt-6"><TrashIcon /></button>}
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
                                <div className="space-y-4">
                                    {activeExam.studentSets.map((set, index) => (
                                        <div key={set.id || index} className="p-3 bg-slate-50 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-lg font-semibold text-slate-800">
                                                    {set.subject || `Set ${index + 1}`}
                                                </h4>
                                                {activeExam.studentSets.length > 1 && <button onClick={() => handleRemoveSet(index)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon /></button>}
                                            </div>
                                            
                                            <div className="flex items-center space-x-4 mb-3 text-sm">
                                                <label className="flex items-center cursor-pointer">
                                                    <input type="radio" name={`entryType-${index}`} checked={set.entryType === 'manual'} onChange={() => handleSetEntryTypeChange(index, 'manual')} className="form-radio text-violet-600 focus:ring-violet-500" />
                                                    <span className="ml-2 text-slate-700">Manual Entry</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input type="radio" name={`entryType-${index}`} checked={set.entryType === 'upload'} onChange={() => handleSetEntryTypeChange(index, 'upload')} className="form-radio text-violet-600 focus:ring-violet-500"/>
                                                    <span className="ml-2 text-slate-700">Upload Excel</span>
                                                </label>
                                            </div>
                                            
                                            {set.entryType === 'manual' ? (
                                                <div className="space-y-3">
                                                    <Input 
                                                        label="Set Name / Code" 
                                                        placeholder="e.g., Physics 101 or CS-A" 
                                                        value={set.subject} 
                                                        onChange={e => handleSetChange(index, 'subject', e.target.value)} 
                                                    />
                                                    <Input type="number" min="1" label="Number of Students" placeholder="e.g., 50" value={set.studentCount} onChange={e => handleSetChange(index, 'studentCount', e.target.value)} />
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                     <Input 
                                                        label="Set Name / Code" 
                                                        placeholder="e.g., Physics 101 or CS-A" 
                                                        value={set.subject} 
                                                        onChange={e => handleSetChange(index, 'subject', e.target.value)} 
                                                    />
                                                    <div className="p-3 bg-white rounded-md border border-slate-200">
                                                        <label htmlFor={`file-upload-${index}`} className={`cursor-pointer bg-violet-100 text-violet-700 font-semibold text-sm py-2 px-4 rounded-lg hover:bg-violet-200 transition-all w-full text-center inline-block ${isParsingFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                            <UploadIcon className="inline-block mr-2 h-4 w-4" />
                                                            {isParsingFile ? 'Parsing...' : 'Upload Student List(s)'}
                                                        </label>
                                                        <input id={`file-upload-${index}`} type="file" multiple accept=".xlsx, .xls" className="hidden" onChange={(e) => handleFileUpload(index, e.target.files)} disabled={isParsingFile} />
                                                        <p className="text-xs text-slate-400 mt-2 text-center">Register numbers in first column.</p>

                                                        {set.students.length > 0 ? (
                                                            <div className="text-sm mt-3">
                                                                <p className="font-semibold text-green-700 text-center">{set.students.length} unique students loaded.</p>
                                                                {set.files?.length > 0 && (
                                                                    <div className="mt-2 text-center">
                                                                        <p className="text-xs text-slate-600 font-medium">Uploaded files:</p>
                                                                        <ul className="text-xs text-slate-500 list-none">
                                                                            {set.files.map((file, i) => <li key={`${file.name}-${i}`}>{file.name}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                <button onClick={() => handleClearStudents(index)} className="text-xs text-red-500 hover:underline mt-2 w-full text-center">Clear uploaded students</button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-500 mt-2 text-center">No students uploaded yet.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card>
                                 <h3 className="text-xl font-semibold mb-4">Actions</h3>
                                <div className="space-y-2">
                                    <Button onClick={handleSave} className="w-full" disabled={!isDirty || isLoading || isParsingFile}>
                                        {(isLoading && isDirty) ? 'Saving...' : (isNewExam ? 'Create Exam' : 'Save Changes')}
                                    </Button>
                                    <Button onClick={handleGeneratePlan} className="w-full" variant="secondary" disabled={isDirty || isLoading || isParsingFile}>
                                        {activeExam.seatingPlan ? 'Re-generate Plan' : 'Generate Seating Plan'}
                                    </Button>
                                </div>
                                {isDirty && <p className="text-xs text-amber-600 mt-2 text-center">You have unsaved changes. Save before generating a plan.</p>}
                                {formError && <p className="text-sm text-red-600 mt-3 text-center">{formError}</p>}

                                 {!isNewExam && (
                                     <div className="mt-6 pt-4 border-t border-red-200">
                                        <h4 className="text-lg font-semibold text-red-600 mb-2 text-center">Danger Zone</h4>
                                        <Button
                                            onClick={() => handleDeleteExam(activeExam.id)}
                                            variant="danger"
                                            className="w-full"
                                            disabled={isLoading || isParsingFile}
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
                                    <Button onClick={handleGeneratePlan} variant="primary" disabled={isDirty || isLoading || isParsingFile}>Generate Plan</Button>
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
