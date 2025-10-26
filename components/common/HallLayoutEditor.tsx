import React, { useState, useEffect, useCallback } from 'react';
import { SeatDefinition, SeatType } from '../../types';
import Button from './Button';
import Input from './Input';

interface HallLayoutEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { layout: SeatDefinition[], name?: string }) => void;
    initialLayout?: SeatDefinition[];
    isTemplateCreationMode?: boolean;
}

const SEAT_TYPES: { type: SeatType, label: string, style: string, icon: React.ReactNode }[] = [
    { type: 'standard', label: 'Standard', style: 'bg-slate-300 dark:bg-slate-600', icon: null },
    { type: 'accessible', label: 'Accessible', style: 'bg-blue-300 dark:bg-blue-600', icon: <span title="Accessible Seating">♿</span> },
    { type: 'faculty', label: 'Faculty', style: 'bg-yellow-300 dark:bg-yellow-600', icon: <span title="Faculty/Invigilator Seat">👁️</span> },
];

const HallLayoutEditor: React.FC<HallLayoutEditorProps> = ({ isOpen, onClose, onSave, initialLayout, isTemplateCreationMode }) => {
    const [seats, setSeats] = useState<SeatDefinition[]>(initialLayout || []);
    const [rows, setRows] = useState(10);
    const [cols, setCols] = useState(10);
    const [draggedSeat, setDraggedSeat] = useState<{ type: SeatType } | { id: string } | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [nameError, setNameError] = useState('');

    useEffect(() => {
        if (initialLayout && initialLayout.length > 0) {
            setSeats(initialLayout);
            const maxRow = Math.max(9, ...initialLayout.map(s => s.row));
            const maxCol = Math.max(9, ...initialLayout.map(s => s.col));
            setRows(maxRow + 1);
            setCols(maxCol + 1);
        } else {
            setSeats([]);
            setRows(10);
            setCols(10);
        }
        setTemplateName('');
        setNameError('');
    }, [initialLayout, isOpen]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
        e.preventDefault();
        
        // Prevent dropping on an existing seat
        if (seats.some(s => s.row === row && s.col === col)) {
            return;
        }

        if (draggedSeat) {
            if ('type' in draggedSeat) { // New seat from palette
                const newSeat: SeatDefinition = {
                    id: `seat-${Date.now()}-${Math.random()}`,
                    row,
                    col,
                    type: draggedSeat.type
                };
                setSeats(prev => [...prev, newSeat]);
            } else if ('id' in draggedSeat) { // Moving an existing seat
                setSeats(prev => prev.map(s => s.id === draggedSeat.id ? { ...s, row, col } : s));
            }
        }
        setDraggedSeat(null);
        e.currentTarget.classList.remove('bg-violet-200', 'dark:bg-violet-700/50');
    };

    const handleDragStartPalette = (e: React.DragEvent<HTMLDivElement>, type: SeatType) => {
        setDraggedSeat({ type });
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragStartGrid = (e: React.DragEvent<HTMLDivElement>, seat: SeatDefinition) => {
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
            setSeats(prev => prev.filter(s => s.id !== draggedSeat.id));
        }
        setDraggedSeat(null);
        e.currentTarget.classList.remove('bg-red-500/50');
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
        if (type === 'rows') {
            setSeats(prev => prev.filter(s => s.row < newSize));
            setRows(newSize);
        } else {
            setSeats(prev => prev.filter(s => s.col < newSize));
            setCols(newSize);
        }
    };

    if (!isOpen) return null;

    const seatsMap = new Map(seats.map(s => [`${s.row}-${s.col}`, s]));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isTemplateCreationMode ? 'Create Hall Template' : 'Hall Layout Editor'}</h2>
                    <Button onClick={onClose} variant="secondary">Close</Button>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    {/* Palette */}
                    <aside className="w-64 p-4 border-r dark:border-slate-700 flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/50">
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
                                <p className="text-xs">Drag a seat here to remove it.</p>
                            </div>
                         </div>
                    </aside>

                    {/* Editor */}
                    <main className="flex-grow flex flex-col p-4 overflow-auto">
                        {isTemplateCreationMode && (
                            <div className="mb-4">
                                <Input
                                    label="Template Name"
                                    id="template-name"
                                    value={templateName}
                                    onChange={e => { setTemplateName(e.target.value); setNameError(''); }}
                                    placeholder="e.g., Main Auditorium"
                                    required
                                />
                                {nameError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{nameError}</p>}
                            </div>
                        )}
                        <div className="flex items-center gap-4 mb-4">
                            <Input label="Rows" type="number" value={rows} onChange={e => updateGridSize('rows', parseInt(e.target.value) || 0)} containerClassName="w-24" />
                             <Input label="Columns" type="number" value={cols} onChange={e => updateGridSize('cols', parseInt(e.target.value) || 0)} containerClassName="w-24" />
                             <div className="text-sm text-slate-500 dark:text-slate-400">
                                Total Seats: <span className="font-bold text-slate-700 dark:text-slate-200">{seats.length}</span>
                             </div>
                        </div>

                        <div className="flex-grow overflow-auto p-2 bg-slate-100 dark:bg-slate-900 rounded-md">
                             <div
                                className="grid gap-1"
                                style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)`, gridTemplateRows: `repeat(${rows}, 2.5rem)` }}
                            >
                                {Array.from({ length: rows * cols }).map((_, i) => {
                                    const row = Math.floor(i / cols);
                                    const col = i % cols;
                                    const seat = seatsMap.get(`${row}-${col}`);

                                    if (seat) {
                                        // FIX: Explicitly cast `seat` to `SeatDefinition`.
                                        // For some reason, TypeScript is inferring `seat` as `unknown` here.
                                        // This explicit cast resolves the type errors on `seat.type`, `seat.id`,
                                        // and when passing `seat` to `handleDragStartGrid`.
                                        const seatDefinition = seat as SeatDefinition;
                                        const seatInfo = SEAT_TYPES.find(st => st.type === seatDefinition.type)!;
                                        return (
                                            <div
                                                key={seatDefinition.id}
                                                draggable
                                                onDragStart={(e) => handleDragStartGrid(e, seatDefinition)}
                                                className={`w-10 h-10 rounded cursor-move flex items-center justify-center font-bold text-slate-800 dark:text-slate-900 border border-slate-400 dark:border-slate-500 ${seatInfo.style}`}
                                                title={`${seatInfo.label} Seat (R${row + 1}, C${col + 1})`}
                                            >
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
                                            className="w-10 h-10 bg-slate-200 dark:bg-slate-700/50 rounded-sm transition-colors"
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