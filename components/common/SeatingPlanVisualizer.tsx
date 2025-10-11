import React from 'react';
import { Hall, SeatingPlan, StudentSet, Seat, SeatType } from '../../types';
import { SET_COLORS } from '../../constants';

interface SeatingPlanVisualizerProps {
    hall: Hall;
    plan: SeatingPlan;
    studentSets: StudentSet[];
    highlightSeat?: { row: number, col: number };
}

const getSeatTypeStyles = (type: SeatType): { icon: React.ReactNode, baseBg: string } => {
    switch (type) {
        case 'accessible':
            return { icon: <span title="Accessible Seating">♿</span>, baseBg: 'bg-blue-200 dark:bg-blue-600' };
        case 'faculty':
            return { icon: <span title="Faculty/Invigilator Seat">👁️</span>, baseBg: 'bg-yellow-200 dark:bg-yellow-600' };
        case 'standard':
        default:
            return { icon: null, baseBg: 'bg-slate-200 dark:bg-slate-600' };
    }
};

const SeatingPlanVisualizer: React.FC<SeatingPlanVisualizerProps> = ({ hall, plan, studentSets, highlightSeat }) => {
    const hallPlan = plan[hall.id];

    if (!hallPlan) {
        return <p>Seating plan for {hall.name} not available.</p>;
    }

    const setColorsMap = studentSets.reduce((acc, set, index) => {
        acc[set.id] = SET_COLORS[index % SET_COLORS.length];
        return acc;
    }, {} as Record<string, string>);

    const maxCols = hallPlan.reduce((max, row) => Math.max(max, row.length), 0);

    return (
        <div>
            <h3 className="text-xl font-bold mb-4 text-center text-slate-700 dark:text-slate-300">{hall.name}</h3>
            <div className="mb-4 text-center py-2 px-4 bg-slate-200 dark:bg-slate-700 rounded-md text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-inner">
                Front of Hall
            </div>
            <div className="overflow-x-auto bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div 
                    className="grid gap-3"
                    style={{ 
                        gridTemplateColumns: `repeat(${maxCols}, minmax(3.5rem, 1fr))`,
                    }}
                >
                    {hallPlan.map((row, rowIndex) => (
                        row.map((seat, colIndex) => {
                            if (!seat) {
                                // This represents an empty grid cell in a non-rectangular layout
                                return <div key={`empty-${rowIndex}-${colIndex}`} className="aspect-square"></div>;
                            }

                            const seatStyles = getSeatTypeStyles(seat.type);
                            const bgColor = seat.student ? setColorsMap[seat.student.setId] : seatStyles.baseBg;
                            const isHighlighted = highlightSeat && seat.row === highlightSeat.row && seat.col === highlightSeat.col;
                            const border = isHighlighted ? 'ring-4 ring-offset-2 ring-violet-500 dark:ring-violet-400' : 'border border-slate-300 dark:border-slate-500';
                            
                            let seatContent: React.ReactNode = seatStyles.icon;
                            if(seat.student) {
                                seatContent = seat.student.id;
                            }

                            return (
                                <div
                                    key={`${seat.id}-${rowIndex}-${colIndex}`}
                                    title={seat.student ? `Seat: R${seat.row+1}C${seat.col+1} - Student ID: ${seat.student.id}` : `${seat.type} Seat: R${seat.row+1}C${seat.col+1}`}
                                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-center text-xs font-bold text-slate-700 dark:text-slate-900 transition-all break-words p-1 ${bgColor} ${border}`}
                                >
                                    {seatContent}
                                </div>
                            );
                        }).concat(Array.from({ length: maxCols - row.length }).map((_, i) => (
                            // Pad the end of shorter rows to maintain grid structure
                           <div key={`pad-${rowIndex}-${row.length + i}`} className="aspect-square"></div>
                        )))
                    ))}
                </div>
            </div>
             <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {studentSets.map((set, index) => (
                    <div key={set.id} className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-2 ${SET_COLORS[index % SET_COLORS.length]}`}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Set Code: {set.subject}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeatingPlanVisualizer;