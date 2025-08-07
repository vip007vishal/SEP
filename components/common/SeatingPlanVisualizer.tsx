import React from 'react';
import { Hall, SeatingPlan, StudentSet } from '../../types';
import { SET_COLORS } from '../../constants';

interface SeatingPlanVisualizerProps {
    hall: Hall;
    plan: SeatingPlan;
    studentSets: StudentSet[];
    highlightSeat?: { row: number, col: number };
}

const SeatingPlanVisualizer: React.FC<SeatingPlanVisualizerProps> = ({ hall, plan, studentSets, highlightSeat }) => {
    const hallPlan = plan[hall.id];

    if (!hallPlan) {
        return <p>Seating plan for {hall.name} not available.</p>;
    }

    const setColorsMap = studentSets.reduce((acc, set, index) => {
        acc[set.id] = SET_COLORS[index % SET_COLORS.length];
        return acc;
    }, {} as Record<string, string>);

    // Each seat is 3.5rem wide, gap is 0.75rem (gap-3). Total width per column is 4.25rem.
    const minGridWidth = hall.cols * 4.25;

    return (
        <div>
            <h3 className="text-xl font-bold mb-4 text-center text-slate-700">{hall.name}</h3>
            <div className="overflow-x-auto bg-slate-100 p-4 rounded-lg">
                <div 
                    className="grid gap-3"
                    style={{ 
                        gridTemplateColumns: `repeat(${hall.cols}, minmax(3.5rem, 1fr))`,
                        minWidth: `${minGridWidth}rem`
                    }}
                >
                    {hallPlan.flat().map((seat, index) => {
                        const bgColor = seat.student ? setColorsMap[seat.student.setId] : 'bg-slate-200';
                        const isHighlighted = highlightSeat && seat.row === highlightSeat.row && seat.col === highlightSeat.col;
                        const border = isHighlighted ? 'ring-4 ring-offset-2 ring-violet-500' : 'border border-slate-300';
                        const studentSet = seat.student ? studentSets.find(s => s.id === seat.student.setId) : null;
                        
                        let seatContent: React.ReactNode = null;
                        if(seat.student && studentSet) {
                            const paddedSetNumber = seat.student.setNumber.toString().padStart(3, '0');
                            seatContent = `${studentSet.subject}${paddedSetNumber}`;
                        }

                        return (
                            <div
                                key={index}
                                title={seat.student && studentSet ? `Seat: R${seat.row+1}C${seat.col+1} - Student ID: ${seatContent}` : `Empty: R${seat.row+1}C${seat.col+1}`}
                                className={`w-full aspect-square rounded-lg flex items-center justify-center text-center text-sm font-bold text-slate-700 transition-all break-words ${bgColor} ${border}`}
                            >
                                {seatContent}
                            </div>
                        );
                    })}
                </div>
            </div>
             <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {studentSets.map((set, index) => (
                    <div key={set.id} className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-2 ${SET_COLORS[index % SET_COLORS.length]}`}></div>
                        <span className="text-sm text-slate-600">Set Code: {set.subject}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeatingPlanVisualizer;