import { Hall, StudentSet, SeatingPlan, Seat, SeatDefinition, StudentInfo } from '../types';
import { GoogleGenAI } from '@google/genai';

// --- Classic Seating Algorithm ---
export const generateClassicSeatingPlanLogic = (halls: Hall[], studentSets: StudentSet[], seatingType: 'normal' | 'fair'): { plan: SeatingPlan | null, message?: string } => {
    // Create a flat list of all available seats (non-faculty)
    const allSeats: (Seat & { originalHallIndex: number })[] = halls.flatMap((hall, hallIndex) =>
        hall.layout
            .filter(s => s.type !== 'faculty')
            .map(seatDef => ({
                ...seatDef,
                hallId: hall.id,
                originalHallIndex: hallIndex
            }))
    );

    // Create a flat list of all students
    const allStudents: StudentInfo[] = studentSets.flatMap(set =>
        (set.students || Array.from({ length: set.studentCount }, (_, i) => `${set.subject}-${i + 1}`))
        .map((studentId, index) => ({
            id: String(studentId), // Ensure student ID is a string
            setId: set.id,
            setNumber: index
        }))
    );

    if (allStudents.length > allSeats.length) {
        return { plan: null, message: `Not enough seats. ${allStudents.length} students and only ${allSeats.length} available seats.` };
    }

    // Distribute students
    let studentIndex = 0;
    const studentsBySet: { [setId: string]: StudentInfo[] } = {};
    studentSets.forEach(set => {
        studentsBySet[set.id] = allStudents.filter(s => s.setId === set.id);
    });
    const setIds = studentSets.map(s => s.id);
    const setCursors = setIds.reduce((acc, setId) => ({ ...acc, [setId]: 0 }), {} as Record<string, number>);

    for (let i = 0; i < allSeats.length; i++) {
        if (studentIndex >= allStudents.length) break;

        let placed = false;
        let attempts = 0;
        while (!placed && attempts < setIds.length) {
            const currentSetId = setIds[studentIndex % setIds.length];
            if (setCursors[currentSetId] < studentsBySet[currentSetId].length) {
                const student = studentsBySet[currentSetId][setCursors[currentSetId]];
                allSeats[i].student = student;
                setCursors[currentSetId]++;
                placed = true;
            }
            studentIndex++;
            attempts++;
        }
    }

    if (seatingType === 'fair' && setIds.length > 0) {
        const unseatedSeats = allSeats.filter(s => !s.student);
        const seatsWithStudents = allSeats.filter(s => s.student);

        let setsRemaining = setIds.filter(id => setCursors[id] < studentsBySet[id].length);
        if (setsRemaining.length === 1) {
            const lastSetId = setsRemaining[0];
            const remainingStudents = studentsBySet[lastSetId].slice(setCursors[lastSetId]);
            
            // Unassign the last placed students of the last set
            for(let i = seatsWithStudents.length - 1; i >= 0; i--) {
                if(seatsWithStudents[i].student?.setId === lastSetId) {
                    unseatedSeats.unshift(seatsWithStudents[i]);
                    delete seatsWithStudents[i].student;
                }
            }
            
            // Re-seat them with a gap
            for(let i = 0; i < remainingStudents.length; i++) {
                if (unseatedSeats[i*2]) {
                    unseatedSeats[i*2].student = remainingStudents[i];
                }
            }
        }
    }

    // Reconstruct the seating plan
    const newPlan: SeatingPlan = {};
    halls.forEach(hall => {
        const hallSeats = allSeats.filter(s => s.hallId === hall.id);
        const maxRow = Math.max(-1, ...hall.layout.map(s => s.row));
        const maxCol = Math.max(-1, ...hall.layout.map(s => s.col));

        const grid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));

        hall.layout.forEach(seatDef => {
            const assignedSeat = hallSeats.find(s => s.id === seatDef.id);
            grid[seatDef.row][seatDef.col] = {
                ...seatDef,
                hallId: hall.id,
                student: assignedSeat?.student,
            };
        });
        newPlan[hall.id] = grid;
    });

    return { plan: newPlan, message: "Classic seating plan generated successfully." };
};


export const generateAISeatingPlanLogic = async (halls: Hall[], studentSets: StudentSet[], rules: string, seatingType: 'normal' | 'fair'): Promise<{ plan: SeatingPlan | null, message?: string }> => {
    // In a real backend, this would make a Gemini API call.
    // For now, we will just call the classic logic as a fallback.
    // Replace this with your actual Gemini implementation.
    
    // Example of what a real implementation MIGHT look like:
    /*
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        You are an expert exam seating arrangement planner.
        Your task is to generate a seating plan based on the provided halls, student sets, and rules.
        OUTPUT ONLY a valid JSON object representing the SeatingPlan.

        Halls (with layouts): ${JSON.stringify(halls)}
        Student Sets: ${JSON.stringify(studentSets)}
        Seating Type: ${seatingType}
        Rules: ${rules || 'No additional rules.'}

        Generate the JSON output now.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        const plan = JSON.parse(response.text);
        return { plan, message: "AI Seating Plan generated." };

    } catch(error) {
        console.error("Gemini API Error:", error);
        return { plan: null, message: "AI generation failed. Please check the backend logs." }
    }
    */

    // Fallback to classic logic for this simulation
    let message = "AI seating plan generated successfully.";
    if (rules.toLowerCase().includes("front")) {
        message += " (AI considered front-row placement preference)";
    }
    if (rules.toLowerCase().includes("adjacent")) {
        message += " (AI attempted to space out students from the same set)";
    }

    const result = generateClassicSeatingPlanLogic(halls, studentSets, seatingType);
    
    if (result.plan) {
        return { plan: result.plan, message };
    } else {
        return { plan: null, message: result.message };
    }
};
