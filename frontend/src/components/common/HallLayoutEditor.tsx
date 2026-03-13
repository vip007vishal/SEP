

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SeatDefinition, SeatType } from '../../types';
import { generateLayoutFromImage } from '../../services/examService';
import Button from './Button';
import Input from './Input';

interface HallLayoutEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { layout: SeatDefinition[], name?: string }) => void;
    initialLayout?: SeatDefinition[];
    initialName?: string;
    isTemplateCreationMode?: boolean;
}

const SEAT_TYPES: { type: SeatType, label: string, style: string, icon: React.ReactNode }[] = [
    { type: 'standard', label: 'Standard', style: 'bg-slate-300 dark:bg-slate-600', icon: null },
    { type: 'accessible', label: 'Accessible', style: 'bg-blue-300 dark:bg-blue-600', icon: <span title="Accessible Seating">♿</span> },
    { type: 'faculty', label: 'Faculty', style: 'bg-yellow-300 dark:bg-yellow-600', icon: <span title="Faculty/Invigilator Seat">👁️</span> },
];

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const CursorClickIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.524l1.822 6.723L1.94 11.23a1 1 0 00.72 1.916h3.417l2.128 6.384a1 1 0 001.902-.619l-1.077-3.23 3.616 1.808a1 1 0 001.378-.868l1.37-7.533a1 1 0 00-1.37-1.171l-7.353 3.16.822-6.166z" clipRule="evenodd" />
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

interface HistoryState {
    seats: SeatDefinition[];
    rows: number;
    cols: number;
}

