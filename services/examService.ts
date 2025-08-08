
import { Hall, StudentSet, SeatingPlan, Exam, Seat, User, Role } from '../types';

// To ensure a true singleton in a hot-reload dev environment, we attach our DB to the window object.
// This prevents HMR from resetting our data on every change.
if (!(window as any).APP_DB) {
    console.log("Initializing In-Memory Database...");
    (window as any).APP_DB = {
        users: [
            { id: 'admin01', name: 'Admin User', email: 'admin@exam.com', role: Role.ADMIN, password: 'password123' },
            { id: 'teacher01', name: 'Dr. Evelyn Reed', email: 'teacher1@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123' },
            { id: 'teacher02', name: 'Mr. Samuel Chen', email: 'teacher2@exam.com', role: Role.TEACHER, permissionGranted: false, password: 'password123' },
            { id: 'teacher03', name: 'Ms. Anya Sharma', email: 'teacher3@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123' },
            { id: 'teacher04', name: 'Ms. Nitya', email: 'teacher4@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123' },
        ],
        exams: [
            {
                id: 'exam01',
                title: 'Mid-Term Examinations',
                date: '2024-09-15',
                halls: [
                    { id: 'hallA', name: 'Hall A', rows: 8, cols: 8 },
                    { id: 'hallB', name: 'Hall B', rows: 6, cols: 7 },
                ],
                studentSets: [
                    { id: 'set101', subject: '101', studentCount: 50 },
                    { id: 'set102', subject: '102', studentCount: 45 },
                ],
                seatingPlan: undefined,
                createdBy: 'teacher01',
            }
        ]
    };
}

// All functions will now reference this singleton DB.
const db: { users: User[], exams: Exam[] } = (window as any).APP_DB;


// --- User Management Functions (Synchronous, returning Promises) ---

export const findUserByEmail = (email: string): Promise<User | undefined> => {
     return Promise.resolve(db.users.find(u => u.email.toLowerCase() === email.toLowerCase()));
};

export const findUserById = (id: string): Promise<User | undefined> => {
    return Promise.resolve(db.users.find(u => u.id === id));
};


export const createTeacherUser = (name: string, email: string, password: string): Promise<User | null> => {
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return Promise.resolve(null); // User already exists
    }

    const newTeacher: User = {
        id: `teacher${Date.now()}`,
        name,
        email,
        role: Role.TEACHER,
        permissionGranted: false,
        password,
    };

    db.users = [...db.users, newTeacher]; // Immutable update
    return Promise.resolve(newTeacher);
};


export const getTeachers = (): Promise<User[]> => {
    return Promise.resolve(db.users.filter(u => u.role === 'TEACHER'));
};

export const toggleTeacherPermission = (teacherId: string): Promise<User | undefined> => {
    let updatedTeacher: User | undefined = undefined;
    db.users = db.users.map(user => {
        if (user.id === teacherId && user.role === 'TEACHER') {
            updatedTeacher = { ...user, permissionGranted: !user.permissionGranted };
            return updatedTeacher;
        }
        return user;
    });
    return Promise.resolve(updatedTeacher);
};

export const deleteTeacher = (teacherId: string): Promise<boolean> => {
    const initialUserCount = db.users.length;
    
    // Filter out the teacher
    db.users = db.users.filter(u => u.id !== teacherId);

    // Also remove all exams created by this teacher (cascading delete)
    db.exams = db.exams.filter(exam => exam.createdBy !== teacherId);
    
    const wasDeleted = db.users.length < initialUserCount;
    return Promise.resolve(wasDeleted);
};


// --- Exam Management Functions (Synchronous, returning Promises) ---

export const getAllExams = (): Promise<Exam[]> => {
    return Promise.resolve([...db.exams].sort((a, b) => b.id.localeCompare(a.id)));
};

// Ensures all exams have a seating plan generated if they don't already.
const ensureAllPlansAreGenerated = () => {
    // This function can mutate exam objects in the 'exams' array directly
    // since it's a private utility.
    for (const exam of db.exams) {
        if (!exam.seatingPlan) {
            const plan = generateSeatingPlan(exam.halls, exam.studentSets);
            if (plan) {
                exam.seatingPlan = plan;
            }
        }
    }
};

export const getExamsForStudent = (registerNumber: string): Promise<Exam[]> => {
    ensureAllPlansAreGenerated();

    const studentExams = db.exams.filter(exam => {
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

    return Promise.resolve(studentExams.sort((a, b) => b.id.localeCompare(a.id)));
};

export const getExamsForTeacher = (teacherId: string): Promise<Exam[]> => {
    return Promise.resolve(db.exams.filter(e => e.createdBy === teacherId).sort((a,b) => b.id.localeCompare(a.id)));
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
    db.exams = [...db.exams, newExam]; // Immutable update
    return Promise.resolve(newExam);
};

export const updateExam = (updatedExam: Exam): Promise<Exam> => {
    db.exams = db.exams.map(exam => exam.id === updatedExam.id ? updatedExam : exam); // Immutable update
    return Promise.resolve(updatedExam);
};

export const deleteExam = (examId: string): Promise<boolean> => {
    const initialLength = db.exams.length;
    db.exams = db.exams.filter(e => e.id !== examId); // Immutable update
    return Promise.resolve(db.exams.length < initialLength);
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
