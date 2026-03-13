
import React, { useState, useEffect, useCallback } from 'react';
import { SeatingPlan, Seat, StudentSet, StudentInfo, Hall } from '../../types';
import { SET_COLORS } from '../../constants';
import Button from './Button';

interface SeatingEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newPlan: SeatingPlan) => void;
    initialPlan: SeatingPlan;
    halls: Hall[];
    studentSets: StudentSet[];
    seatDimensions?: { width: number; height: number; fontSize: number };
}

interface HistoryState {
    plan: SeatingPlan;
    holdingStudents: StudentInfo[];
}

// Icons
const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const ExclamationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
);

const RedoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
</svg>
);

const SeatingEditor: React.FC<SeatingEditorProps> = ({ isOpen, onClose, onSave, initialPlan, halls, studentSets, seatDimensions }) => {
    const [plan, setPlan] = useState<SeatingPlan>(initialPlan);
    const [selectedHallId, setSelectedHallId] = useState<string>(halls[0]?.id || '');
    
    // Selection State
    const [selectedSeatKeys, setSelectedSeatKeys] = useState<Set<string>>(new Set());

    // Drag state
    const [draggedSeat, setDraggedSeat] = useState<{ hallId: string; row: number; col: number; student: StudentInfo } | null>(null);
    const [draggedFromHolding, setDraggedFromHolding] = useState<StudentInfo | null>(null);
    
    // Holding Bay (for unseated students or swapping buffer)
    const [holdingStudents, setHoldingStudents] = useState<StudentInfo[]>([]);
    
    // History State
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Error state
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Deep copy plan to avoid mutating props
            const copy: SeatingPlan = {};
            Object.keys(initialPlan).forEach(hId => {
                copy[hId] = initialPlan[hId].map(row => row.map(seat => seat ? ({...seat}) : null as any));
            });
            setPlan(copy);
            setSelectedHallId(halls[0]?.id || '');
            setHoldingStudents([]);
            setSelectedSeatKeys(new Set());
            setErrorMessage(null);

            // Initialize History
            const initialState: HistoryState = {
                plan: JSON.parse(JSON.stringify(copy)),
                holdingStudents: []
            };
            setHistory([initialState]);
            setHistoryIndex(0);
        }
    }, [isOpen, initialPlan, halls]);

    const addToHistory = (newPlan: SeatingPlan, newHolding: StudentInfo[]) => {
        // Create deep copies for historical state
        const snapshot: HistoryState = {
            plan: JSON.parse(JSON.stringify(newPlan)),
            holdingStudents: JSON.parse(JSON.stringify(newHolding))
        };
        
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(snapshot);
        
        if (newHistory.length > 50) newHistory.shift();

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        // Update active View State
        setPlan(newPlan);
        setHoldingStudents(newHolding);
    };

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const snapshot = history[newIndex];
            setPlan(JSON.parse(JSON.stringify(snapshot.plan)));
            setHoldingStudents(JSON.parse(JSON.stringify(snapshot.holdingStudents)));
            setHistoryIndex(newIndex);
            setSelectedSeatKeys(new Set());
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const snapshot = history[newIndex];
            setPlan(JSON.parse(JSON.stringify(snapshot.plan)));
            setHoldingStudents(JSON.parse(JSON.stringify(snapshot.holdingStudents)));
            setHistoryIndex(newIndex);
            setSelectedSeatKeys(new Set());
        }
    }, [history, historyIndex]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleUndo, handleRedo]);

    const getSeatKey = (hallId: string, row: number, col: number) => `${hallId}-${row}-${col}`;

    const handleSeatClick = (e: React.MouseEvent, hallId: string, row: number, col: number, student?: StudentInfo) => {
        e.stopPropagation();
        if (!student) {
             if (!e.shiftKey) setSelectedSeatKeys(new Set());
             return;
        }

        const key = getSeatKey(hallId, row, col);
        const newSelection = new Set(e.shiftKey ? selectedSeatKeys : []);

        if (newSelection.has(key)) {
            newSelection.delete(key);
        } else {
            newSelection.add(key);
        }
        setSelectedSeatKeys(newSelection);
    };

    const handleBackgroundClick = () => {
        setSelectedSeatKeys(new Set());
    };

    const handleDragStart = (e: React.DragEvent, hallId: string, row: number, col: number, student: StudentInfo) => {
        const key = getSeatKey(hallId, row, col);
        
        if (!selectedSeatKeys.has(key)) {
            setSelectedSeatKeys(new Set([key]));
        }

        setDraggedSeat({ hallId, row, col, student });
        setDraggedFromHolding(null);
        e.dataTransfer.effectAllowed = 'move';
        document.body.classList.add('cursor-grabbing');
    };

    const handleDragStartHolding = (e: React.DragEvent, student: StudentInfo) => {
        setDraggedFromHolding(student);
        setDraggedSeat(null);
        setSelectedSeatKeys(new Set()); 
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        document.body.classList.remove('cursor-grabbing');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnSeat = (e: React.DragEvent, targetHallId: string, targetRow: number, targetCol: number) => {
        e.preventDefault();
        
        // Surgical deep clone of current plan to ensure state immutability
        const newPlan: SeatingPlan = {};
        Object.keys(plan).forEach(hId => {
            newPlan[hId] = plan[hId].map(row => row.map(seat => seat ? ({...seat}) : null as any));
        });

        const currentHallPlan = newPlan[targetHallId];
        if (!currentHallPlan) return;
        const targetSeat = currentHallPlan[targetRow]?.[targetCol];
        if (!targetSeat) return; 

        let newHoldingStudents = [...holdingStudents];

        if (draggedSeat) {
            const rowOffset = targetRow - draggedSeat.row;
            const colOffset = targetCol - draggedSeat.col;

            const sources: {hallId: string, row: number, col: number, student: StudentInfo}[] = [];
            const destinations: {hallId: string, row: number, col: number, existingStudent?: StudentInfo}[] = [];
            const getSeat = (h: string, r: number, c: number) => newPlan[h]?.[r]?.[c];

            for (const key of selectedSeatKeys) {
                const [h, rStr, cStr] = key.split('-');
                const r = parseInt(rStr);
                const c = parseInt(cStr);
                
                const sourceSeat = getSeat(h, r, c);
                if (sourceSeat && sourceSeat.student) {
                    sources.push({ hallId: h, row: r, col: c, student: sourceSeat.student });

                    const destHallId = targetHallId; 
                    const destRow = r + rowOffset;
                    const destCol = c + colOffset;

                    const destSeat = getSeat(destHallId, destRow, destCol);
                    if (!destSeat) {
                        return; // Cancel the entire move if any part of the selection lands outside boundaries
                    }
                    destinations.push({ hallId: destHallId, row: destRow, col: destCol, existingStudent: destSeat.student });
                }
            }

            const updates = new Map<string, StudentInfo | undefined>();

            sources.forEach((src, idx) => {
                const dest = destinations[idx];
                updates.set(getSeatKey(dest.hallId, dest.row, dest.col), src.student);
                
                if (dest.existingStudent) {
                    const isDestAlsoSource = sources.some(s => s.hallId === dest.hallId && s.row === dest.row && s.col === dest.col);
                    if (!isDestAlsoSource) {
                        updates.set(getSeatKey(src.hallId, src.row, src.col), dest.existingStudent);
                    }
                } else {
                     if (!updates.has(getSeatKey(src.hallId, src.row, src.col))) {
                        updates.set(getSeatKey(src.hallId, src.row, src.col), undefined);
                     }
                }
            });

            updates.forEach((student, key) => {
                const [h, rStr, cStr] = key.split('-');
                const seat = getSeat(h, parseInt(rStr), parseInt(cStr));
                if (seat) {
                    if (student) seat.student = student;
                    else delete seat.student;
                }
            });
            
            const newSelection = new Set<string>();
            destinations.forEach(dest => {
                 newSelection.add(getSeatKey(dest.hallId, dest.row, dest.col));
            });
            setSelectedSeatKeys(newSelection);
            
            addToHistory(newPlan, newHoldingStudents);
        } 
        else if (draggedFromHolding) {
            if (targetSeat.student) {
                const prevStudent = targetSeat.student;
                newHoldingStudents = newHoldingStudents.filter(s => s.id !== draggedFromHolding.id);
                newHoldingStudents.push(prevStudent);
                targetSeat.student = draggedFromHolding;
            } else {
                newHoldingStudents = newHoldingStudents.filter(s => s.id !== draggedFromHolding.id);
                targetSeat.student = draggedFromHolding;
            }
            addToHistory(newPlan, newHoldingStudents);
        }
        
        setDraggedSeat(null);
        setDraggedFromHolding(null);
    };

    const handleDropOnHolding = (e: React.DragEvent) => {
        e.preventDefault();
        
        if (draggedSeat) {
            const newPlan: SeatingPlan = {};
            Object.keys(plan).forEach(hId => {
                newPlan[hId] = plan[hId].map(row => row.map(seat => seat ? ({...seat}) : null as any));
            });

            let newHoldingStudents = [...holdingStudents];
            const studentsToHold: StudentInfo[] = [];

            if (selectedSeatKeys.size > 0) {
                 selectedSeatKeys.forEach(key => {
                    const [h, r, c] = key.split('-');
                    const seat = newPlan[h]?.[parseInt(r)]?.[parseInt(c)];
                    
                    if (seat && seat.student) {
                        studentsToHold.push(seat.student);
                        delete seat.student;
                    }
                 });
                 setSelectedSeatKeys(new Set());
            } else {
                const oldSeat = newPlan[draggedSeat.hallId]?.[draggedSeat.row]?.[draggedSeat.col];
                if (oldSeat && oldSeat.student) {
                    studentsToHold.push(oldSeat.student);
                    delete oldSeat.student;
                }
            }

            if (studentsToHold.length > 0) {
                newHoldingStudents = [...newHoldingStudents, ...studentsToHold];
            }
            
            addToHistory(newPlan, newHoldingStudents);
        }
        setDraggedSeat(null);
        setDraggedFromHolding(null);
    };

    const handleSaveClick = () => {
        if (holdingStudents.length > 0) {
            setErrorMessage(`Cannot save changes! There are ${holdingStudents.length} students currently unseated in the holding area.`);
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }
        onSave(plan);
        onClose();
    };

    const getSetColor = (setId: string) => {
        const index = studentSets.findIndex(s => s.id === setId);
        return index >= 0 ? SET_COLORS[index % SET_COLORS.length] : 'bg-gray-200';
    };
    
    const handleSelectAllInHall = () => {
        if (!selectedHallId) return;
        const hallPlan = plan[selectedHallId];
        const newSelection = new Set<string>();
        hallPlan.forEach((row, r) => {
            row.forEach((seat, c) => {
                if (seat && seat.student) {
                    newSelection.add(getSeatKey(selectedHallId, r, c));
                }
            })
        });
        setSelectedSeatKeys(newSelection);
    }

    if (!isOpen) return null;

    // Determine seat styling based on provided or default dimensions
    const seatW = seatDimensions?.width ? `${seatDimensions.width / 16}rem` : '7rem';
    const seatH = seatDimensions?.height ? `${seatDimensions.height / 16}rem` : '4rem';
    const seatFontSize = seatDimensions?.fontSize ? `${seatDimensions.fontSize}px` : '0.75rem';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center px-6 py-3 gap-4 shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-600 dark:text-violet-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Seating Editor</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                                Drag to move. <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded font-mono">Shift+Click</kbd> for multi-select.
                            </p>
                        </div>
                    </div>

                    <div className="flex overflow-x-auto max-w-lg p-1 bg-slate-100 dark:bg-slate-800 rounded-lg no-scrollbar">
                        {halls.map(hall => (
                            <button
                                key={hall.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedHallId(hall.id); }}
                                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap flex-1 ${
                                    selectedHallId === hall.id 
                                    ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                {hall.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex gap-1 mr-2 border-r dark:border-slate-700 pr-3">
                            <button 
                                onClick={handleUndo} 
                                disabled={historyIndex <= 0}
                                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                title="Undo (Ctrl+Z)"
                            >
                                <UndoIcon />
                            </button>
                            <button 
                                onClick={handleRedo} 
                                disabled={historyIndex >= history.length - 1}
                                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                title="Redo (Ctrl+Y)"
                            >
                                <RedoIcon />
                            </button>
                        </div>
                        <Button onClick={onClose} variant="secondary" className="!px-4">Cancel</Button>
                        <Button onClick={handleSaveClick} className="flex items-center !px-5 shadow-lg shadow-violet-500/20">
                            <SaveIcon /> Save
                        </Button>
                    </div>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    {/* Holding Bay */}
                    <aside className="w-80 flex-shrink-0 flex flex-col bg-slate-50 dark:bg-slate-800/50 border-r dark:border-slate-800 shadow-inner">
                        <div className="p-4 flex-grow flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    Holding Area
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${holdingStudents.length > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                        {holdingStudents.length}
                                    </span>
                                </h3>
                            </div>
                            
                            <div 
                                className={`flex-grow border-2 border-dashed rounded-xl p-3 overflow-y-auto transition-all ${
                                    holdingStudents.length > 0 
                                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-500/50' 
                                    : 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/30'
                                } hover:border-violet-400 dark:hover:border-violet-500`}
                                onDragOver={handleDragOver}
                                onDrop={handleDropOnHolding}
                            >
                                <div className="grid grid-cols-2 gap-2">
                                    {holdingStudents.map(student => (
                                        <div
                                            key={student.id}
                                            draggable
                                            onDragStart={(e) => handleDragStartHolding(e, student)}
                                            onDragEnd={handleDragEnd}
                                            className={`
                                                p-2 rounded-lg text-xs text-center font-bold cursor-grab active:cursor-grabbing 
                                                shadow-sm border border-black/5 text-slate-900 hover:shadow-md transition-all 
                                                ${getSetColor(student.setId)}
                                            `}
                                        >
                                            {student.id}
                                        </div>
                                    ))}
                                </div>
                                {holdingStudents.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        <p className="text-sm font-medium">Drop Students Here</p>
                                        <p className="text-xs opacity-75 text-center px-4">Drag students off the grid to unseat them temporarily.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900/50">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Student Sets</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {studentSets.map((set, i) => (
                                    <div key={set.id} className="flex items-center text-xs group">
                                        <div className={`w-3 h-3 rounded-full mr-2 shadow-sm ${SET_COLORS[i % SET_COLORS.length]}`}></div>
                                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">{set.subject}</span>
                                        <span className="ml-auto text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                            {set.studentCount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Main Canvas with Enhanced Scrolling and Spacing */}
                    <main 
                        className="flex-grow flex flex-col bg-slate-100 dark:bg-[#0B1120] relative overflow-auto custom-scrollbar"
                        style={{
                            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                        onClick={handleBackgroundClick}
                    >
                        {/* Grid Toolbar - Sticky to the top viewport */}
                        <div className="sticky top-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-3 z-30 border dark:border-slate-700 w-max mx-auto">
                             <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-2">Selection: {selectedSeatKeys.size}</div>
                             <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                             <button onClick={handleSelectAllInHall} className="text-xs font-medium hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Select All</button>
                             <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                             <button onClick={() => setSelectedSeatKeys(new Set())} className="text-xs font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors">Clear</button>
                        </div>

                        {/* Grid Wrapper */}
                        <div className="flex-grow flex justify-center items-start min-h-full min-w-full pt-20 pb-40 pl-40 pr-40">
                            {selectedHallId && plan[selectedHallId] && (() => {
                                const currentGrid = plan[selectedHallId];
                                const maxCols = currentGrid.reduce((max, row) => Math.max(max, row.length), 0);

                                return (
                                    <div 
                                        className="relative grid gap-4 p-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 w-max"
                                        style={{ 
                                            gridTemplateColumns: `repeat(${maxCols}, minmax(${seatW}, 1fr))` 
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="absolute -inset-8 border-2 border-transparent pointer-events-none rounded-3xl"></div>
                                        
                                        {currentGrid.map((row, rIndex) => (
                                            row.map((seat, cIndex) => {
                                                if (!seat) return <div key={`${rIndex}-${cIndex}`} style={{ height: seatH, width: seatW }} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg opacity-50"></div>;

                                                const isOccupied = !!seat.student;
                                                const bgColor = isOccupied ? getSetColor(seat.student!.setId) : 'bg-slate-100 dark:bg-slate-700';
                                                
                                                const seatKey = getSeatKey(selectedHallId, rIndex, cIndex);
                                                const isSelected = selectedSeatKeys.has(seatKey);

                                                return (
                                                    <div
                                                        key={`${seat.hallId}-${rIndex}-${cIndex}`}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDropOnSeat(e, selectedHallId, rIndex, cIndex)}
                                                        draggable={isOccupied}
                                                        onDragStart={(e) => isOccupied && handleDragStart(e, selectedHallId, rIndex, cIndex, seat.student!)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={(e) => handleSeatClick(e, selectedHallId, rIndex, cIndex, seat.student)}
                                                        className={`
                                                            rounded-xl flex flex-col items-center justify-center font-bold
                                                            border transition-all duration-200 relative px-2
                                                            ${bgColor}
                                                            ${isOccupied 
                                                                ? 'cursor-grab active:cursor-grabbing border-transparent text-slate-900 shadow-sm hover:shadow-md hover:-translate-y-0.5' 
                                                                : 'border-slate-200 dark:border-slate-600 border-dashed text-slate-300 dark:text-slate-600'}
                                                            ${seat.type === 'faculty' ? 'ring-2 ring-yellow-400' : ''}
                                                            ${seat.type === 'accessible' ? 'ring-2 ring-blue-400' : ''}
                                                            ${isSelected ? 'ring-4 ring-indigo-500 z-10 shadow-xl scale-105' : ''}
                                                        `}
                                                        style={{ 
                                                            height: seatH, 
                                                            width: seatW,
                                                            fontSize: seatFontSize
                                                        }}
                                                        title={`R${rIndex+1} C${cIndex+1} ${seat.student ? `(${seat.student.id})` : 'Empty'}`}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-0.5 shadow-md">
                                                                <CheckIcon />
                                                            </div>
                                                        )}
                                                        
                                                        {isOccupied ? (
                                                            <span className="break-all text-center leading-tight">{seat.student?.id}</span>
                                                        ) : (
                                                            <span className="text-[10px] font-mono opacity-50">{rIndex+1}-{cIndex+1}</span>
                                                        )}
                                                    </div>
                                                );
                                            }).concat(Array.from({ length: maxCols - row.length }).map((_, i) => (
                                                <div key={`pad-${rIndex}-${i}`} style={{ height: seatH, width: seatW }}></div>
                                            )))
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </main>
                </div>

                {/* Error Toast */}
                {errorMessage && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
                        <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 border border-red-500 max-w-md">
                            <ExclamationIcon />
                            <div className="flex-grow">
                                <h4 className="font-bold">Cannot Save Changes</h4>
                                <p className="text-sm text-red-100">{errorMessage}</p>
                            </div>
                            <button onClick={() => setErrorMessage(null)} className="text-red-200 hover:text-white">
                                <XIcon />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeatingEditor;
