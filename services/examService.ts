
import { MOCK_EXAMS, MOCK_USERS } from '../constants';
import { Hall, StudentSet, SeatingPlan, Exam, Seat, User } from '../types';

// In-memory store for demo purposes
let exams: Exam[] = [...MOCK_EXAMS];
let users: User[] = [...MOCK_USERS];


export const getTeachers = (): Promise<User[]> => {
    return new Promise(resolve => setTimeout(() => resolve(users.filter(u => u.role === 'TEACHER')), 200));
};

export const toggleTeacherPermission = (teacherId: string): Promise<User | undefined> => {
     return new Promise(resolve => setTimeout(() => {
        const teacher = users.find(u => u.id === teacherId && u.role === 'TEACHER');
        if (teacher) {
            teacher.permissionGranted = !teacher.permissionGranted;
        }
        resolve(teacher);
    }, 200));
};

export const getAllExams = (): Promise<Exam[]> => {
    return new Promise(resolve => setTimeout(() => resolve([...exams].sort((a, b) => b.id.localeCompare(a.id))), 200));
};

// Ensures all exams have a seating plan generated if they don't already.
const ensureAllPlansAreGenerated = () => {
    for (const exam of exams) {
        if (!exam.seatingPlan) {
            const plan = generateSeatingPlan(exam.halls, exam.studentSets);
            if (plan) {
                exam.seatingPlan = plan;
            }
        }
    }
};

export const getExamsForStudent = (registerNumber: string): Promise<Exam[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            ensureAllPlansAreGenerated();

            const studentExams = exams.filter(exam => {
                if (!exam.seatingPlan) {
                    return false;
                }

                // Check if any seat in any hall is assigned to the student
                return Object.values(exam.seatingPlan).some(hallPlan => 
                    hallPlan.some(row => 
                        row.some(seat => seat.student?.id === registerNumber)
                    )
                );
            });

            resolve(studentExams.sort((a, b) => b.id.localeCompare(a.id)));
        }, 200);
    });
};

export const getExamsForTeacher = (teacherId: string): Promise<Exam[]> => {
    return new Promise(resolve => setTimeout(() => resolve(exams.filter(e => e.createdBy === teacherId).sort((a,b) => b.id.localeCompare(a.id))), 200));
};

export const createExam = (examData: {
    title: string;
    date: string;
    halls: Omit<Hall, 'id'>[];
    studentSets: Omit<StudentSet, 'id'>[];
}, teacherId: string): Promise<Exam> => {
    const newExam: Exam = {
        title: examData.title,
        date: examData.date,
        id: `exam${Date.now()}`,
        createdBy: teacherId,
        halls: examData.halls.map((h, i) => ({ ...h, id: `hall${Date.now()}${i}` })),
        studentSets: examData.studentSets.map((s, i) => ({ ...s, id: `set${Date.now()}${i}` })),
        seatingPlan: undefined,
    };
    exams.push(newExam);
    return new Promise(resolve => setTimeout(() => resolve(newExam), 200));
};

export const updateExam = (updatedExam: Exam): Promise<Exam> => {
    const index = exams.findIndex(e => e.id === updatedExam.id);
    if(index !== -1) {
        exams[index] = updatedExam;
    }
    return new Promise(resolve => setTimeout(() => resolve(updatedExam), 200));
};

export const deleteExam = (examId: string): Promise<boolean> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const index = exams.findIndex(e => e.id === examId);
            if (index !== -1) {
                exams.splice(index, 1);
                resolve(true); // Deletion successful
            } else {
                resolve(false); // Exam not found
            }
        }, 200);
    });
};

export const generateSeatingPlan = (halls: Hall[], studentSets: StudentSet[]): SeatingPlan | null => {
    const totalSeats = halls.reduce((acc, hall) => acc + hall.rows * hall.cols, 0);
    const totalStudents = studentSets.reduce((acc, set) => acc + set.studentCount, 0);

    if (totalStudents > totalSeats) {
        console.error("Not enough seats for all students.");
        return null;
    }

    // Create a flat list of all students with their set ID and a number within the set
    const allStudents: { id: string; setId: string; setNumber: number }[] = [];
    studentSets.forEach(set => {
        // Use subject code for a more logical student ID. Default to 999 if not a number.
        const subjectPrefix = /^\d+$/.test(set.subject) ? set.subject : '999';
        for (let i = 0; i < set.studentCount; i++) {
            const studentPaddedNumber = (i + 1).toString().padStart(3, '0');
            allStudents.push({ 
                id: `${subjectPrefix}${studentPaddedNumber}`, // e.g., 101001, 102045
                setId: set.id,
                setNumber: i + 1,
            });
        }
    });

    // Create a flat list of all available seats
    const allSeats: Seat[] = [];
    halls.forEach(hall => {
        for (let r = 0; r < hall.rows; r++) {
            for (let c = 0; c < hall.cols; c++) {
                allSeats.push({ hallId: hall.id, row: r, col: c });
            }
        }
    });
    
    // Zig-zag assignment to separate sets
    let studentIndex = 0;
    const studentSetsRotator = [...studentSets];
    
    const assignedSeats: { [key: string]: Seat } = {};
    const studentsBySet = studentSets.reduce((acc, set) => {
      acc[set.id] = allStudents.filter(s => s.setId === set.id);
      return acc;
    }, {} as Record<string, { id: string; setId: string; setNumber: number }[]>);

    let setIndex = 0;
    for (let i = 0; i < allSeats.length && studentIndex < totalStudents; i++) {
        const seat = allSeats[i];
        
        let assigned = false;
        let attempts = 0;
        while(!assigned && attempts < studentSets.length) {
            const currentSetId = studentSetsRotator[setIndex % studentSetsRotator.length].id;
            if(studentsBySet[currentSetId]?.length > 0) {
                const studentToAssign = studentsBySet[currentSetId].pop()!;
                seat.student = studentToAssign;
                assignedSeats[`${seat.hallId}-${seat.row}-${seat.col}`] = seat;
                studentIndex++;
                assigned = true;
            }
            setIndex++;
            attempts++;
        }
    }
    

    // Reconstruct the seating plan into a 2D array for each hall
    const finalPlan: SeatingPlan = {};
    halls.forEach(hall => {
        finalPlan[hall.id] = Array.from({ length: hall.rows }, () => Array(hall.cols).fill(null));
        for (let r = 0; r < hall.rows; r++) {
            for (let c = 0; c < hall.cols; c++) {
                const assignedSeat = assignedSeats[`${hall.id}-${r}-${c}`];
                finalPlan[hall.id][r][c] = assignedSeat || { hallId: hall.id, row: r, col: c };
            }
        }
    });

    return finalPlan;
};