const HallLayoutEditor: React.FC<HallLayoutEditorProps> = ({ isOpen, onClose, onSave, initialLayout, initialName, isTemplateCreationMode }) => {
    const [seats, setSeats] = useState<SeatDefinition[]>(initialLayout || []);
    const [rows, setRows] = useState(10);
    const [cols, setCols] = useState(10);
    const [draggedSeat, setDraggedSeat] = useState<{ type: SeatType } | { id: string } | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [nameError, setNameError] = useState('');
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    
    // Multi-selection state
    const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    // History state
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize state and history
    useEffect(() => {
        let initialSeats: SeatDefinition[] = [];
        let initialRows = 10;
        let initialCols = 10;

        if (initialLayout && initialLayout.length > 0) {
            initialSeats = initialLayout;
            const maxRow = Math.max(9, ...initialLayout.map(s => s.row));
            const maxCol = Math.max(9, ...initialLayout.map(s => s.col));
            initialRows = maxRow + 1;
            initialCols = maxCol + 1;
        }

        setSeats(initialSeats);
        setRows(initialRows);
        setCols(initialCols);
        setTemplateName(initialName || '');
        setNameError('');
        setSelectedSeatIds(new Set());
        
        // Reset history
        const initialState: HistoryState = { seats: initialSeats, rows: initialRows, cols: initialCols };
        setHistory([initialState]);
        setHistoryIndex(0);

    }, [initialLayout, initialName, isOpen]);

    // Helper to push state to history
    const addToHistory = useCallback((newSeats: SeatDefinition[], newRows: number, newCols: number) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, { seats: newSeats, rows: newRows, cols: newCols }];
        });
        setHistoryIndex(prev => prev + 1);
        
        // Update current state
        setSeats(newSeats);
        setRows(newRows);
        setCols(newCols);
    }, [historyIndex]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const previousState = history[newIndex];
            setSeats(previousState.seats);
            setRows(previousState.rows);
            setCols(previousState.cols);
            setHistoryIndex(newIndex);
            setSelectedSeatIds(new Set()); // Clear selection on undo to avoid ghost selections
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const nextState = history[newIndex];
            setSeats(nextState.seats);
            setRows(nextState.rows);
            setCols(nextState.cols);
            setHistoryIndex(newIndex);
            setSelectedSeatIds(new Set());
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


    const handleSeatClick = (e: React.MouseEvent, seatId: string) => {
        e.stopPropagation(); 
        
        const newSelection = new Set(selectedSeatIds);
        
        if (e.shiftKey || isMultiSelectMode) {
            if (newSelection.has(seatId)) {
                newSelection.delete(seatId);
            } else {
                newSelection.add(seatId);
            }
            setSelectedSeatIds(newSelection);
        } else {
            if (!selectedSeatIds.has(seatId)) {
                setSelectedSeatIds(new Set([seatId]));
            } else {
                 setSelectedSeatIds(new Set([seatId]));
            }
        }
    };

    const handleBackgroundClick = () => {
        setSelectedSeatIds(new Set());
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetRow: number, targetCol: number) => {
        e.preventDefault();
        
        if (draggedSeat) {
            if ('type' in draggedSeat) { // New seat from palette
                if (seats.some(s => s.row === targetRow && s.col === targetCol)) {
                    return;
                }
                const newSeat: SeatDefinition = {
                    id: `seat-${Date.now()}-${Math.random()}`,
                    row: targetRow,
                    col: targetCol,
                    type: draggedSeat.type
                };
                const newSeats = [...seats, newSeat];
                addToHistory(newSeats, rows, cols);
                setSelectedSeatIds(new Set([newSeat.id]));
            } else if ('id' in draggedSeat) { // Moving existing seat(s)
                const anchorSeat = seats.find(s => s.id === draggedSeat.id);
                if (!anchorSeat) return;

                const rowDelta = targetRow - anchorSeat.row;
                const colDelta = targetCol - anchorSeat.col;

                const seatsToMove = seats.filter(s => selectedSeatIds.has(s.id));
                
                const isValidMove = seatsToMove.every(s => {
                    const newRow = s.row + rowDelta;
                    const newCol = s.col + colDelta;
                    
                    if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) return false;

                    const collidingSeat = seats.find(existing => 
                        existing.row === newRow && 
                        existing.col === newCol && 
                        !selectedSeatIds.has(existing.id)
                    );
                    if (collidingSeat) return false;

                    return true;
                });

                if (isValidMove) {
                    const newSeats = seats.map(s => {
                        if (selectedSeatIds.has(s.id)) {
                            return { ...s, row: s.row + rowDelta, col: s.col + colDelta };
                        }
                        return s;
                    });
                    addToHistory(newSeats, rows, cols);
                }
            }
        }
        setDraggedSeat(null);
        e.currentTarget.classList.remove('bg-violet-200', 'dark:bg-violet-700/50');
    };

    const handleDragStartPalette = (e: React.DragEvent<HTMLDivElement>, type: SeatType) => {
        setDraggedSeat({ type });
        e.dataTransfer.effectAllowed = 'copy';
        setSelectedSeatIds(new Set());
    };

    const handleDragStartGrid = (e: React.DragEvent<HTMLDivElement>, seat: SeatDefinition) => {
        if (!selectedSeatIds.has(seat.id)) {
            setSelectedSeatIds(new Set([seat.id]));
        }
        
        setDraggedSeat({ id: seat.id });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-violet-200', 'dark:bg-violet-700/50');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-violet-200', 'dark:bg-violet-700/50');
    };
    
    const handleTrashDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (draggedSeat && 'id' in draggedSeat) {
            const newSeats = seats.filter(s => !selectedSeatIds.has(s.id));
            addToHistory(newSeats, rows, cols);
            setSelectedSeatIds(new Set());
        }
        setDraggedSeat(null);
        e.currentTarget.classList.remove('bg-red-500/50');
    };
    
    const handleSelectAll = () => {
        setSelectedSeatIds(new Set(seats.map(s => s.id)));
    };
    
    const handleClearSelection = () => {
        setSelectedSeatIds(new Set());
    };

    const handleSaveClick = () => {
        if (isTemplateCreationMode) {
            if (!templateName.trim()) {
                setNameError('Template name is required.');
                return;
            }
            onSave({ layout: seats, name: templateName });
        } else {
            onSave({ layout: seats });
        }
    };

    const updateGridSize = (type: 'rows' | 'cols', value: number) => {
        const newSize = Math.max(1, Math.min(50, value)); // Clamp size between 1 and 50
        let newSeats = seats;
        
        if (type === 'rows') {
            newSeats = seats.filter(s => s.row < newSize);
            addToHistory(newSeats, newSize, cols);
        } else {
            newSeats = seats.filter(s => s.col < newSize);
            addToHistory(newSeats, rows, newSize);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsAnalyzingImage(true);
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onloadend = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1];
                    const mimeType = file.type;
                    const result = await generateLayoutFromImage(base64String, mimeType);
                    
                    if (result) {
                        addToHistory(result.layout, result.rows, result.cols);
                    } else {
                        alert("Could not analyze image. Please try again with a clearer image of the seating arrangement.");
                    }
                } catch (error) {
                    console.error(error);
                    alert("An error occurred during image processing.");
                } finally {
                    setIsAnalyzingImage(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            };
            reader.readAsDataURL(file);
        }
    };


    if (!isOpen) return null;

    const seatsMap = new Map(seats.map(s => [`${s.row}-${s.col}`, s]));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isTemplateCreationMode ? 'Create Hall Template' : 'Hall Layout Editor'}</h2>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 mr-4 border-r dark:border-slate-700 pr-4">
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
                        <Button onClick={onClose} variant="secondary">Close</Button>
                    </div>
                </header>

                <div className="flex-grow flex overflow-hidden relative">
                    {isAnalyzingImage && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-50 flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mb-4"></div>
                            <p className="text-violet-700 dark:text-violet-400 font-semibold">AI is analyzing your image to generate the layout...</p>
                        </div>
                    )}
                    
                    {/* Palette */}
                    <aside className="w-64 p-4 border-r dark:border-slate-700 flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Tools</h3>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            <div className="space-y-2">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 p-2 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-500/30 rounded-md transition-colors text-sm font-medium"
                                    disabled={isAnalyzingImage}
                                >
                                    <CameraIcon /> Import from Image
                                </button>
                                
                                <button 
                                    onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md transition-colors text-sm font-medium ${isMultiSelectMode ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                                >
                                    <CursorClickIcon /> {isMultiSelectMode ? 'Multi-Select On' : 'Multi-Select Off'}
                                </button>
                            </div>
                        </div>

                        <div className="mb-2">
                            <h3 className="font-semibold">Selection</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                {selectedSeatIds.size} seat{selectedSeatIds.size !== 1 ? 's' : ''} selected
                            </p>
                            <div className="flex gap-2">
                                <button onClick={handleSelectAll} className="flex-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-2 py-1 rounded">Select All</button>
                                <button onClick={handleClearSelection} className="flex-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-2 py-1 rounded">Clear</button>
                            </div>
                        </div>

                        <h3 className="font-semibold">Seat Palette</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Drag a seat type onto the grid.</p>
                        {SEAT_TYPES.map(({ type, label, style, icon }) => (
                            <div
                                key={type}
                                draggable
                                onDragStart={(e) => handleDragStartPalette(e, type)}
                                className={`p-2 rounded-md cursor-grab flex items-center gap-2 ${style}`}
                            >
                                <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-slate-800 dark:text-slate-900 border border-slate-400 dark:border-slate-500`}>
                                    {icon}
                                </div>
                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{label}</span>
                            </div>
                        ))}
                         <div className="mt-auto pt-4 border-t dark:border-slate-700">
                             <div 
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-red-500/50'); }}
                                onDragLeave={(e) => e.currentTarget.classList.remove('bg-red-500/50')}
                                onDrop={handleTrashDrop}
                                className="border-2 border-dashed border-red-500 rounded-lg p-4 text-center text-red-500 transition-colors"
                            >
                                <p className="font-bold">Trash</p>
                                <p className="text-xs">Drag seat(s) here to remove.</p>
                            </div>
                         </div>
                    </aside>

                    {/* Editor */}
                    <main 
                        className="flex-grow flex flex-col p-4 overflow-auto bg-white dark:bg-slate-900" 
                        onClick={handleBackgroundClick}
                    >
                        {isTemplateCreationMode && (
                            <div className="mb-4">
                                <Input
                                    label="Template Name"
                                    id="template-name"
                                    value={templateName}
                                    onChange={e => { setTemplateName(e.target.value); setNameError(''); }}
                                    placeholder="e.g., Main Auditorium"
                                    required
                                    onClick={e => e.stopPropagation()}
                                />
                                {nameError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{nameError}</p>}
                            </div>
                        )}
                        <div className="flex items-center gap-4 mb-4" onClick={e => e.stopPropagation()}>
                            <Input label="Rows" type="number" value={rows} onChange={e => updateGridSize('rows', parseInt(e.target.value) || 0)} containerClassName="w-24" />
                             <Input label="Columns" type="number" value={cols} onChange={e => updateGridSize('cols', parseInt(e.target.value) || 0)} containerClassName="w-24" />
                             <div className="text-sm text-slate-500 dark:text-slate-400">
                                Total Seats: <span className="font-bold text-slate-700 dark:text-slate-200">{seats.length}</span>
                             </div>
                             <div className="ml-auto text-xs text-slate-400">
                                Tip: Hold <b>Shift</b> to select multiple seats. Use <b>Ctrl+Z</b> to Undo.
                             </div>
                        </div>

                        <div className="flex-grow overflow-auto p-2 bg-slate-100 dark:bg-slate-800/50 rounded-md border dark:border-slate-700">
                             <div
                                className="grid gap-1"
                                style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)`, gridTemplateRows: `repeat(${rows}, 2.5rem)` }}
                            >
                                {Array.from({ length: rows * cols }).map((_, i) => {
                                    const row = Math.floor(i / cols);
                                    const col = i % cols;
                                    const seat = seatsMap.get(`${row}-${col}`);

                                    if (seat) {
                                        const seatDefinition = seat as SeatDefinition;
                                        const seatInfo = SEAT_TYPES.find(st => st.type === seatDefinition.type)!;
                                        const isSelected = selectedSeatIds.has(seatDefinition.id);
                                        
                                        return (
                                            <div
                                                key={seatDefinition.id}
                                                draggable
                                                onDragStart={(e) => handleDragStartGrid(e, seatDefinition)}
                                                onClick={(e) => handleSeatClick(e, seatDefinition.id)}
                                                className={`
                                                    w-10 h-10 rounded cursor-move flex items-center justify-center 
                                                    font-bold text-slate-800 dark:text-slate-900 border 
                                                    ${seatInfo.style}
                                                    ${isSelected 
                                                        ? 'ring-4 ring-offset-2 ring-violet-500 dark:ring-violet-400 z-10' 
                                                        : 'border-slate-400 dark:border-slate-500 hover:brightness-110'}
                                                `}
                                                title={`${seatInfo.label} Seat (R${row + 1}, C${col + 1})`}
                                            >
                                                {isSelected && <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-violet-600 rounded-full border border-white"></div>}
                                                {seatInfo.icon}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={`cell-${row}-${col}`}
                                            onDrop={(e) => handleDrop(e, row, col)}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            className="w-10 h-10 bg-slate-200 dark:bg-slate-700/30 rounded-sm transition-colors"
                                        ></div>
                                    );
                                })}
                            </div>
                        </div>
                    </main>
                </div>

                <footer className="p-4 border-t dark:border-slate-700 text-right">
                    <Button onClick={handleSaveClick}>Save {isTemplateCreationMode ? 'Template' : 'Layout'}</Button>
                </footer>
            </div>
        </div>
    );
};

export default HallLayoutEditor;
