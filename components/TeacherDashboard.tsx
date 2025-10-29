import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Exam, Hall, StudentSet, HallTemplate, StudentSetTemplate, SeatDefinition, HallConstraint } from '../types';
import { 
    getExamsForTeacher, 
    generateSeatingPlan,
    generateClassicSeatingPlan,
    updateExam, 
    createExam, 
    deleteExam, 
    getHallTemplatesForTeacher, 
    createHallTemplate, 
    deleteHallTemplate,
    getStudentSetTemplatesForTeacher,
    createStudentSetTemplate,
    deleteStudentSetTemplate
} from '../services/api';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Textarea from './common/Textarea';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';
import HallLayoutEditor from './common/HallLayoutEditor';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// Types for form state to allow empty strings for number inputs
interface FormHall extends Hall {}
interface FormStudentSet extends Omit<StudentSet, 'studentCount'> {
    studentCount: string | number;
    students?: string[];
    isPlaceholder?: boolean;
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

const EditIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
  </svg>
);


const DownloadIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);

const ExcelIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${className}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.16,3.16a1.2,1.2,0,0,0-.81-.29H3.65A1.2,1.2,0,0,0,2.45,4.07V19.93a1.2,1.2,0,0,0,1.2,1.2h16.7a1.2,1.2,0,0,0,1.2-1.2V4.07a1.2,1.2,0,0,0-.39-.91ZM14.21,12.19,11.83,15a.34.34,0,0,1-.31.18.33.33,0,0,1-.3-.17l-2.4-2.82a.33.33,0,0,1,.24-.53h1.37a.33.33,0,0,1,.3.17l1,1.18,1-1.18a.33.33,0,0,1,.3-.17h1.37a.33.33,0,0,1,.24.53Z"/>
    </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const GridIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);


const isSimpleGrid = (layout: SeatDefinition[]): { isGrid: true; rows: number; cols: number } | { isGrid: false } => {
    if (layout.length === 0) {
        return { isGrid: false };
    }

    let maxRow = -1;
    let maxCol = -1;
    for (const seat of layout) {
        if (seat.row > maxRow) maxRow = seat.row;
        if (seat.col > maxCol) maxCol = seat.col;
    }
    
    const rows = maxRow + 1;
    const cols = maxCol + 1;

    if (layout.length !== rows * cols) {
        return { isGrid: false };
    }

    const seatSet = new Set(layout.map(s => `${s.row},${s.col}`));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!seatSet.has(`${r},${c}`)) {
                return { isGrid: false };
            }
        }
    }
    
    return { isGrid: true, rows, cols };
};


const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [hallTemplates, setHallTemplates] = useState<HallTemplate[]>([]);
    const [studentSetTemplates, setStudentSetTemplates] = useState<StudentSetTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeExam, setActiveExam] = useState<FormExam | null>(null);
    const [formError, setFormError] = useState('');
    const [formWarning, setFormWarning] = useState('');
    const [isHallTemplateModalOpen, setIsHallTemplateModalOpen] = useState(false);
    
    // Unified state for Hall Layout Editor
    const [hallEditorState, setHallEditorState] = useState<{ mode: 'closed' | 'edit-hall' | 'create-template', hallIndex: number | null }>({ mode: 'closed', hallIndex: null });

    // State for grid-based hall template creation
    const [isGridTemplateModalOpen, setIsGridTemplateModalOpen] = useState(false);
    const [newGridTemplate, setNewGridTemplate] = useState({ name: '', rows: '8', cols: '10' });
    const [gridTemplateFormError, setGridTemplateFormError] = useState('');

    // State for student set template modal
    const [isSetTemplateModalOpen, setIsSetTemplateModalOpen] = useState<{open: boolean, index: number | null}>({open: false, index: null});

    const hallRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const excelFileRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // State for quick actions on the dashboard
    const [generatingPlanId, setGeneratingPlanId] = useState<string | null>(null);
    const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const downloadRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Student Set Template Form State
    const [newStudentSetTemplate, setNewStudentSetTemplate] = useState({ subject: '', studentCount: '' });
    const [studentSetTemplateFormError, setStudentSetTemplateFormError] = useState('');

    // State for saving templates from exam form
    const [savingTemplateForHallId, setSavingTemplateForHallId] = useState<string | null>(null);
    const [recentlySavedHallIds, setRecentlySavedHallIds] = useState<string[]>([]);
    const [savingTemplateForSetId, setSavingTemplateForSetId] = useState<string | null>(null);
    const [recentlySavedSetIds, setRecentlySavedSetIds] = useState<string[]>([]);

    const [activeTab, setActiveTab] = useState<'ai' | 'classic'>('ai');


    const initialNewExamState: FormExam = {
        id: '',
        title: '',
        date: '',
        halls: [],
        studentSets: [],
        aiSeatingRules: '',
        seatingType: 'normal',
        editorMode: 'ai',
        createdBy: user?.id || '',
        adminId: user?.adminId || ''
    };

    const fetchExams = useCallback(async () => {
        if (user) {
            const data = await getExamsForTeacher(user.id);
            setExams(data);
        }
    }, [user]);

    const fetchHallTemplates = useCallback(async () => {
        if (user) {
            const data = await getHallTemplatesForTeacher(user.id);
            setHallTemplates(data);
        }
    }, [user]);

    const fetchStudentSetTemplates = useCallback(async () => {
        if (user) {
            const data = await getStudentSetTemplatesForTeacher(user.id);
            setStudentSetTemplates(data);
        }
    }, [user]);

    useEffect(() => {
        const loadInitialData = async () => {
             if (user?.permissionGranted) {
                setIsLoading(true);
                await Promise.all([fetchExams(), fetchHallTemplates(), fetchStudentSetTemplates()]);
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        }
       loadInitialData();
    }, [fetchExams, fetchHallTemplates, fetchStudentSetTemplates, user]);

    // --- Form State Handlers ---
    const handleFormChange = (field: 'title' | 'date' | 'aiSeatingRules', value: string) => {
        if (!activeExam) return;
        setActiveExam(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleEditorModeChange = (mode: 'ai' | 'classic') => {
        if (!activeExam) return;
        setActiveExam(prev => prev ? { ...prev, editorMode: mode, seatingType: 'normal' } : null);
    };

    const handleSeatingTypeChange = (type: 'normal' | 'fair') => {
        if (!activeExam) return;
        setActiveExam(prev => prev ? { ...prev, seatingType: type } : null);
    };

    const handleHallNameChange = (index: number, name: string) => {
        if (!activeExam) return;
        const updatedHalls = [...activeExam.halls];
        updatedHalls[index] = { ...updatedHalls[index], name };
        setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
    };

    const handleAddHall = () => {
        if (!activeExam) return;
        const newHallName = `Hall ${String.fromCharCode(65 + activeExam.halls.length)}`;
        const newHall: FormHall = { 
            id: `new-hall-${Date.now()}`, 
            name: newHallName, 
            layout: [],
            constraints: { type: 'no-limit', arrangement: 'horizontal' }
        };
        setActiveExam(prev => prev ? { ...prev, halls: [...prev.halls, newHall] } : null);
    };

    const handleSetHallLayoutType = (index: number, type: 'normal' | 'advanced') => {
        if (!activeExam) return;
        
        if (type === 'normal') {
            const newLayout: SeatDefinition[] = [];
            const rows = 8;
            const cols = 10;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    newLayout.push({ id: `seat-${r}-${c}-${Date.now()}`, row: r, col: c, type: 'standard' });
                }
            }
            const updatedHalls = [...activeExam.halls];
            updatedHalls[index] = { ...updatedHalls[index], layout: newLayout };
            setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
        } else { // advanced
            setHallEditorState({ mode: 'edit-hall', hallIndex: index });
        }
    };

    const handleHallDimensionChange = (index: number, dimension: 'rows' | 'cols', value: string) => {
        if (!activeExam) return;

        const gridCheck = isSimpleGrid(activeExam.halls[index].layout);
        let currentRows = gridCheck.isGrid ? gridCheck.rows : 8;
        let currentCol = gridCheck.isGrid ? gridCheck.cols : 10;

        const numericValue = parseInt(value, 10);
        if (isNaN(numericValue) || numericValue <= 0 || numericValue > 50) return;

        if (dimension === 'rows') currentRows = numericValue;
        else currentCol = numericValue;

        const newLayout: SeatDefinition[] = [];
        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCol; c++) {
                newLayout.push({ id: `seat-${r}-${c}-${Date.now()}`, row: r, col: c, type: 'standard' });
            }
        }

        const updatedHalls = [...activeExam.halls];
        updatedHalls[index] = { ...updatedHalls[index], layout: newLayout };
        setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
    };

    const handleAddHallFromTemplate = (template: HallTemplate) => {
        if (!activeExam) return;
        let newHallName = template.name;
        // Ensure name is unique within the exam
        if (activeExam.halls.some(h => h.name === newHallName)) {
            newHallName = `${newHallName} (Copy)`;
        }
        const newHall: FormHall = {
            id: `hall-from-template-${Date.now()}`,
            name: newHallName,
            layout: template.layout.map(s => ({ ...s })), // Deep copy layout
            constraints: { type: 'no-limit', arrangement: 'horizontal' },
        };
        setActiveExam(prev => prev ? { ...prev, halls: [...prev.halls, newHall] } : null);
    };
    
    const handleSaveFromEditor = async (data: { layout: SeatDefinition[], name?: string }) => {
        if (hallEditorState.mode === 'create-template' && data.name && user) {
            await createHallTemplate({ name: data.name, layout: data.layout }, user.id);
            await fetchHallTemplates();
        } else if (hallEditorState.mode === 'edit-hall' && hallEditorState.hallIndex !== null && activeExam) {
            const hallIndex = hallEditorState.hallIndex;
            const updatedHalls = [...activeExam.halls];
            updatedHalls[hallIndex] = { ...updatedHalls[hallIndex], layout: data.layout };
            setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
        }
        setHallEditorState({ mode: 'closed', hallIndex: null });
    };

    const handleRemoveHall = (index: number) => {
        if (!activeExam) return;
        setActiveExam(prev => prev ? { ...prev, halls: prev.halls.filter((_, i) => i !== index) } : null);
    };

    const handleConstraintTypeChange = (hallIndex: number, type: 'no-limit' | 'advanced') => {
        if (!activeExam) return;
        const updatedHalls = [...activeExam.halls];
        const currentHall = updatedHalls[hallIndex];
        
        let newConstraints: HallConstraint = { ...(currentHall.constraints || { arrangement: 'horizontal' }), type };
        if (type === 'advanced' && !newConstraints.allowedSetIds) {
            newConstraints.allowedSetIds = [];
        }

        updatedHalls[hallIndex] = { ...currentHall, constraints: newConstraints };
        setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
    };

    const handleArrangementChange = (hallIndex: number, arrangement: 'horizontal' | 'vertical') => {
        if (!activeExam) return;
        const updatedHalls = [...activeExam.halls];
        const currentHall = updatedHalls[hallIndex];
        
        updatedHalls[hallIndex] = { 
            ...currentHall, 
            constraints: { 
                ...(currentHall.constraints || { type: 'no-limit' }),
                arrangement 
            }
        };
        setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
    };
    
    const handleAllowedSetChange = (hallIndex: number, setId: string, isChecked: boolean) => {
        if (!activeExam) return;
        const updatedHalls = [...activeExam.halls];
        const currentHall = updatedHalls[hallIndex];
        
        if (currentHall.constraints?.type === 'advanced') {
            const currentAllowed = currentHall.constraints.allowedSetIds || [];
            const newAllowedSetIds = isChecked 
                ? [...currentAllowed, setId]
                : currentAllowed.filter(id => id !== setId);
            
            updatedHalls[hallIndex] = { 
                ...currentHall, 
                constraints: { ...currentHall.constraints, allowedSetIds: newAllowedSetIds }
            };
            setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
        }
    };


    const handleSetChange = (index: number, field: keyof Omit<FormStudentSet, 'id' | 'students' | 'isPlaceholder'>, value: string) => {
        if (!activeExam) return;
        const updatedSets = [...activeExam.studentSets];
        updatedSets[index] = { ...updatedSets[index], [field]: value };
        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
    };
    
    const handleAddSetPlaceholder = () => {
        if (!activeExam) return;
        const newSet: FormStudentSet = { id: `new-set-${Date.now()}`, subject: '', studentCount: '', isPlaceholder: true };
        setActiveExam(prev => prev ? { ...prev, studentSets: [...prev.studentSets, newSet] } : null);
    };

    const handleConfigureSet = (index: number, type: 'custom' | 'template', template?: StudentSetTemplate) => {
        if (!activeExam) return;
        const updatedSets = [...activeExam.studentSets];

        if (type === 'custom') {
            updatedSets[index] = { ...updatedSets[index], subject: '', studentCount: '', isPlaceholder: false };
        } else if (type === 'template' && template) {
            let newSetSubject = template.subject;
            // Ensure subject is unique within the exam before adding
            if (activeExam.studentSets.some((s, i) => i !== index && s.subject === newSetSubject)) {
                newSetSubject = `${newSetSubject} (Copy)`;
            }
            updatedSets[index] = {
                ...updatedSets[index],
                subject: newSetSubject,
                studentCount: template.studentCount,
                isPlaceholder: false,
            };
        }
        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
    };

    
    const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>, indexToReplace: number) => {
        if (!e.target.files || e.target.files.length === 0) return;
    
        const file = e.target.files[0];
        const reader = new FileReader();
    
        reader.onload = (event) => {
            if (!event.target?.result) return;
            try {
                const workbook = XLSX.read(event.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) {
                    setFormError("The Excel file doesn't contain any sheets.");
                    return;
                }
                const worksheet = workbook.Sheets[sheetName];
    
                // Read all rows, convert to string, flatten, and filter out empty values.
                const data: (string|number)[][] = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: "",
                    blankrows: false,
                });
    
                const students = data
                    .flat()
                    .map(cell => String(cell).trim())
                    .filter(id => id !== '');
    
                if (students.length > 0) {
                    const newStudentSet: FormStudentSet = {
                        id: `excel-set-${Date.now()}-${sheetName}`,
                        subject: sheetName,
                        studentCount: students.length,
                        students: students,
                        isPlaceholder: false,
                    };
    
                    setActiveExam(prev => {
                        if (!prev) return null;
                        const currentSets = [...prev.studentSets];
                        // Replace the placeholder at the specified index with the new set.
                        currentSets.splice(indexToReplace, 1, newStudentSet);
                        return { ...prev, studentSets: currentSets };
                    });
                    setFormError('');
                } else {
                    setFormError("No student register numbers found in the Excel sheet. The sheet appears to be empty.");
                }
            } catch (error) {
                console.error("Error parsing Excel file:", error);
                setFormError("There was an error processing the Excel file. Please ensure it is a valid .xlsx or .xls file.");
            } finally {
                 if(e.target) e.target.value = "";
            }
        };
        
        reader.onerror = (error) => {
             console.error("FileReader error:", error);
             setFormError("Failed to read the file.");
             if(e.target) e.target.value = "";
        }
    
        reader.readAsBinaryString(file);
    };
    
    const handleRevertToPlaceholder = (index: number) => {
        if (!activeExam) return;
        const updatedSets = [...activeExam.studentSets];
        const originalId = updatedSets[index].id; // Preserve the key for React
        updatedSets[index] = { id: originalId, subject: '', studentCount: '', isPlaceholder: true };
        setActiveExam(prev => prev ? { ...prev, studentSets: updatedSets } : null);
    };

    const handleRemoveSet = (index: number) => {
        if (!activeExam) return;
        setActiveExam(prev => prev ? { ...prev, studentSets: prev.studentSets.filter((_, i) => i !== index) } : null);
    };

    // --- Hall Template Handlers ---
    const handleSaveHallAsTemplate = async (hall: FormHall) => {
        if (!user || !hall.name.trim() || hall.layout.length === 0) return;
        
        const name = hall.name.trim();
        if (hallTemplates.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            return;
        }

        setSavingTemplateForHallId(hall.id);
        try {
            await createHallTemplate({ name, layout: hall.layout }, user.id);
            await fetchHallTemplates();
            
            setRecentlySavedHallIds(prev => [...prev, hall.id]);
            setTimeout(() => {
                setRecentlySavedHallIds(prev => prev.filter(id => id !== hall.id));
            }, 3000);

        } catch (error) {
            console.error("Failed to save hall template:", error);
        } finally {
            setSavingTemplateForHallId(null);
        }
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
        
        setIsGridTemplateModalOpen(false);
        setNewGridTemplate({ name: '', rows: '8', cols: '10' }); // Reset form
    };

    const handleDeleteHallTemplate = async (templateId: string) => {
        if (user && window.confirm("Are you sure you want to delete this hall template? This cannot be undone.")) {
            await deleteHallTemplate(templateId, user.id);
            await fetchHallTemplates();
        }
    };

    // --- Student Set Template Handlers ---
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
    };
    
    const handleSaveSetAsTemplate = async (set: FormStudentSet) => {
        if (!user) return;
        
        const subject = set.subject.trim();
        const studentCount = parseInt(String(set.studentCount), 10);

        if (!subject || isNaN(studentCount) || studentCount <= 0) return;
        
        if (studentSetTemplates.some(t => t.subject.toLowerCase() === subject.toLowerCase())) {
            return; // Button should be disabled
        }

        setSavingTemplateForSetId(set.id);
        try {
            await createStudentSetTemplate({ subject, studentCount }, user.id);
            await fetchStudentSetTemplates();
            
            setRecentlySavedSetIds(prev => [...prev, set.id]);
            setTimeout(() => {
                setRecentlySavedSetIds(prev => prev.filter(id => id !== set.id));
            }, 3000);

        } catch (error) {
            console.error("Failed to save student set template:", error);
        } finally {
            setSavingTemplateForSetId(null);
        }
    };

    const handleDeleteStudentSetTemplate = async (templateId: string) => {
        if (user && window.confirm("Are you sure you want to delete this student set template? This cannot be undone.")) {
            await deleteStudentSetTemplate(templateId, user.id);
            await fetchStudentSetTemplates();
        }
    };

    // --- Actions ---

    const validateAndParseForm = (): Omit<Exam, 'id'> & { id?: string } | null => {
        if (!activeExam) return null;

        if (!activeExam.title.trim() || !activeExam.date || activeExam.halls.length === 0 || activeExam.studentSets.length === 0) {
            setFormError("Please fill in all exam details, and add at least one hall and one student set.");
            return null;
        }

        if (activeExam.halls.some(h => h.layout.length === 0)) {
            setFormError("One or more halls has an empty layout. Please design a layout for each hall.");
            return null;
        }
        
        if (activeExam.studentSets.some(s => s.isPlaceholder)) {
            setFormError("Please configure all student sets before saving or generating a plan.");
            return null;
        }

        try {
             const parsedSets = activeExam.studentSets.map(s => {
                const studentCount = parseInt(String(s.studentCount), 10);
                if (isNaN(studentCount) || studentCount <= 0) {
                    throw new Error(`Invalid student count for set "${s.subject}". Please enter a positive number.`);
                }
                return { ...s, id: s.id || `set-${Date.now()}`, studentCount };
            });

            return {
                ...activeExam,
                halls: activeExam.halls.map(h => ({ ...h, id: h.id || `hall-${Date.now()}` })),
                studentSets: parsedSets,
                id: activeExam.id || undefined,
                createdBy: activeExam.createdBy || user?.id || '',
                adminId: activeExam.adminId || user?.adminId || '',
            };
        } catch (e: any) {
            setFormError(e.message);
            return null;
        }
    };
    
    const handleSave = async () => {
        if (!activeExam || !user) return;
        setFormError('');
        setFormWarning('');

        const parsedExamData = validateAndParseForm();
        if (!parsedExamData) return;
        
        if (parsedExamData.id) { // Is an update
            const originalExam = exams.find(e => e.id === parsedExamData.id);
            if(originalExam) {
                 const hallsChanged = JSON.stringify(parsedExamData.halls) !== JSON.stringify(originalExam.halls);
                 const setsChanged = JSON.stringify(parsedExamData.studentSets) !== JSON.stringify(originalExam.studentSets);
                 const rulesChanged = parsedExamData.aiSeatingRules !== originalExam.aiSeatingRules;
                 const typeChanged = parsedExamData.seatingType !== originalExam.seatingType;
                 const editorModeChanged = parsedExamData.editorMode !== originalExam.editorMode;

                 if ((hallsChanged || setsChanged || rulesChanged || typeChanged || editorModeChanged) && parsedExamData.seatingPlan) {
                    parsedExamData.seatingPlan = undefined;
                 }
            }
        }
        
        setIsLoading(true);
        if (parsedExamData.id) {
            await updateExam(parsedExamData as Exam);
        } else {
             await createExam({
                title: parsedExamData.title,
                date: parsedExamData.date,
                halls: parsedExamData.halls,
                studentSets: parsedExamData.studentSets,
                aiSeatingRules: parsedExamData.aiSeatingRules,
                seatingType: parsedExamData.seatingType,
                editorMode: parsedExamData.editorMode,
            }, user.id);
        }
        
        await fetchExams();
        setIsLoading(false);
        setActiveExam(null);
    };

    const handleGeneratePlan = async () => {
        if (!activeExam) return;
        setFormError('');
        setFormWarning('');

        const parsedExamData = validateAndParseForm();
        if (!parsedExamData) return;
        
        setIsLoading(true);

        let result;
        if (activeExam.editorMode === 'classic') {
            result = await generateClassicSeatingPlan({
                halls: parsedExamData.halls as Hall[], 
                studentSets: parsedExamData.studentSets as StudentSet[], 
                seatingType: parsedExamData.seatingType || 'normal',
            });
        } else { // 'ai' mode
            result = await generateSeatingPlan({
                halls: parsedExamData.halls as Hall[], 
                studentSets: parsedExamData.studentSets as StudentSet[], 
                rules: parsedExamData.aiSeatingRules || '',
                seatingType: parsedExamData.seatingType || 'normal'
            });
        }
        
        if (result.plan) {
            const examWithPlan = { ...parsedExamData, id: parsedExamData.id || `exam${Date.now()}`, seatingPlan: result.plan } as Exam;
            
            await updateExam(examWithPlan);
            await fetchExams();
            // Update active exam state with new plan
            const updatedActiveExam = {
                ...activeExam,
                id: examWithPlan.id,
                seatingPlan: examWithPlan.seatingPlan,
                halls: examWithPlan.halls, // Use parsed halls
                studentSets: examWithPlan.studentSets, // Use parsed sets
            };
            setActiveExam(updatedActiveExam);
            
            if (result.message) {
                setFormWarning(result.message);
            }
        } else {
            setFormError(result.message || 'Failed to generate seating plan. Please check your configuration and try again.');
        }
        setIsLoading(false);
    };

    const handleDownloadPng = async (hallId: string, hallName: string) => {
        const element = hallRefs.current[hallId];
        if (!element || !activeExam) return;
    
        const originalShadow = element.style.boxShadow;
        element.style.boxShadow = 'none';
    
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    
        element.style.boxShadow = originalShadow;
    
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        
        const sanitizedTitle = activeExam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedHallName = hallName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${sanitizedTitle}_${sanitizedHallName}_plan.png`;
        
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadHallExcel = (hall: Hall) => {
        if (!activeExam || !activeExam.seatingPlan) {
            setFormError("Seating plan not generated yet.");
            return;
        }

        const hallPlan = activeExam.seatingPlan[hall.id];
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
        
        const sanitizedTitle = activeExam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedHallName = hall.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(wb, `${sanitizedTitle}_${sanitizedHallName}_plan.xlsx`);
    };

    const handleDownloadAllPngsFromEditor = async () => {
        if (!activeExam || !activeExam.seatingPlan) return;
        
        setIsDownloadingAll(true);
        setFormError('');

        for (const hall of activeExam.halls) {
            const element = hallRefs.current[hall.id];
            if (!element) continue;
            
            const originalShadow = element.style.boxShadow;
            element.style.boxShadow = 'none';

            try {
                const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                const sanitizedTitle = activeExam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const sanitizedHallName = hall.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                link.download = `${sanitizedTitle}_${sanitizedHallName}_plan.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error("Error generating PNG for hall:", hall.name, error);
                setFormError(`Could not generate PNG for ${hall.name}.`);
            } finally {
                 element.style.boxShadow = originalShadow;
            }
        }
        setIsDownloadingAll(false);
    };

    const handleDownloadFullExcelFromEditor = () => {
        if (!activeExam || !activeExam.seatingPlan) {
            setFormError("Seating plan not generated yet.");
            return;
        }
        setFormError('');

        const wb = XLSX.utils.book_new();

        activeExam.halls.forEach(hall => {
            const hallPlan = activeExam.seatingPlan![hall.id];
            if (!hallPlan) return;

            const maxCols = hallPlan.reduce((max, row) => Math.max(max, row.length), 0);
            const headers = [''];
            for (let c = 0; c < maxCols; c++) { headers.push(`Col ${c + 1}`); }
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
            const sheetName = hall.name.replace(/[*?:/\\\[\]]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        const sanitizedTitle = activeExam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(wb, `${sanitizedTitle}_full_seating_plan.xlsx`);
    };

    
    const handleDeleteExam = async (examId: string) => {
        if (!user) return;
        if (window.confirm('Are you sure you want to permanently delete this exam? This action cannot be undone.')) {
            setIsLoading(true);
            await deleteExam(examId, user.id, user.role);
            if (activeExam?.id === examId) {
                setActiveExam(null);
            }
            await fetchExams();
            setIsLoading(false);
        }
    };

    const handleSelectExam = (exam: Exam) => {
        setActiveExam({ ...JSON.parse(JSON.stringify(exam)), aiSeatingRules: exam.aiSeatingRules || '', seatingType: exam.seatingType || 'normal', editorMode: exam.editorMode || 'ai' }); // Deep copy and ensure fields exist
        setFormError('');
        setFormWarning('');
    };

    const handleStartCreating = (mode: 'ai' | 'classic') => {
        setActiveExam({ ...initialNewExamState, createdBy: user?.id || '', adminId: user?.adminId || '', editorMode: mode, seatingType: 'normal' });
        setFormError('');
        setFormWarning('');
    };
    
    const handleCancel = () => {
        setActiveExam(null);
        setFormError('');
        setFormWarning('');
    }

    const handleQuickGeneratePlan = async (exam: Exam) => {
        setGeneratingPlanId(exam.id);
        
        let result;
        if (exam.editorMode === 'classic') {
             result = await generateClassicSeatingPlan({
                halls: exam.halls, 
                studentSets: exam.studentSets,
                seatingType: exam.seatingType || 'normal',
            });
        } else {
             result = await generateSeatingPlan({
                halls: exam.halls, 
                studentSets: exam.studentSets, 
                rules: exam.aiSeatingRules || 'Arrange students fairly.',
                seatingType: exam.seatingType || 'normal'
            });
        }

        if (result.plan) {
            const examWithPlan = { ...exam, seatingPlan: result.plan };
            await updateExam(examWithPlan);
            await fetchExams();
            if (result.message) {
                window.alert(result.message);
            }
        } else {
            window.alert(result.message || 'Failed to generate seating plan. Not enough seats for all students.');
        }
        setGeneratingPlanId(null);
    };

    const handleDownloadAll = (exam: Exam) => {
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
            const sheetName = hall.name.replace(/[*?:/\\\[\]]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        const sanitizedTitle = exam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(wb, `${sanitizedTitle}_seating_plan.xlsx`);
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


    if (!user?.permissionGranted) {
        return (
             <div className="min-h-screen">
                <Header />
                 <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
                    <Card>
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Permission Denied</h2>
                        <p className="text-slate-600 dark:text-slate-400">Your account does not have the necessary permissions to manage exams. Please contact the administrator.</p>
                    </Card>
                </main>
            </div>
        )
    }

    if (isLoading && !activeExam) {
        return (
            <div className="min-h-screen">
                <Header />
                <main className="max-w-7xl mx-auto py-8 px-4 text-center">Loading exam data...</main>
            </div>
        );
    }
    
    if (activeExam) {
        const isNewExam = !activeExam.id;
        const originalExam = isNewExam ? null : exams.find(e => e.id === activeExam.id);
        const isDirty = originalExam ? JSON.stringify(activeExam) !== JSON.stringify(originalExam) : true;

        const parsedStudentSetsForVisualizer: StudentSet[] = activeExam.studentSets
            .filter(set => !set.isPlaceholder)
            .map(set => ({
                ...set,
                studentCount: Number(set.studentCount) || 0,
            }));

        return (
             <div className="min-h-screen">
                <Header />
                <main className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {isHallTemplateModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50" onClick={() => setIsHallTemplateModalOpen(false)}>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                                <h3 className="text-xl font-semibold mb-4">Select Hall Templates</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {hallTemplates.length > 0 ? hallTemplates.map(template => (
                                        <div key={template.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
                                            <div>
                                                <p className="font-semibold">{template.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{template.layout.length} seats</p>
                                            </div>
                                            <Button variant="secondary" className="!py-1 !px-3 text-sm" onClick={() => { handleAddHallFromTemplate(template); setIsHallTemplateModalOpen(false); }}>+ Add</Button>
                                        </div>
                                    )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">You haven't created any hall templates yet.</p>}
                                </div>
                                <div className="mt-6 text-right">
                                    <Button onClick={() => setIsHallTemplateModalOpen(false)}>Done</Button>
                                </div>
                            </div>
                        </div>
                    )}
                    {hallEditorState.mode !== 'closed' && (
                        <HallLayoutEditor
                            isOpen={true}
                            onClose={() => setHallEditorState({ mode: 'closed', hallIndex: null })}
                            onSave={handleSaveFromEditor}
                            initialLayout={
                                hallEditorState.mode === 'edit-hall' && hallEditorState.hallIndex !== null
                                ? activeExam.halls[hallEditorState.hallIndex]?.layout
                                : []
                            }
                            isTemplateCreationMode={hallEditorState.mode === 'create-template'}
                        />
                    )}
                    {isSetTemplateModalOpen.open && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50" onClick={() => setIsSetTemplateModalOpen({open: false, index: null})}>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                                <h3 className="text-xl font-semibold mb-4">Select Student Set Templates</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {studentSetTemplates.length > 0 ? studentSetTemplates.map(template => (
                                        <div key={template.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
                                            <div>
                                                <p className="font-semibold">{template.subject}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{template.studentCount} students</p>
                                            </div>
                                            <Button variant="secondary" className="!py-1 !px-3 text-sm" onClick={() => { 
                                                if(isSetTemplateModalOpen.index !== null) handleConfigureSet(isSetTemplateModalOpen.index, 'template', template);
                                                setIsSetTemplateModalOpen({open: false, index: null}); 
                                            }}>+ Add</Button>
                                        </div>
                                    )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">You haven't created any student set templates yet.</p>}
                                </div>
                                <div className="mt-6 text-right">
                                    <Button onClick={() => setIsSetTemplateModalOpen({open: false, index: null})}>Done</Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="relative mb-6">
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 text-center">{isNewExam ? `Create New Exam` : 'Edit Exam'}</h2>
                        <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
                            <Button onClick={handleCancel} variant="secondary">&larr; Back to Dashboard</Button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="mx-auto max-w-2xl space-y-8">
                            <Card>
                                <h3 className="text-xl font-semibold mb-4 border-b dark:border-slate-700 pb-2">Exam Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Input 
                                        label="Exam Title" 
                                        id="exam-title"
                                        placeholder="e.g., Mid-Term Examinations"
                                        value={activeExam.title} 
                                        onChange={e => handleFormChange('title', e.target.value)}
                                        containerClassName="sm:col-span-2"
                                    />
                                    <Input
                                        label="Date"
                                        id="exam-date"
                                        type="date"
                                        value={activeExam.date}
                                        onChange={e => handleFormChange('date', e.target.value)}
                                        containerClassName="sm:col-span-2"
                                    />
                                </div>
                            </Card>
                            <Card>
                                <h3 className="text-xl font-semibold mb-4 border-b dark:border-slate-700 pb-2">Editor Mode</h3>
                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => handleEditorModeChange('ai')}
                                        className={`flex-1 text-center px-3 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${activeExam.editorMode !== 'classic' ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <SparklesIcon className="w-5 h-5" /> AI Mode
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleEditorModeChange('classic')}
                                        className={`flex-1 text-center px-3 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${activeExam.editorMode === 'classic' ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <GridIcon className="w-5 h-5" /> Classic Mode
                                    </button>
                                </div>
                            </Card>
                            <Card>
                                <h3 className="text-xl font-semibold mb-4 border-b dark:border-slate-700 pb-2">Halls</h3>
                                <div className="space-y-4">
                                    {activeExam.halls.map((hall, index) => {
                                        const templateExists = hallTemplates.some(t => t.name.toLowerCase() === hall.name.trim().toLowerCase());
                                        const isSaving = savingTemplateForHallId === hall.id;
                                        const justSaved = recentlySavedHallIds.includes(hall.id);
                                        const isNameInvalid = !hall.name.trim();

                                        const gridCheck = isSimpleGrid(hall.layout);
                                        const hallMode: 'placeholder' | 'normal' | 'advanced' = hall.layout.length === 0 ? 'placeholder' : (gridCheck.isGrid ? 'normal' : 'advanced');

                                        return (
                                            <div key={hall.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-grow pr-4">
                                                        <Input label="Hall Name" id={`hall-name-${index}`} value={hall.name} onChange={e => handleHallNameChange(index, e.target.value)} />
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveHall(index)} className="text-red-500 hover:text-red-700 mt-6">
                                                        <TrashIcon />
                                                    </button>
                                                </div>

                                                {hallMode === 'placeholder' && (
                                                    <div className="mt-3 text-center p-4 border-2 border-dashed dark:border-slate-600 rounded-md">
                                                        <h4 className="font-semibold mb-3 text-slate-600 dark:text-slate-300">Define Hall Layout</h4>
                                                        <div className="flex justify-center gap-2 flex-wrap">
                                                            <Button variant="secondary" className="!text-sm !py-1 !px-3" onClick={() => handleSetHallLayoutType(index, 'normal')}>Use Normal (Rows/Cols)</Button>
                                                            <Button variant="secondary" className="!text-sm !py-1 !px-3" onClick={() => handleSetHallLayoutType(index, 'advanced')}>Use Advanced Editor</Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {hallMode === 'normal' && gridCheck.isGrid && (
                                                    <>
                                                        <div className="mt-3 grid grid-cols-2 gap-4">
                                                            <Input label="Rows" type="number" value={gridCheck.rows} min="1" max="50" onChange={e => handleHallDimensionChange(index, 'rows', e.target.value)} />
                                                            <Input label="Columns" type="number" value={gridCheck.cols} min="1" max="50" onChange={e => handleHallDimensionChange(index, 'cols', e.target.value)} />
                                                        </div>
                                                        <div className="mt-3 flex flex-col sm:flex-row justify-between items-center gap-2">
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">Capacity: {hall.layout.filter(s => s.type !== 'faculty').length} seats</p>
                                                            <Button variant="secondary" className="!text-sm !py-1 !px-3" onClick={() => setHallEditorState({ mode: 'edit-hall', hallIndex: index })}>Switch to Advanced Editor</Button>
                                                        </div>
                                                    </>
                                                )}

                                                {hallMode === 'advanced' && (
                                                    <div className="mt-3 flex flex-col sm:flex-row justify-between items-center gap-2">
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">Capacity: {hall.layout.filter(s => s.type !== 'faculty').length} seats</p>
                                                        <Button variant="secondary" className="!text-sm !py-1 !px-3" onClick={() => setHallEditorState({ mode: 'edit-hall', hallIndex: index })}>Edit Advanced Layout</Button>
                                                    </div>
                                                )}
                                                
                                                <div className="mt-4 pt-3 border-t dark:border-slate-600">
                                                    <h4 className="font-semibold mb-2 text-sm text-slate-600 dark:text-slate-300">Hall Constraints</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Student Placement</label>
                                                            <div className="flex gap-2 flex-wrap">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleConstraintTypeChange(index, 'no-limit')}
                                                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${(!hall.constraints?.type || hall.constraints?.type === 'no-limit') ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                                                                >
                                                                    No Limit
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleConstraintTypeChange(index, 'advanced')}
                                                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${hall.constraints?.type === 'advanced' ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                                                                >
                                                                    Advanced
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Seating Direction</label>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleArrangementChange(index, 'horizontal')}
                                                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${(!hall.constraints?.arrangement || hall.constraints.arrangement === 'horizontal') ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                                                                >
                                                                    Horizontal
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleArrangementChange(index, 'vertical')}
                                                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${hall.constraints?.arrangement === 'vertical' ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                                                                >
                                                                    Vertical
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {hall.constraints?.type === 'advanced' && (
                                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                                                            <p className="text-xs font-medium mb-2 text-slate-500 dark:text-slate-400">Select student sets to be placed in this hall:</p>
                                                            {activeExam.studentSets.filter(s => !s.isPlaceholder).length > 0 ? (
                                                                <div className="space-y-2 max-h-24 overflow-y-auto">
                                                                    {activeExam.studentSets.filter(s => !s.isPlaceholder).map(set => (
                                                                        <label key={set.id} className="flex items-center gap-2 text-sm">
                                                                            <input 
                                                                                type="checkbox"
                                                                                checked={hall.constraints?.allowedSetIds?.includes(set.id) || false}
                                                                                onChange={e => handleAllowedSetChange(index, set.id, e.target.checked)}
                                                                                className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                                                            />
                                                                            <span>{set.subject}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">Please configure student sets first.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-2 text-right">
                                                    {justSaved ? (
                                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Saved as Template</span>
                                                    ) : isSaving ? (
                                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Saving...</span>
                                                    ) : templateExists ? (
                                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Template Exists</span>
                                                    ) : (
                                                        <Button 
                                                            variant="secondary" 
                                                            className="!text-xs !py-1 !px-2" 
                                                            disabled={isNameInvalid || hall.layout.length === 0}
                                                            onClick={() => handleSaveHallAsTemplate(hall)}
                                                        >
                                                            Save as Template
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button type="button" variant="secondary" onClick={handleAddHall}>+ Add Hall</Button>
                                    <Button type="button" variant="secondary" onClick={() => setIsHallTemplateModalOpen(true)}>+ Add from Template</Button>
                                </div>
                            </Card>
                            <Card>
                                 <h3 className="text-xl font-semibold mb-4 border-b dark:border-slate-700 pb-2">Student Sets</h3>
                                 <div className="space-y-4">
                                    {activeExam.studentSets.map((set, index) => {
                                        if (set.isPlaceholder) {
                                            return (
                                                <div key={set.id} className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md text-center">
                                                    <h4 className="font-semibold mb-3 text-slate-600 dark:text-slate-300">Configure New Student Set</h4>
                                                    <div className="flex justify-center gap-2 flex-wrap">
                                                        <Button variant="secondary" className="!text-sm !py-1 !px-3" onClick={() => handleConfigureSet(index, 'custom')}>
                                                            Create Custom
                                                        </Button>
                                                        <Button variant="secondary" className="!text-sm !py-1 !px-3" onClick={() => setIsSetTemplateModalOpen({ open: true, index })}>
                                                            Add from Template
                                                        </Button>
                                                        <Button variant="secondary" className="!text-sm !py-1 !px-3" onClick={() => excelFileRefs.current[index]?.click()}>
                                                            Upload Excel
                                                        </Button>
                                                        <input type="file" ref={el => { if(el) excelFileRefs.current[index] = el; }} hidden accept=".xlsx, .xls" onChange={(e) => handleExcelFileChange(e, index)} />
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveSet(index)} className="text-red-500 hover:text-red-700 mt-3 text-xs underline">
                                                        Cancel
                                                    </button>
                                                </div>
                                            );
                                        }

                                        const templateExists = studentSetTemplates.some(t => t.subject.toLowerCase() === set.subject.trim().toLowerCase());
                                        const isSaving = savingTemplateForSetId === set.id;
                                        const justSaved = recentlySavedSetIds.includes(set.id);
                                        // FIX: studentCount can be a string, so it must be parsed to a number before comparison.
                                        const isInvalid = !set.subject.trim() || !(parseInt(String(set.studentCount), 10) > 0);
                                        const isFromExcel = !!set.students;

                                        return (
                                             <div key={set.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto_auto] gap-2 items-end">
                                                    <Input label="Subject / Set Code" id={`set-subject-${index}`} value={set.subject} onChange={e => handleSetChange(index, 'subject', e.target.value)} />
                                                    <Input label="No. of Students" id={`set-count-${index}`} type="number" min="1" value={set.studentCount} onChange={e => handleSetChange(index, 'studentCount', e.target.value)} readOnly={isFromExcel} title={isFromExcel ? "Count is determined by the uploaded Excel file" : ""} />
                                                    <button type="button" onClick={() => handleRevertToPlaceholder(index)} className="text-slate-500 hover:text-violet-600 h-10 w-10 flex items-center justify-center self-end" title="Change Set Type">
                                                        <EditIcon />
                                                    </button>
                                                    <button type="button" onClick={() => handleRemoveSet(index)} className="text-red-500 hover:text-red-700 h-10 w-10 flex items-center justify-center self-end">
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    {isFromExcel && <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Populated from Excel</span>}
                                                    <div className="ml-auto">
                                                        {justSaved ? (
                                                            <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Saved as Template</span>
                                                        ) : isSaving ? (
                                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Saving...</span>
                                                        ) : templateExists ? (
                                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Template Exists</span>
                                                        ) : (
                                                            <Button 
                                                                variant="secondary" 
                                                                className="!text-xs !py-1 !px-2" 
                                                                disabled={isInvalid || isFromExcel}
                                                                title={isFromExcel ? "Cannot save an Excel-imported set as a template" : ""}
                                                                onClick={() => handleSaveSetAsTemplate(set)}
                                                            >
                                                                Save as Template
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2 mt-4 flex-wrap">
                                    <Button type="button" variant="secondary" onClick={handleAddSetPlaceholder}>+ Add Student Set</Button>
                                </div>
                                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    <b>Excel upload tip:</b> The name of the first sheet in your Excel file will be used as the set code. All cells containing data within that sheet will be read as student register numbers. To prevent issues with long register numbers, format the student ID columns as 'Text' in your spreadsheet software before saving.
                                </p>
                            </Card>
                            {activeExam.editorMode === 'ai' ? (
                                <Card>
                                    <h3 className="text-xl font-semibold mb-4 border-b dark:border-slate-700 pb-2">AI Seating Instructions</h3>
                                    <div className="mt-6">
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Seating Type</label>
                                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                            <button 
                                                type="button" 
                                                onClick={() => handleSeatingTypeChange('normal')}
                                                className={`flex-1 text-center px-3 py-1 text-sm font-semibold rounded-md transition-all ${activeExam.seatingType !== 'fair' ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow' : 'text-slate-600 dark:text-slate-300'}`}
                                            >
                                                Normal
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => handleSeatingTypeChange('fair')}
                                                className={`flex-1 text-center px-3 py-1 text-sm font-semibold rounded-md transition-all ${activeExam.seatingType === 'fair' ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow' : 'text-slate-600 dark:text-slate-300'}`}
                                            >
                                                Fair
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            {activeExam.seatingType === 'fair' 
                                                ? 'Fair type automatically alternates students. Your custom instructions below will be added as extra rules.' 
                                                : 'Normal type uses your custom AI instructions below for maximum flexibility.'}
                                        </p>
                                    </div>
                                    <Textarea
                                        label="Enter additional seating rules in natural language"
                                        id="ai-rules"
                                        value={activeExam.aiSeatingRules || ''}
                                        onChange={e => handleFormChange('aiSeatingRules', e.target.value)}
                                        placeholder="e.g., Prioritize putting students with accessibility needs in the front rows. Ensure no two students from 'Physics 101' sit in adjacent seats (horizontally or vertically)."
                                        containerClassName="mt-4"
                                    />
                                </Card>
                            ) : (
                                <Card>
                                    <h3 className="text-xl font-semibold mb-4 border-b dark:border-slate-700 pb-2">Classic Seating Algorithm</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Seating Type</label>
                                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => handleSeatingTypeChange('normal')}
                                                className={`flex-1 text-center px-3 py-1 text-sm font-semibold rounded-md transition-all ${activeExam.seatingType !== 'fair' ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow' : 'text-slate-600 dark:text-slate-300'}`}
                                            >
                                                Normal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSeatingTypeChange('fair')}
                                                className={`flex-1 text-center px-3 py-1 text-sm font-semibold rounded-md transition-all ${activeExam.seatingType === 'fair' ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow' : 'text-slate-600 dark:text-slate-300'}`}
                                            >
                                                Fair
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            {activeExam.seatingType === 'fair'
                                                ? 'Fair type alternates students and inserts an empty seat between students of the last remaining set.'
                                                : 'Normal type alternates students but fills all remaining seats without spacing.'}
                                        </p>
                                    </div>
                                </Card>
                            )}

                             {formWarning && <p className="text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 p-3 rounded-md text-sm text-center">{formWarning}</p>}
                             {formError && <p className="text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-500/20 p-3 rounded-md text-sm text-center">{formError}</p>}
                             <div className="flex flex-col sm:flex-row gap-4">
                                <Button onClick={handleSave} className="flex-1" disabled={isLoading || !isDirty}>
                                    {isLoading ? 'Saving...' : (isNewExam ? 'Create Exam' : 'Save Changes')}
                                </Button>
                                <Button onClick={handleGeneratePlan} variant="primary" className="flex-1" disabled={isLoading}>
                                     {isLoading ? 'Generating...' : 'Generate Plan'}
                                </Button>
                            </div>
                        </div>

                        {activeExam.seatingPlan && (
                            <div className="mt-8 space-y-8">
                                <Card>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Seating Arrangement Preview & Downloads</h3>
                                        <div className="flex justify-center flex-wrap gap-4">
                                            <Button
                                                onClick={handleDownloadAllPngsFromEditor}
                                                variant="secondary"
                                                className="flex items-center"
                                                disabled={isDownloadingAll}
                                            >
                                                <DownloadIcon className="h-5 w-5 mr-2" /> {isDownloadingAll ? 'Downloading...' : 'Download All PNGs'}
                                            </Button>
                                            <Button
                                                onClick={handleDownloadFullExcelFromEditor}
                                                className="flex items-center"
                                            >
                                                <ExcelIcon className="h-5 w-5 mr-2" /> Download Full Excel
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                                {activeExam.halls.map(hall => {
                                    const parsedHall: Hall = {
                                        ...hall,
                                        layout: hall.layout,
                                    };
                                    return (
                                        <Card key={hall.id} ref={el => { if(el) hallRefs.current[hall.id] = el }}>
                                            <SeatingPlanVisualizer 
                                                hall={parsedHall} 
                                                plan={activeExam.seatingPlan!}
                                                studentSets={parsedStudentSetsForVisualizer}
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
                                                    onClick={() => handleDownloadHallExcel(parsedHall)}
                                                    variant="secondary" 
                                                    className="flex items-center mx-auto !py-1 !px-3 text-sm"
                                                >
                                                    <ExcelIcon /> Download Excel
                                                </Button>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        )
    }

    const aiExams = exams.filter(e => e.editorMode !== 'classic'); // Treat legacy/undefined as AI
    const classicExams = exams.filter(e => e.editorMode === 'classic');
    
    const renderExamList = (examList: Exam[]) => {
        return (
            <div className="space-y-3">
                {examList.map(exam => {
                    const isGenerating = generatingPlanId === exam.id;
                    const isDownloading = downloadingExamId === exam.id;
                    return (
                        <div key={exam.id} className="group flex flex-wrap items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition">
                            <div className="flex-grow cursor-pointer mb-2 sm:mb-0" onClick={() => handleSelectExam(exam)}>
                                <p className="font-semibold">{exam.title}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Date: {exam.date}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${exam.seatingPlan ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                                    {exam.seatingPlan ? 'Plan Generated' : 'Pending Plan'}
                                </span>

                                {exam.seatingPlan ? (
                                    <>
                                        <Button
                                            variant="secondary"
                                            className="!py-1 !px-2 text-xs"
                                            onClick={(e) => { e.stopPropagation(); handleDownloadAll(exam); }}
                                            disabled={isDownloading}
                                        >
                                            {isDownloading ? '...' : 'Download PNGs'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="!py-1 !px-2 text-xs"
                                            onClick={(e) => { e.stopPropagation(); handleDownloadAllExcel(exam); }}
                                        >
                                            Download Excel
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="primary"
                                        className="!py-1 !px-2 text-xs"
                                        onClick={(e) => { e.stopPropagation(); handleQuickGeneratePlan(exam); }}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Plan'}
                                    </Button>
                                )}

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
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" onClick={() => handleSelectExam(exam)}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {hallEditorState.mode === 'create-template' && (
                    <HallLayoutEditor
                        isOpen={true}
                        onClose={() => setHallEditorState({ mode: 'closed', hallIndex: null })}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Start a New Exam</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">Choose an editor mode to begin creating your exam schedule.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleStartCreating('ai')}
                                    className="group text-left p-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg border-2 border-transparent hover:border-violet-400 transition-all"
                                >
                                    <SparklesIcon className="text-violet-500 dark:text-violet-400 w-8 h-8 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">AI-Powered Mode</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Flexible seating with natural language rules.</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleStartCreating('classic')}
                                    className="group text-left p-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border-2 border-transparent hover:border-slate-400 transition-all"
                                >
                                    <GridIcon className="text-slate-500 dark:text-slate-400 w-8 h-8 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Classic Mode</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Predictable, algorithm-based seating.</p>
                                    </div>
                                </button>
                            </div>
                        </Card>

                        <Card>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">My Exam Schedules</h2>
                            <div className="border-b border-slate-200 dark:border-slate-700">
                                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                    <button
                                        onClick={() => setActiveTab('ai')}
                                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'ai' ? 'border-violet-500 dark:border-violet-400 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                    >
                                        AI Exams ({aiExams.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('classic')}
                                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'classic' ? 'border-violet-500 dark:border-violet-400 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                    >
                                        Classic Exams ({classicExams.length})
                                    </button>
                                </nav>
                            </div>
                             <div className="mt-6">
                                {activeTab === 'ai' ? (
                                    aiExams.length > 0 ? renderExamList(aiExams) : (
                                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">You haven't created any AI-powered exams yet.</p>
                                    )
                                ) : (
                                    classicExams.length > 0 ? renderExamList(classicExams) : (
                                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">You haven't created any classic exams yet.</p>
                                    )
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                             <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">My Templates</h2>
                             <div className="mb-8">
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Hall Templates</h3>
                                <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg mb-4 space-y-3">
                                    <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Create New Hall Template</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        <Button onClick={() => {
                                            setIsGridTemplateModalOpen(true);
                                            setGridTemplateFormError('');
                                            setNewGridTemplate({ name: '', rows: '8', cols: '10' });
                                        }}>+ Create with Grid</Button>
                                        <Button onClick={() => setHallEditorState({ mode: 'create-template', hallIndex: null })}>+ Create with Editor</Button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {hallTemplates.length > 0 ? hallTemplates.map(template => (
                                        <div key={template.id} className="group flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
                                            <div>
                                                <p className="font-semibold">{template.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{template.layout.length} seats</p>
                                            </div>
                                            <button onClick={() => handleDeleteHallTemplate(template.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">No templates created yet.</p>}
                                </div>
                             </div>

                             <div>
                                 <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Student Set Templates</h3>
                                 <form onSubmit={handleCreateStudentSetTemplate} className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg mb-4 space-y-3">
                                     <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Create New Template</h4>
                                     <Input label="Subject / Set Code" id="template-subject" placeholder="e.g. Physics 101" value={newStudentSetTemplate.subject} onChange={e => setNewStudentSetTemplate({...newStudentSetTemplate, subject: e.target.value})} />
                                     <Input label="No. of Students" id="template-count" type="number" min="1" placeholder="e.g. 50" value={newStudentSetTemplate.studentCount} onChange={e => setNewStudentSetTemplate({...newStudentSetTemplate, studentCount: e.target.value})} />
                                     {studentSetTemplateFormError && <p className="text-xs text-red-600 dark:text-red-400">{studentSetTemplateFormError}</p>}
                                     <Button type="submit" className="w-full">Save Template</Button>
                                 </form>

                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {studentSetTemplates.length > 0 ? studentSetTemplates.map(template => (
                                        <div key={template.id} className="group flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
                                            <div>
                                                <p className="font-semibold">{template.subject}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{template.studentCount} students</p>
                                            </div>
                                            <button onClick={() => handleDeleteStudentSetTemplate(template.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">No templates created yet.</p>}
                                </div>
                             </div>
                        </Card>
                    </div>
                </div>
                 {examForDownload && examForDownload.seatingPlan && (
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
            </main>
        </div>
    );
};

export default TeacherDashboard;