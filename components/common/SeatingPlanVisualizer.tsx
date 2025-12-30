
import React from 'react';
import { Hall, SeatingPlan, StudentSet, Seat, SeatType } from '../../types';
import { SET_COLORS } from '../../constants';

interface SeatingPlanVisualizerProps {
    hall: Hall;
    plan: SeatingPlan;
    studentSets: StudentSet[];
    highlightSeat?: { row: number, col: number };
    // Add seatDimensions to allow dynamic scaling based on content
    seatDimensions?: { width: number; height: number; fontSize: number };
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

const SeatingPlanVisualizer: React.FC<SeatingPlanVisualizerProps> = ({ hall, plan, studentSets, highlightSeat, seatDimensions }) => {
    const hallPlan = plan[hall.id];

    if (!hallPlan) {
        return <p>Seating plan for {hall.name} not available.</p>;
    }

    const setColorsMap = studentSets.reduce((acc, set, index) => {
        acc[set.id] = SET_COLORS[index % SET_COLORS.length];
        return acc;
    }, {} as Record<string, string>);

    const maxCols = hallPlan.reduce((max, row) => Math.max(max, row.length), 0);
    const direction = hall.frontDirection || 'top';

    // Styles for the flex container that holds Label + Grid
    const containerClasses = {
        top: 'flex-col',
        bottom: 'flex-col-reverse',
        left: 'flex-row',
        right: 'flex-row-reverse'
    };

    // Styles for the label box itself
    const labelBoxClasses = (direction === 'left' || direction === 'right') 
        ? 'w-10 flex-shrink-0 flex items-center justify-center py-4' 
        : 'w-full py-2';

    // Margin helpers
    const labelMargins = {
        top: 'mb-4',
        bottom: 'mt-4',
        left: 'mr-4',
        right: 'ml-4'
    };

    const isVerticalText = direction === 'left' || direction === 'right';

    // Default dimensions if none provided
    const dimensions = seatDimensions || { width: 80, height: 60, fontSize: 14 };

    return (
        <div className="w-full">
            <h3 className="text-xl font-bold mb-6 text-center text-slate-700 dark:text-slate-300">{hall.name}</h3>
            
            <div className={`flex ${containerClasses[direction]} items-stretch justify-center w-full`}>
                
                {/* Front of Hall Label */}
                <div className={`bg-slate-200 dark:bg-slate-700 rounded-md text-sm font-bold text-slate-600 dark:text-slate-300 shadow-inner flex items-center justify-center ${labelBoxClasses} ${labelMargins[direction]}`}>
                    <span 
                        style={{ 
                            writingMode: isVerticalText ? 'vertical-rl' : 'horizontal-tb',
                            transform: isVerticalText ? 'rotate(180deg)' : 'none'
                        }}
                    >
                        FRONT OF HALL
                    </span>
                </div>

                {/* Grid Container */}
                <div className="overflow-x-auto bg-slate-100 dark:bg-slate-800 p-6 rounded-xl flex-grow border border-slate-200 dark:border-slate-700">
                    <div 
                        className="grid gap-4"
                        style={{ 
                            // Use dynamic width from dimensions
                            gridTemplateColumns: `repeat(${maxCols}, minmax(${dimensions.width / 16}rem, 1fr))`,
                        }}
                    >
                        {hallPlan.map((row, rowIndex) => (
                            row.map((seat, colIndex) => {
                                if (!seat) {
                                    // Empty grid cell
                                    return <div key={`empty-${rowIndex}-${colIndex}`} style={{ height: `${dimensions.height / 16}rem` }}></div>;
                                }

                                const seatStyles = getSeatTypeStyles(seat.type);
                                const bgColor = seat.student ? setColorsMap[seat.student.setId] : seatStyles.baseBg;
                                const isHighlighted = highlightSeat && seat.row === highlightSeat.row && seat.col === highlightSeat.col;
                                const border = isHighlighted ? 'ring-4 ring-offset-2 ring-violet-500 dark:ring-violet-400 z-10' : 'border border-slate-300 dark:border-slate-500 shadow-sm';
                                
                                let seatContent: React.ReactNode = seatStyles.icon;
                                if(seat.student) {
                                    seatContent = seat.student.id;
                                }

                                return (
                                    <div
                                        key={`${seat.id}-${rowIndex}-${colIndex}`}
                                        title={seat.student ? `Seat: R${seat.row+1}C${seat.col+1} - Student ID: ${seat.student.id}` : `${seat.type} Seat: R${seat.row+1}C${seat.col+1}`}
                                        // Use dynamic height and font-size
                                        style={{ height: `${dimensions.height / 16}rem`, fontSize: `${dimensions.fontSize / 16}rem` }}
                                        className={`w-full rounded-lg flex items-center justify-center text-center font-bold text-slate-800 dark:text-slate-900 transition-all break-all px-2 py-1 ${bgColor} ${border}`}
                                    >
                                        {seatContent}
                                    </div>
                                );
                            }).concat(Array.from({ length: maxCols - row.length }).map((_, i) => (
                            <div key={`pad-${rowIndex}-${row.length + i}`} style={{ height: `${dimensions.height / 16}rem` }}></div>
                            )))
                        ))}
                    </div>
                </div>
            </div>

             <div className="mt-6 flex flex-wrap gap-4 justify-center">
                {studentSets.map((set, index) => (
                    <div key={set.id} className="flex items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className={`w-3 h-3 rounded-full mr-2 ${SET_COLORS[index % SET_COLORS.length]}`}></div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Set: {set.subject}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeatingPlanVisualizer;
