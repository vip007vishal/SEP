import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Exam, Hall, StudentSet, HallTemplate, StudentSetTemplate, SeatDefinition, HallConstraint, User, SeatingPlan } from '../types';
import { 
    getExamsForTeacher, 
    generateSeatingPlan,
    generateClassicSeatingPlan,
    updateExam, 
    createExam, 
    deleteExam, 
    getHallTemplatesForTeacher, 
    createHallTemplate,
    updateHallTemplate,
    deleteHallTemplate,
    getStudentSetTemplatesForTeacher,
    createStudentSetTemplate,
    updateStudentSetTemplate,
    deleteStudentSetTemplate,
    getTeachersForAdmin,
    updateExamSeatingPlan
} from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Textarea from './common/Textarea';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';
import HallLayoutEditor from './common/HallLayoutEditor';
import SeatingEditor from './common/SeatingEditor';
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

// Helper function to determine seat size based on register number length
const getSeatSizeFromRegisterNumbers = (studentSets: StudentSet[]): { width: number; height: number; fontSize: number } => {
    let maxLength = 0;
    
    // Find the longest register number across all student sets
    studentSets.forEach(set => {
        if (set.students && set.students.length > 0) {
            set.students.forEach(studentId => {
                if (studentId && studentId.length > maxLength) {
                    maxLength = studentId.length;
                }
            });
        }
    });
    
    // Default sizes for normal register numbers (up to 10 characters)
    let width = 80;
    let height = 60;
    let fontSize = 12;
    
    // Adjust sizes for longer register numbers
    if (maxLength > 10 && maxLength <= 15) {
        width = 100;
        height = 70;
        fontSize = 11;
    } else if (maxLength > 15 && maxLength <= 20) {
        width = 120;
        height = 80;
        fontSize = 10;
    } else if (maxLength > 20) {
        width = 140;
        height = 90;
        fontSize = 9;
    }
    
    return { width, height, fontSize };
};

// Helper function to calculate maximum register number length from an exam
const getMaxRegisterNumberLength = (exam: Exam | FormExam): number => {
    let maxLength = 0;
    
    exam.studentSets.forEach(set => {
        if (set.students && set.students.length > 0) {
            set.students.forEach(studentId => {
                if (studentId && studentId.length > maxLength) {
                    maxLength = studentId.length;
                }
            });
        }
    });
    
    return maxLength;
};

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
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ExcelIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1.8 18H14l-2-3.4-2 3.4H8.2l2.9-4.5L8.2 11H10l2 3.4 2-3.4h1.8l-2.9 4.5 2.9 4.5zM13 9V3.5L18.5 9H13z"/>
  </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const GridIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const SlidersIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4v0a2 2 0 100-4v0zM12 10v2m0 2a2 2 0 100 4v0a2 2 0 100-4v0zM12 18v2m-6-16v2m0 2a2 2 0 100 4v0a2 2 0 100-4v0zM6 14v6m6-16v6m0 2a2 2 0 100 4v0a2 2 0 100-4v0zM18 6v10m0 2a2 2 0 100 4v0a2 2 0 100-4v0z" />
  </svg>
);

const ChipIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const PlusIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const ChevronRightIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const TemplateIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const UsersIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0H11" />
  </svg>
);

const CalendarIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BuildingIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const DocumentIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
    const [colleagues, setColleagues] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeExam, setActiveExam] = useState<FormExam | null>(null);
    const [formError, setFormError] = useState('');
    const [formWarning, setFormWarning] = useState('');
    const [isHallTemplateModalOpen, setIsHallTemplateModalOpen] = useState(false);
    
    // Unified state for Hall Layout Editor
    const [hallEditorState, setHallEditorState] = useState<{ 
        mode: 'closed' | 'edit-hall' | 'create-template' | 'edit-template', 
        hallIndex: number | null,
        templateId?: string,
        templateName?: string
    }>({ mode: 'closed', hallIndex: null });

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
    const [editingSetTemplateId, setEditingSetTemplateId] = useState<string | null>(null);

    // State for saving templates from exam form
    const [savingTemplateForHallId, setSavingTemplateForHallId] = useState<string | null>(null);
    const [recentlySavedHallIds, setRecentlySavedHallIds] = useState<string[]>([]);
    const [savingTemplateForSetId, setSavingTemplateForSetId] = useState<string | null>(null);
    const [recentlySavedSetIds, setRecentlySavedSetIds] = useState<string[]>([]);

    const [activeTab, setActiveTab] = useState<'ai' | 'advanced' | 'classic' | 'ai-advanced'>('ai');

    const [isHelpVisible, setIsHelpVisible] = useState(false);
    
    // State for Seating Editor
    const [isSeatingEditorOpen, setIsSeatingEditorOpen] = useState(false);

    // State for seat dimensions based on register number length
    const [seatDimensions, setSeatDimensions] = useState<{ width: number; height: number; fontSize: number }>({
        width: 80,
        height: 60,
        fontSize: 12
    });

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

    // Update seat dimensions when active exam changes
    useEffect(() => {
        if (activeExam && activeExam.studentSets.length > 0) {
            const { width, height, fontSize } = getSeatSizeFromRegisterNumbers(
                activeExam.studentSets as StudentSet[]
            );
            setSeatDimensions({ width, height, fontSize });
        }
    }, [activeExam]);

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
    
    const fetchColleagues = useCallback(async () => {
         if(user && user.adminId) {
             const data = await getTeachersForAdmin(user.adminId);
             setColleagues(data);
         }
    }, [user]);

    useEffect(() => {
        const loadInitialData = async () => {
             if (user?.permissionGranted) {
                setIsLoading(true);
                await Promise.all([fetchExams(), fetchHallTemplates(), fetchStudentSetTemplates(), fetchColleagues()]);
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        }
       loadInitialData();
    }, [fetchExams, fetchHallTemplates, fetchStudentSetTemplates, fetchColleagues, user]);

    const getCreatorName = (id: string) => {
        if(id === user?.id) return 'Me';
        const teacher = colleagues.find(c => c.id === id);
        return teacher ? teacher.name : 'Unknown';
    }

    // --- Form State Handlers ---
    const handleFormChange = (field: 'title' | 'date' | 'aiSeatingRules', value: string) => {
        if (!activeExam) return;
        setActiveExam(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleEditorModeChange = (mode: 'ai' | 'classic' | 'advanced' | 'ai-advanced') => {
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

    const handleFrontDirectionChange = (index: number, direction: 'top' | 'bottom' | 'left' | 'right') => {
        if (!activeExam) return;
        const updatedHalls = [...activeExam.halls];
        updatedHalls[index] = { ...updatedHalls[index], frontDirection: direction };
        setActiveExam(prev => prev ? { ...prev, halls: updatedHalls } : null);
    };

    const handleAddHall = () => {
        if (!activeExam) return;
        const newHallName = `Hall ${String.fromCharCode(65 + activeExam.halls.length)}`;
        const newHall: FormHall = { 
            id: `new-hall-${Date.now()}`, 
            name: newHallName, 
            layout: [],
            constraints: { type: 'no-limit', arrangement: 'horizontal' },
            frontDirection: 'top'
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
            frontDirection: 'top' // Default
        };
        setActiveExam(prev => prev ? { ...prev, halls: [...prev.halls, newHall] } : null);
    };
    
    const handleSaveFromEditor = async (data: { layout: SeatDefinition[], name?: string }) => {
        if (hallEditorState.mode === 'create-template' && data.name && user) {
            await createHallTemplate({ name: data.name, layout: data.layout }, user.id);
            await fetchHallTemplates();
        } else if (hallEditorState.mode === 'edit-template' && hallEditorState.templateId && data.name && user) {
            await updateHallTemplate(hallEditorState.templateId, { name: data.name, layout: data.layout }, user.id);
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
                    
                    // Update seat dimensions based on the new register numbers
                    const { width, height, fontSize } = getSeatSizeFromRegisterNumbers(
                        [...currentSets, newStudentSet] as StudentSet[]
                    );
                    setSeatDimensions({ width, height, fontSize });
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

    const handleEditHallTemplate = (template: HallTemplate) => {
        setHallEditorState({
            mode: 'edit-template',
            hallIndex: null,
            templateId: template.id,
            templateName: template.name
        });
    }

    const handleDeleteHallTemplate = async (templateId: string) => {
        if (user && window.confirm("Are you sure you want to delete this hall template? This cannot be undone.")) {
            await deleteHallTemplate(templateId, user.id, user.role);
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

        if (editingSetTemplateId) {
            await updateStudentSetTemplate(editingSetTemplateId, { subject: subject.trim(), studentCount: parsedCount }, user.id);
            setEditingSetTemplateId(null);
        } else {
            if (studentSetTemplates.some(t => t.subject.toLowerCase() === subject.trim().toLowerCase())) {
                setStudentSetTemplateFormError("A template with this subject/code already exists.");
                return;
            }
            await createStudentSetTemplate({ subject: subject.trim(), studentCount: parsedCount }, user.id);
        }
        
        setNewStudentSetTemplate({ subject: '', studentCount: '' });
        await fetchStudentSetTemplates();
    };
    
    const handleEditStudentSetTemplate = (template: StudentSetTemplate) => {
        setNewStudentSetTemplate({ subject: template.subject, studentCount: template.studentCount.toString() });
        setEditingSetTemplateId(template.id);
        // Scroll to top of student set section could be added here if needed
    }

    const cancelEditStudentSetTemplate = () => {
        setNewStudentSetTemplate({ subject: '', studentCount: '' });
        setEditingSetTemplateId(null);
    }
    
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
            await deleteStudentSetTemplate(templateId, user.id, user.role);
            if (editingSetTemplateId === templateId) {
                cancelEditStudentSetTemplate();
            }
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
        if (activeExam.editorMode === 'classic' || activeExam.editorMode === 'advanced') {
            result = await generateClassicSeatingPlan({
                halls: parsedExamData.halls as Hall[], 
                studentSets: parsedExamData.studentSets as StudentSet[], 
                seatingType: parsedExamData.seatingType || 'normal',
            });
        } else { // 'ai' or 'ai-advanced' mode
            result = await generateSeatingPlan({
                halls: parsedExamData.halls as Hall[], 
                studentSets: parsedExamData.studentSets as StudentSet[], 
                rules: parsedExamData.aiSeatingRules || '',
                seatingType: parsedExamData.seatingType || 'normal',
                editorMode: parsedExamData.editorMode
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
    
        // Adjust scale based on seat dimensions for better readability
        const scale = seatDimensions.width > 100 ? 1.5 : 2;
        
        const canvas = await html2canvas(element, { 
            scale, 
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true
        });
    
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
                // Adjust scale based on seat dimensions for better readability
                const scale = seatDimensions.width > 100 ? 1.5 : 2;
                
                const canvas = await html2canvas(element, { 
                    scale, 
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true
                });
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

    // --- Seating Editor Handler ---
    const handleSaveSeatingPlan = async (newPlan: SeatingPlan) => {
        if (!activeExam || !user) return;
        
        setIsLoading(true);
        const success = await updateExamSeatingPlan(activeExam.id, newPlan, user.id);
        
        if (success) {
            setActiveExam(prev => prev ? { ...prev, seatingPlan: newPlan } : null);
             await fetchExams(); // Refresh exam list to ensure data consistency
        } else {
            setFormError("Failed to save the updated seating plan.");
        }
        setIsLoading(false);
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
        setActiveExam({ 
            ...JSON.parse(JSON.stringify(exam)), 
            aiSeatingRules: exam.aiSeatingRules || '', 
            seatingType: exam.seatingType || 'normal', 
            editorMode: exam.editorMode || 'ai' 
        }); // Deep copy and ensure fields exist
        setFormError('');
        setFormWarning('');
        
        // Update seat dimensions based on the selected exam's register numbers
        const { width, height, fontSize } = getSeatSizeFromRegisterNumbers(exam.studentSets);
        setSeatDimensions({ width, height, fontSize });
    };

    const handleStartCreating = (mode: 'ai' | 'classic' | 'advanced' | 'ai-advanced') => {
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
        if (exam.editorMode === 'classic' || exam.editorMode === 'advanced') {
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
                seatingType: exam.seatingType || 'normal',
                editorMode: exam.editorMode
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
                
                // Calculate appropriate scale based on register number length
                const maxLength = getMaxRegisterNumberLength(examForDownload);
                const scale = maxLength > 15 ? 1.5 : 2;
                
                const canvas = await html2canvas(element, { 
                    scale, 
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true
                });
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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <Header />
                <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 border border-gray-200 dark:border-gray-700">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">Permission Required</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">Your account does not have the necessary permissions to manage exams. Please contact the system administrator to request access.</p>
                    </div>
                </main>
            </div>
        )
    }

    if (isLoading && !activeExam) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <Header />
                <main className="max-w-7xl mx-auto py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600 dark:border-blue-400"></div>
                        <span className="text-lg text-gray-600 dark:text-gray-400 font-medium">Loading exam data...</span>
                    </div>
                </main>
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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <Header />
                <main className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {isHallTemplateModalOpen && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start pt-20 z-50 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                            <TemplateIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Select Hall Template</h3>
                                    </div>
                                    <button onClick={() => setIsHallTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {hallTemplates.length > 0 ? hallTemplates.map(template => (
                                        <div key={template.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                                    <TemplateIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{template.layout.length} seats</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="primary" 
                                                size="sm"
                                                className="!py-2 !px-4 text-sm"
                                                onClick={() => { handleAddHallFromTemplate(template); setIsHallTemplateModalOpen(false); }}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                                                <TemplateIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">No hall templates available</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create templates to reuse hall layouts</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Button onClick={() => setIsHallTemplateModalOpen(false)} variant="outline" className="w-full">Cancel</Button>
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
                                : (hallEditorState.mode === 'edit-template' && hallEditorState.templateId 
                                    ? hallTemplates.find(t => t.id === hallEditorState.templateId)?.layout 
                                    : [])
                            }
                            initialName={hallEditorState.mode === 'edit-template' ? hallEditorState.templateName : undefined}
                            isTemplateCreationMode={hallEditorState.mode === 'create-template' || hallEditorState.mode === 'edit-template'}
                        />
                    )}
                    {isSetTemplateModalOpen.open && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start pt-20 z-50 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                            <UsersIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Select Student Set Template</h3>
                                    </div>
                                    <button onClick={() => setIsSetTemplateModalOpen({open: false, index: null})} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {studentSetTemplates.length > 0 ? studentSetTemplates.map(template => (
                                        <div key={template.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                                    <UsersIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{template.subject}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{template.studentCount} students</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="primary"
                                                size="sm"
                                                className="!py-2 !px-4 text-sm"
                                                onClick={() => { 
                                                    if(isSetTemplateModalOpen.index !== null) handleConfigureSet(isSetTemplateModalOpen.index, 'template', template);
                                                    setIsSetTemplateModalOpen({open: false, index: null}); 
                                                }}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                                                <UsersIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">No student set templates available</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create templates to reuse student sets</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Button onClick={() => setIsSetTemplateModalOpen({open: false, index: null})} variant="outline" className="w-full">Cancel</Button>
                                </div>
                            </div>
                        </div>
                    )}
                    {isSeatingEditorOpen && activeExam.seatingPlan && (
                        <SeatingEditor
                            isOpen={true}
                            onClose={() => setIsSeatingEditorOpen(false)}
                            onSave={handleSaveSeatingPlan}
                            initialPlan={activeExam.seatingPlan}
                            halls={activeExam.halls}
                            studentSets={parsedStudentSetsForVisualizer}
                            seatDimensions={seatDimensions}
                        />
                    )}

                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                                    {isNewExam ? `Create New Exam` : 'Edit Exam Configuration'}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    {isNewExam ? 'Configure your exam schedule and seating arrangements' : 'Update your existing exam setup'}
                                </p>
                            </div>
                            <Button 
                                onClick={handleCancel} 
                                variant="outline"
                                className="border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                            >
                                ← Back to Dashboard
                            </Button>
                        </div>

                        

                        <div className="space-y-8">
                            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                        <DocumentIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Exam Information</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Enter the basic details for your exam</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exam Title</label>
                                        <Input 
                                            id="exam-title"
                                            placeholder="e.g., Fall Semester Final Examinations"
                                            value={activeExam.title} 
                                            onChange={e => handleFormChange('title', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exam Date</label>
                                        <Input
                                            id="exam-date"
                                            type="date"
                                            value={activeExam.date}
                                            onChange={e => handleFormChange('date', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </Card>
                            
                            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                                        <SlidersIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Editor Mode Selection</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Choose how you want to arrange seating</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* AI Mode */}
                                    <div
                                        onClick={() => handleEditorModeChange('ai')}
                                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${activeExam.editorMode === 'ai' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-lg ${activeExam.editorMode === 'ai' ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                                <SparklesIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`font-semibold ${activeExam.editorMode === 'ai' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>AI Mode</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Natural language instructions</p>
                                            </div>
                                        </div>
                                        {activeExam.editorMode === 'ai' && (
                                            <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                                        )}
                                    </div>

                                    {/* AI+Advanced Mode */}
                                    <div
                                        onClick={() => handleEditorModeChange('ai-advanced')}
                                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${activeExam.editorMode === 'ai-advanced' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-lg ${activeExam.editorMode === 'ai-advanced' ? 'bg-purple-100 dark:bg-purple-800/30 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                                <ChipIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`font-semibold ${activeExam.editorMode === 'ai-advanced' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>AI + Advanced</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">AI with hall constraints</p>
                                            </div>
                                        </div>
                                        {activeExam.editorMode === 'ai-advanced' && (
                                            <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-purple-500 dark:bg-purple-400"></div>
                                        )}
                                    </div>

                                    {/* Advanced Mode */}
                                    <div
                                        onClick={() => handleEditorModeChange('advanced')}
                                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${activeExam.editorMode === 'advanced' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-lg ${activeExam.editorMode === 'advanced' ? 'bg-cyan-100 dark:bg-cyan-800/30 text-cyan-600 dark:text-cyan-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                                <SlidersIcon className="w-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className={`font-semibold ${activeExam.editorMode === 'advanced' ? 'text-cyan-700 dark:text-cyan-300' : 'text-gray-700 dark:text-gray-300'}`}>Advanced Mode</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manual control with algorithms</p>
                                            </div>
                                        </div>
                                        {activeExam.editorMode === 'advanced' && (
                                            <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-cyan-500 dark:bg-cyan-400"></div>
                                        )}
                                    </div>

                                    {/* Classic Mode */}
                                    <div
                                        onClick={() => handleEditorModeChange('classic')}
                                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${activeExam.editorMode === 'classic' ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-lg ${activeExam.editorMode === 'classic' ? 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                                <GridIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`font-semibold ${activeExam.editorMode === 'classic' ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>Classic Mode</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Simple round-robin distribution</p>
                                            </div>
                                        </div>
                                        {activeExam.editorMode === 'classic' && (
                                            <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-green-500 dark:bg-green-400"></div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                                        <BuildingIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Exam Halls</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure the physical layout and constraints for each examination hall</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    {activeExam.halls.map((hall, index) => {
                                        const templateExists = hallTemplates.some(t => t.name.toLowerCase() === hall.name.trim().toLowerCase());
                                        const isSaving = savingTemplateForHallId === hall.id;
                                        const justSaved = recentlySavedHallIds.includes(hall.id);
                                        const isNameInvalid = !hall.name.trim();

                                        const gridCheck = isSimpleGrid(hall.layout);
                                        const hallMode: 'placeholder' | 'normal' | 'advanced' = hall.layout.length === 0 ? 'placeholder' : (gridCheck.isGrid ? 'normal' : 'advanced');

                                        return (
                                            <div key={hall.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex-grow">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                                <BuildingIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                                            </div>
                                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Hall Configuration</h4>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hall Name</label>
                                                                <Input 
                                                                    id={`hall-name-${index}`} 
                                                                    value={hall.name} 
                                                                    onChange={e => handleHallNameChange(index, e.target.value)}
                                                                    placeholder="e.g., Main Auditorium"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Front Direction</label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {['top', 'bottom', 'left', 'right'].map((dir) => (
                                                                        <button
                                                                            key={dir}
                                                                            type="button"
                                                                            onClick={() => handleFrontDirectionChange(index, dir as 'top' | 'bottom' | 'left' | 'right')}
                                                                            className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${(hall.frontDirection || 'top') === dir ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                                                        >
                                                                            {dir.charAt(0).toUpperCase() + dir.slice(1)}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveHall(index)} 
                                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-4"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>

                                                {hallMode === 'placeholder' && (
                                                    <div className="mb-6 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-center">
                                                        <h5 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300">Define Hall Layout</h5>
                                                        <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">Choose how you want to define the seating layout</p>
                                                        <div className="flex justify-center gap-4">
                                                            <Button 
                                                                variant="outline" 
                                                                onClick={() => handleSetHallLayoutType(index, 'normal')}
                                                                className="!py-3 !px-6"
                                                            >
                                                                Grid Layout
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                onClick={() => handleSetHallLayoutType(index, 'advanced')}
                                                                className="!py-3 !px-6"
                                                            >
                                                                Advanced Editor
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {hallMode === 'normal' && gridCheck.isGrid && (
                                                    <div className="mb-6">
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rows</label>
                                                                <Input 
                                                                    type="number" 
                                                                    value={gridCheck.rows} 
                                                                    min="1" 
                                                                    max="50" 
                                                                    onChange={e => handleHallDimensionChange(index, 'rows', e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Columns</label>
                                                                <Input 
                                                                    type="number" 
                                                                    value={gridCheck.cols} 
                                                                    min="1" 
                                                                    max="50" 
                                                                    onChange={e => handleHallDimensionChange(index, 'cols', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                                    <UsersIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                                                </div>
                                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                    Capacity: <span className="font-semibold">{hall.layout.filter(s => s.type !== 'faculty').length} seats</span>
                                                                </span>
                                                            </div>
                                                            <Button 
                                                                variant="outline" 
                                                                onClick={() => setHallEditorState({ mode: 'edit-hall', hallIndex: index })}
                                                                size="sm"
                                                            >
                                                                Switch to Advanced Editor
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {hallMode === 'advanced' && (
                                                    <div className="mb-6">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                                    <UsersIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                                                </div>
                                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                    Capacity: <span className="font-semibold">{hall.layout.filter(s => s.type !== 'faculty').length} seats</span>
                                                                </span>
                                                            </div>
                                                            <Button 
                                                                variant="outline" 
                                                                onClick={() => setHallEditorState({ mode: 'edit-hall', hallIndex: index })}
                                                                size="sm"
                                                            >
                                                                Edit Advanced Layout
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {['advanced', 'ai-advanced'].includes(activeExam.editorMode || 'ai') && (
                                                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                                        <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Hall Constraints</h5>
                                                        <div className="space-y-6">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Student Placement</label>
                                                                <div className="flex gap-3">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleConstraintTypeChange(index, 'no-limit')}
                                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${(!hall.constraints?.type || hall.constraints?.type === 'no-limit') ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                                                    >
                                                                        No Restrictions
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleConstraintTypeChange(index, 'advanced')}
                                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${hall.constraints?.type === 'advanced' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                                                    >
                                                                        Restricted Sets
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seating Direction</label>
                                                                <div className="flex gap-3">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleArrangementChange(index, 'horizontal')}
                                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${(!hall.constraints?.arrangement || hall.constraints.arrangement === 'horizontal') ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                                                    >
                                                                        Horizontal
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleArrangementChange(index, 'vertical')}
                                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${hall.constraints?.arrangement === 'vertical' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                                                    >
                                                                        Vertical
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {hall.constraints?.type === 'advanced' && (
                                                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Allowed Student Sets</label>
                                                                    {activeExam.studentSets.filter(s => !s.isPlaceholder).length > 0 ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            {activeExam.studentSets.filter(s => !s.isPlaceholder).map(set => (
                                                                                <label key={set.id} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700">
                                                                                    <input 
                                                                                        type="checkbox"
                                                                                        checked={hall.constraints?.allowedSetIds?.includes(set.id) || false}
                                                                                        onChange={e => handleAllowedSetChange(index, set.id, e.target.checked)}
                                                                                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 bg-white dark:bg-gray-800"
                                                                                    />
                                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{set.subject}</span>
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No student sets configured yet</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                                    {justSaved ? (
                                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <span className="text-sm font-medium">Saved as Template</span>
                                                        </div>
                                                    ) : isSaving ? (
                                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                            <span className="text-sm font-medium">Saving...</span>
                                                        </div>
                                                    ) : templateExists ? (
                                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                            <TemplateIcon />
                                                            <span className="text-sm font-medium">Template Exists</span>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            disabled={isNameInvalid || hall.layout.length === 0}
                                                            onClick={() => handleSaveHallAsTemplate(hall)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <TemplateIcon />
                                                            Save as Template
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Button 
                                        onClick={handleAddHall} 
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <PlusIcon />
                                        Add Hall
                                    </Button>
                                    <Button 
                                        onClick={() => setIsHallTemplateModalOpen(true)} 
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <TemplateIcon />
                                        Add from Template
                                    </Button>
                                </div>
                            </Card>
                            
                            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                        <UsersIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Student Sets</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Define groups of students participating in the exam</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    {activeExam.studentSets.map((set, index) => {
                                        if (set.isPlaceholder) {
                                            return (
                                                <div key={set.id} className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                                                    <h4 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300">Configure New Student Set</h4>
                                                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Choose how you want to add student data</p>
                                                    <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
                                                        <Button 
                                                            variant="outline" 
                                                            onClick={() => handleConfigureSet(index, 'custom')}
                                                            className="!py-3 !px-6"
                                                        >
                                                            Create Custom Set
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            onClick={() => setIsSetTemplateModalOpen({ open: true, index })}
                                                            className="!py-3 !px-6"
                                                        >
                                                            Use Template
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            className="!py-3 !px-6 flex items-center gap-2"
                                                            onClick={() => excelFileRefs.current[index]?.click()}
                                                        >
                                                            <ExcelIcon className="h-4 w-4" />
                                                            Upload Excel
                                                        </Button>
                                                        <input type="file" ref={el => { if(el) excelFileRefs.current[index] = el; }} hidden accept=".xlsx, .xls" onChange={(e) => handleExcelFileChange(e, index)} />
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveSet(index)} 
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline transition"
                                                    >
                                                        Remove This Set
                                                    </button>
                                                </div>
                                            );
                                        }

                                        const templateExists = studentSetTemplates.some(t => t.subject.toLowerCase() === set.subject.trim().toLowerCase());
                                        const isSaving = savingTemplateForSetId === set.id;
                                        const justSaved = recentlySavedSetIds.includes(set.id);
                                        const isInvalid = !set.subject.trim() || !(parseInt(String(set.studentCount), 10) > 0);
                                        const isFromExcel = !!set.students;

                                        return (
                                            <div key={set.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject / Set Code</label>
                                                        <Input 
                                                            id={`set-subject-${index}`} 
                                                            value={set.subject} 
                                                            onChange={e => handleSetChange(index, 'subject', e.target.value)}
                                                            placeholder="e.g., PHYS101"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Students</label>
                                                        <Input 
                                                            id={`set-count-${index}`} 
                                                            type="number" 
                                                            min="1" 
                                                            value={set.studentCount} 
                                                            onChange={e => handleSetChange(index, 'studentCount', e.target.value)} 
                                                            readOnly={isFromExcel}
                                                        />
                                                    </div>
                                                    <div className="flex items-end gap-2">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRevertToPlaceholder(index)} 
                                                            className="w-full h-10 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                                                            title="Change Set Type"
                                                        >
                                                            <EditIcon className="h-4 w-4 mr-2" />
                                                            Edit Type
                                                        </button>
                                                    </div>
                                                    <div className="flex items-end">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveSet(index)} 
                                                            className="w-full h-10 flex items-center justify-center bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                                                        >
                                                            <TrashIcon className="h-4 w-4 mr-2" />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {isFromExcel && (
                                                    <div className="mb-4">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Populated from Excel file
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        {isFromExcel && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                <span className="font-medium">Note:</span> Count determined by uploaded Excel file
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {justSaved ? (
                                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <span className="text-sm font-medium">Saved as Template</span>
                                                            </div>
                                                        ) : isSaving ? (
                                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                                <span className="text-sm font-medium">Saving...</span>
                                                            </div>
                                                        ) : templateExists ? (
                                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                                <TemplateIcon />
                                                                <span className="text-sm font-medium">Template Exists</span>
                                                            </div>
                                                        ) : (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                disabled={isInvalid || isFromExcel}
                                                                onClick={() => handleSaveSetAsTemplate(set)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <TemplateIcon />
                                                                Save as Template
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Button 
                                        onClick={handleAddSetPlaceholder} 
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <PlusIcon />
                                        Add Student Set
                                    </Button>
                                    
                                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 bg-blue-100 dark:bg-blue-800/20 rounded">
                                                <ExcelIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Excel Upload Guidelines</p>
                                                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                    <li>• The first sheet name will be used as the set code</li>
                                                    <li>• Format student ID columns as 'Text' to preserve formatting</li>
                                                    <li>• All non-empty cells will be read as student register numbers</li>
                                                    <li>• Supports .xlsx and .xls file formats</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                            
                            {['ai', 'ai-advanced'].includes(activeExam.editorMode || 'ai') && (
                                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                            <SparklesIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">AI Seating Configuration</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Customize seating rules using natural language</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Seating Strategy</label>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <div 
                                                        onClick={() => handleSeatingTypeChange('normal')}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${activeExam.seatingType !== 'fair' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                    >
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className={`h-3 w-3 rounded-full ${activeExam.seatingType !== 'fair' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">Normal Seating</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Efficient seating with custom AI instructions</p>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div 
                                                        onClick={() => handleSeatingTypeChange('fair')}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${activeExam.seatingType === 'fair' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                    >
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className={`h-3 w-3 rounded-full ${activeExam.seatingType === 'fair' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">Fair Seating</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Automatic alternation with extra spacing</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Custom Instructions</label>
                                            <Textarea
                                                id="ai-rules"
                                                value={activeExam.aiSeatingRules || ''}
                                                onChange={e => handleFormChange('aiSeatingRules', e.target.value)}
                                                placeholder="Enter specific seating rules. For example:
• Prioritize front rows for students with accessibility needs
• Separate students from the same department
• Ensure no two adjacent seats have the same subject code
• Place faculty supervisors at the back of each row"
                                                rows={5}
                                                className="w-full"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                AI will interpret your instructions to create the optimal seating arrangement.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}
                            
                            {(activeExam.editorMode === 'classic' || activeExam.editorMode === 'advanced') && (
                                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
                                            <SlidersIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                                {activeExam.editorMode === 'advanced' ? 'Advanced Seating Configuration' : 'Classic Seating Configuration'}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {activeExam.editorMode === 'advanced' ? 'Manual control with predictable algorithms' : 'Simple round-robin distribution'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Seating Strategy</label>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <div 
                                                    onClick={() => handleSeatingTypeChange('normal')}
                                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${activeExam.seatingType !== 'fair' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className={`h-3 w-3 rounded-full ${activeExam.seatingType !== 'fair' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">Normal Seating</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {activeExam.editorMode === 'advanced' 
                                                            ? 'Alternates students and fills all remaining seats'
                                                            : 'Simple round-robin distribution across all halls'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div 
                                                    onClick={() => handleSeatingTypeChange('fair')}
                                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${activeExam.seatingType === 'fair' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className={`h-3 w-3 rounded-full ${activeExam.seatingType === 'fair' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">Fair Seating</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {activeExam.editorMode === 'advanced'
                                                            ? 'Alternates students with empty seats between different sets'
                                                            : 'Ensures spacing between students of different sets'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {formWarning && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-start gap-3">
                                        <div className="p-1.5 bg-amber-100 dark:bg-amber-800/20 rounded">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h1m0 0h-1m1 0v4m0 0v4m0-8h1m-1 0h-1m1 0V8m0 0h-1m1 0V4m0 0h-1m1 0V0" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Note</p>
                                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{formWarning}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {formError && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="flex items-start gap-3">
                                        <div className="p-1.5 bg-red-100 dark:bg-red-800/20 rounded">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-red-800 dark:text-red-300">Validation Error</p>
                                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{formError}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Button 
                                        onClick={handleSave} 
                                        variant="outline"
                                        className="flex-1 !py-4 text-base font-semibold"
                                        disabled={isLoading || !isDirty}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                                                Saving...
                                            </span>
                                        ) : (isNewExam ? 'Save Exam Draft' : 'Update Exam')}
                                    </Button>
                                    <Button 
                                        onClick={handleGeneratePlan} 
                                        variant="primary" 
                                        className="flex-1 !py-4 text-base font-semibold"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Generating Plan...
                                            </span>
                                        ) : 'Generate Seating Plan'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {activeExam.seatingPlan && (
                            <div className="mt-12 space-y-8">
                                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="text-center py-8">
                                        <div className="flex items-center justify-center gap-4 mb-6">
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                                <DownloadIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Seating Plan Ready</h3>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                                            Your seating arrangement has been generated successfully. Download individual hall plans or export the complete seating chart.
                                        </p>
                                        
                                        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                                            <Button
                                                onClick={handleDownloadAllPngsFromEditor}
                                                variant="outline"
                                                className="flex items-center justify-center gap-2 !py-3 !px-6"
                                                disabled={isDownloadingAll}
                                            >
                                                <DownloadIcon className="h-5 w-5" />
                                                {isDownloadingAll ? 'Downloading...' : 'Download All Halls (PNG)'}
                                            </Button>
                                            <Button
                                                onClick={handleDownloadFullExcelFromEditor}
                                                variant="primary"
                                                className="flex items-center justify-center gap-2 !py-3 !px-6"
                                            >
                                                <ExcelIcon className="h-5 w-5" />
                                                Export Full Plan (Excel)
                                            </Button>
                                        </div>
                                        
                                        <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 max-w-lg mx-auto">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-800/20 rounded-lg">
                                                    <EditIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Need manual adjustments?</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Edit individual student placements</p>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={() => setIsSeatingEditorOpen(true)}
                                                variant="primary"
                                                className="w-full !py-3"
                                            >
                                                Open Seating Editor
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                                
                                {/* UPDATED SECTION: Removed fixed height and scroll */}
                                <div className="space-y-8">
                                    {activeExam.halls.map(hall => {
                                        const parsedHall: Hall = {
                                            ...hall,
                                            layout: hall.layout,
                                        };
                                        return (
                                            <Card key={hall.id} ref={el => { if(el) hallRefs.current[hall.id] = el }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full">
                                                <SeatingPlanVisualizer 
                                                    hall={parsedHall} 
                                                    plan={activeExam.seatingPlan!}
                                                    studentSets={parsedStudentSetsForVisualizer}
                                                    seatDimensions={seatDimensions}
                                                />
                                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">{hall.name}</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Seating Plan</p>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <Button 
                                                                onClick={() => handleDownloadPng(hall.id, hall.name)} 
                                                                variant="outline" 
                                                                size="sm"
                                                                className="flex items-center gap-2"
                                                            >
                                                                <DownloadIcon /> PNG
                                                            </Button>
                                                            <Button 
                                                                onClick={() => handleDownloadHallExcel(parsedHall)}
                                                                variant="outline" 
                                                                size="sm"
                                                                className="flex items-center gap-2"
                                                            >
                                                                <ExcelIcon /> Excel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        )
    }

    const aiExams = exams.filter(e => e.editorMode === 'ai' || !e.editorMode);
    const advancedExams = exams.filter(e => e.editorMode === 'advanced');
    const classicExams = exams.filter(e => e.editorMode === 'classic');
    const aiAdvancedExams = exams.filter(e => e.editorMode === 'ai-advanced');
    
    const renderExamList = (examList: Exam[]) => {
        return (
            <div className="space-y-4">
                {examList.map(exam => {
                    const isGenerating = generatingPlanId === exam.id;
                    const isDownloading = downloadingExamId === exam.id;
                    return (
                        <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 cursor-pointer" onClick={() => handleSelectExam(exam)}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg ${exam.editorMode === 'ai' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : exam.editorMode === 'ai-advanced' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : exam.editorMode === 'advanced' ? 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400' : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
                                                {exam.editorMode === 'ai' && <SparklesIcon className="h-5 w-5" />}
                                                {exam.editorMode === 'ai-advanced' && <ChipIcon className="h-5 w-5" />}
                                                {exam.editorMode === 'advanced' && <SlidersIcon className="h-5 w-5" />}
                                                {exam.editorMode === 'classic' && <GridIcon className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{exam.title}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        {exam.date}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Created by: {getCreatorName(exam.createdBy)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${exam.seatingPlan ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                                                {exam.seatingPlan ? '✓ Plan Generated' : '⏱️ Pending Plan'}
                                            </span>
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                                                {exam.halls.length} Hall{exam.halls.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                                                {exam.studentSets.length} Set{exam.studentSets.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleSelectExam(exam)} 
                                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ChevronRightIcon />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        {exam.seatingPlan ? (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-2"
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadAll(exam); }}
                                                    disabled={isDownloading}
                                                >
                                                    <DownloadIcon className="h-4 w-4" />
                                                    {isDownloading ? '...' : 'PNGs'}
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    className="flex items-center gap-2"
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadAllExcel(exam); }}
                                                >
                                                    <ExcelIcon className="h-4 w-4" />
                                                    Excel
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="flex items-center gap-2"
                                                onClick={(e) => { e.stopPropagation(); handleQuickGeneratePlan(exam); }}
                                                disabled={isGenerating}
                                            >
                                                {isGenerating ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        Generating...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <SparklesIcon className="h-4 w-4" />
                                                        Generate Plan
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                    <Button 
                                        variant="danger" 
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteExam(exam.id);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <Header />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {(hallEditorState.mode === 'create-template' || hallEditorState.mode === 'edit-template') && (
                    <HallLayoutEditor
                        isOpen={true}
                        onClose={() => setHallEditorState({ mode: 'closed', hallIndex: null })}
                        onSave={handleSaveFromEditor}
                        initialLayout={
                            hallEditorState.mode === 'edit-hall' && hallEditorState.hallIndex !== null
                            ? activeExam.halls[hallEditorState.hallIndex]?.layout
                            : (hallEditorState.mode === 'edit-template' && hallEditorState.templateId 
                                ? hallTemplates.find(t => t.id === hallEditorState.templateId)?.layout 
                                : [])
                        }
                        initialName={hallEditorState.mode === 'edit-template' ? hallEditorState.templateName : undefined}
                        isTemplateCreationMode={hallEditorState.mode === 'create-template' || hallEditorState.mode === 'edit-template'}
                    />
                )}
                {isGridTemplateModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn" onClick={() => setIsGridTemplateModalOpen(false)}>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                    <GridIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Create Grid Hall Template</h2>
                            </div>
                            <form onSubmit={handleCreateGridTemplate}>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template Name</label>
                                        <Input
                                            id="grid-template-name"
                                            value={newGridTemplate.name}
                                            onChange={e => setNewGridTemplate({ ...newGridTemplate, name: e.target.value })}
                                            required
                                            placeholder="e.g., Main Auditorium Layout"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rows</label>
                                            <Input
                                                id="grid-template-rows"
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={newGridTemplate.rows}
                                                onChange={e => setNewGridTemplate({ ...newGridTemplate, rows: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Columns</label>
                                            <Input
                                                id="grid-template-cols"
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={newGridTemplate.cols}
                                                onChange={e => setNewGridTemplate({ ...newGridTemplate, cols: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    {gridTemplateFormError && (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                                            <p className="text-sm text-red-600 dark:text-red-400">{gridTemplateFormError}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 flex justify-end gap-4">
                                    <Button type="button" variant="outline" onClick={() => setIsGridTemplateModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" variant="primary">Save Template</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">Exam Seating Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Create and manage exam schedules with intelligent seating arrangements</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                    <PlusIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Create New Exam</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose an editor mode to begin creating your exam schedule</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div 
                                    onClick={() => handleStartCreating('ai')}
                                    className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                                            <SparklesIcon className="text-blue-600 dark:text-blue-400 w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200">AI-Powered Mode</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Flexible seating with natural language rules</p>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                                            Natural language instructions
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                                            Intelligent seating optimization
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                                            Flexible rule-based arrangement
                                        </li>
                                    </ul>
                                </div>
                                
                                <div 
                                    onClick={() => handleStartCreating('ai-advanced')}
                                    className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform">
                                            <ChipIcon className="text-purple-600 dark:text-purple-400 w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200">AI + Advanced</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">AI logic with strict hall constraints</p>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-purple-500"></div>
                                            Combined AI and manual control
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-purple-500"></div>
                                            Hall-specific set restrictions
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-purple-500"></div>
                                            Advanced constraint management
                                        </li>
                                    </ul>
                                </div>
                                
                                <div 
                                    onClick={() => handleStartCreating('advanced')}
                                    className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg group-hover:scale-110 transition-transform">
                                            <SlidersIcon className="text-cyan-600 dark:text-cyan-400 w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200">Advanced Mode</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Manual control with predictable algorithms</p>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-cyan-500"></div>
                                            Granular hall control
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-cyan-500"></div>
                                            Deterministic seating
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-cyan-500"></div>
                                            Fast and predictable
                                        </li>
                                    </ul>
                                </div>
                                
                                <div 
                                    onClick={() => handleStartCreating('classic')}
                                    className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:scale-110 transition-transform">
                                            <GridIcon className="text-green-600 dark:text-green-400 w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200">Classic Mode</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Simple round-robin distribution</p>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-green-500"></div>
                                            Simple and fast
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-green-500"></div>
                                            Automatic mixing
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-green-500"></div>
                                            Minimal configuration
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h1m0 0h-1m1 0v4m0 0v4m0-8h1m-1 0h-1m1 0V8m0 0h-1m1 0V4m0 0h-1m1 0V0" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Editor Mode Guide</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Understanding the different seating arrangement methods</p>
                                    </div>
                                </div>
                                <button 
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    onClick={() => setIsHelpVisible(!isHelpVisible)}
                                >
                                    <ChevronDownIcon className={`h-6 w-6 transition-transform ${isHelpVisible ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            
                            {isHelpVisible && (
                                <div className="space-y-8">
                                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Editor Mode Comparison</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-800/20 rounded">
                                                    <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">AI-Powered Mode</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Best for complex scenarios requiring flexible, intelligent seating based on natural language instructions.</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500">Example: "Keep Physics students away from Math students and prioritize front rows for accessibility needs."</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-800/20 rounded">
                                                    <ChipIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">AI + Advanced Mode</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Combines AI intelligence with strict hall-level controls for power users needing precise placement.</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500">Example: Restrict Hall A to Chemistry students only, then apply AI rules within that constraint.</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <div className="p-2 bg-cyan-100 dark:bg-cyan-800/20 rounded">
                                                    <SlidersIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Advanced Mode</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Manual control with predictable algorithms, perfect for standardized exam setups.</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500">Example: Manually assign specific student sets to specific halls with defined seating directions.</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <div className="p-2 bg-green-100 dark:bg-green-800/20 rounded">
                                                    <GridIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Classic Mode</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Simple and fast round-robin distribution for straightforward exam scenarios.</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500">Example: Automatically mix all student sets across all available halls in order.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Workflow Overview</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                                                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-3">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">1</span>
                                                </div>
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Setup</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Enter exam details, add halls, and configure student sets</p>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                                                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-3">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">2</span>
                                                </div>
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Configure</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Choose editor mode and apply seating rules or constraints</p>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                                                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-3">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">3</span>
                                                </div>
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Generate & Export</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Generate seating plan and export as Excel or PNG files</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                                    <DocumentIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">My Exam Schedules</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage and monitor all your exam configurations</p>
                                </div>
                            </div>
                            
                            <div className="border-b border-gray-200 dark:border-gray-700">
                                <nav className="-mb-px flex flex-wrap gap-x-6" aria-label="Tabs">
                                    <button
                                        onClick={() => setActiveTab('ai')}
                                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'ai' ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                    >
                                        AI Exams ({aiExams.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('ai-advanced')}
                                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'ai-advanced' ? 'border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                    >
                                        AI+Advanced ({aiAdvancedExams.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('advanced')}
                                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'advanced' ? 'border-cyan-500 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                    >
                                        Advanced ({advancedExams.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('classic')}
                                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'classic' ? 'border-green-500 dark:border-green-400 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                    >
                                        Classic ({classicExams.length})
                                    </button>
                                </nav>
                            </div>
                            
                            <div className="mt-6">
                                {activeTab === 'ai' && (aiExams.length > 0 ? renderExamList(aiExams) : (
                                    <div className="text-center py-12">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
                                            <SparklesIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No AI exams created yet</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first AI-powered exam schedule</p>
                                    </div>
                                ))}
                                {activeTab === 'ai-advanced' && (aiAdvancedExams.length > 0 ? renderExamList(aiAdvancedExams) : (
                                    <div className="text-center py-12">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full mb-4">
                                            <ChipIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No AI+Advanced exams created yet</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Combine AI with advanced constraints</p>
                                    </div>
                                ))}
                                {activeTab === 'advanced' && (advancedExams.length > 0 ? renderExamList(advancedExams) : (
                                    <div className="text-center py-12">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 dark:bg-cyan-900/20 rounded-full mb-4">
                                            <SlidersIcon className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No Advanced exams created yet</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create exams with manual control</p>
                                    </div>
                                ))}
                                {activeTab === 'classic' && (classicExams.length > 0 ? renderExamList(classicExams) : (
                                    <div className="text-center py-12">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                                            <GridIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No Classic exams created yet</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create simple round-robin exams</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                    <TemplateIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Template Library</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Reuse configurations across exams</p>
                                </div>
                            </div>
                            
                            <div className="space-y-8">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Hall Layout Templates</h3>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{hallTemplates.length} templates</span>
                                    </div>
                                    
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 space-y-3">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Create New Template</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            <Button 
                                                onClick={() => {
                                                    setIsGridTemplateModalOpen(true);
                                                    setGridTemplateFormError('');
                                                    setNewGridTemplate({ name: '', rows: '8', cols: '10' });
                                                }} 
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <GridIcon className="h-4 w-4" />
                                                Grid Template
                                            </Button>
                                            <Button 
                                                onClick={() => setHallEditorState({ mode: 'create-template', hallIndex: null })} 
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <TemplateIcon className="h-4 w-4" />
                                                Custom Layout
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {hallTemplates.length > 0 ? hallTemplates.map(template => (
                                            <div key={template.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded">
                                                        <TemplateIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{template.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{template.layout.length} seats</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleEditHallTemplate(template)} 
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    >
                                                        <EditIcon className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteHallTemplate(template.id)} 
                                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-6">
                                                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                                                    <TemplateIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No hall templates</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Student Set Templates</h3>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{studentSetTemplates.length} templates</span>
                                    </div>
                                    
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {editingSetTemplateId ? 'Edit Template' : 'Create New Template'}
                                            </h4>
                                            {editingSetTemplateId && (
                                                <button 
                                                    type="button" 
                                                    onClick={cancelEditStudentSetTemplate}
                                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                                                >
                                                    Cancel Edit
                                                </button>
                                            )}
                                        </div>
                                        
                                        <form onSubmit={handleCreateStudentSetTemplate} className="space-y-3">
                                            <Input 
                                                placeholder="Subject / Code" 
                                                value={newStudentSetTemplate.subject} 
                                                onChange={e => setNewStudentSetTemplate({...newStudentSetTemplate, subject: e.target.value})}
                                                size="sm"
                                            />
                                            <Input 
                                                type="number" 
                                                min="1" 
                                                placeholder="Student Count" 
                                                value={newStudentSetTemplate.studentCount} 
                                                onChange={e => setNewStudentSetTemplate({...newStudentSetTemplate, studentCount: e.target.value})}
                                                size="sm"
                                            />
                                            {studentSetTemplateFormError && (
                                                <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                                                    <p className="text-xs text-red-600 dark:text-red-400">{studentSetTemplateFormError}</p>
                                                </div>
                                            )}
                                            <Button 
                                                type="submit" 
                                                variant="primary" 
                                                size="sm"
                                                className="w-full"
                                            >
                                                {editingSetTemplateId ? 'Update Template' : 'Save Template'}
                                            </Button>
                                        </form>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {studentSetTemplates.length > 0 ? studentSetTemplates.map(template => (
                                            <div key={template.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded">
                                                        <UsersIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{template.subject}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{template.studentCount} students</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleEditStudentSetTemplate(template)} 
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    >
                                                        <EditIcon className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteStudentSetTemplate(template.id)} 
                                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-6">
                                                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                                                    <UsersIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No student set templates</p>
                                            </div>
                                        )}
                                    </div>
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
                                        seatDimensions={getSeatSizeFromRegisterNumbers(examForDownload.studentSets)}
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