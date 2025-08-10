
import { Hall, StudentSet, SeatingPlan, Exam, Seat, User, Role } from '../types';

const DB_KEY = 'smartExamPlannerDB';

// Define the shape of our database
interface AppDB {
    users: User[];
    exams: Exam[];
}

// Function to get the initial state of the database
const getInitialDB = (): AppDB => ({
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
                { id: 'set101', subject: '101', studentCount: 50, students: Array.from({ length: 50 }, (_, i) => `101${(i + 1).toString().padStart(3, '0')}`) },
                { id: 'set102', subject: '102', studentCount: 45, students: Array.from({ length: 45 }, (_, i) => `102${(i + 1).toString().padStart(3, '0')}`) },
            ],
            seatingPlan: undefined,
            createdBy: 'teacher01',
        }
    ]
});

// A single in-memory instance of the database.
let db: AppDB;

// Function to save the DB to localStorage.
const saveDB = (newDBState: AppDB) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(newDBState));
        // Also update the in-memory instance for the current session
        db = newDBState;
    } catch (e) {
        console.error("Failed to save DB to localStorage.", e);
    }
};

// Function to load DB from localStorage or initialize it.
const loadDB = (): AppDB => {
    try {
        const storedDB = localStorage.getItem(DB_KEY);
        if (storedDB) {
            console.log("Loading database from localStorage...");
            return JSON.parse(storedDB);
        }
    } catch (e) {
        console.error("Failed to parse DB from localStorage, initializing fresh.", e);
    }
    
    console.log("Initializing new database in localStorage...");
    const initialDB = getInitialDB();
    saveDB(initialDB);
    return initialDB;
};


// Initialize the database when the module is first loaded.
db = loadDB();


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

    saveDB({ ...db, users: [...db.users, newTeacher] });
    return Promise.resolve(newTeacher);
};


export const getTeachers = (): Promise<User[]> => {
    return Promise.resolve(db.users.filter(u => u.role === 'TEACHER'));
};

export const toggleTeacherPermission = (teacherId: string): Promise<User | undefined> => {
    let updatedTeacher: User | undefined = undefined;
    const newUsers = db.users.map(user => {
        if (user.id === teacherId && user.role === 'TEACHER') {
            updatedTeacher = { ...user, permissionGranted: !user.permissionGranted };
            return updatedTeacher;
        }
        return user;
    });
    
    if (updatedTeacher) {
        saveDB({ ...db, users: newUsers });
    }
    return Promise.resolve(updatedTeacher);
};

export const deleteTeacher = (teacherId: string): Promise<boolean> => {
    const initialUserCount = db.users.length;
    
    // Filter out the teacher
    const newUsers = db.users.filter(u => u.id !== teacherId);

    // Also remove all exams created by this teacher (cascading delete)
    const newExams = db.exams.filter(exam => exam.createdBy !== teacherId);
    
    const wasDeleted = newUsers.length < initialUserCount;
    if (wasDeleted) {
        saveDB({ users: newUsers, exams: newExams });
    }
    return Promise.resolve(wasDeleted);
};


// --- Exam Management Functions (Synchronous, returning Promises) ---

export const getAllExams = (): Promise<Exam[]> => {
    return Promise.resolve([...db.exams].sort((a, b) => b.id.localeCompare(a.id)));
};

// Ensures all exams have a seating plan generated if they don't already.
const ensureAllPlansAreGenerated = () => {
    let hasChanged = false;
    const updatedExams = db.exams.map(exam => {
        if (!exam.seatingPlan) {
            const plan = generateSeatingPlan(exam.halls, exam.studentSets);
            if (plan) {
                hasChanged = true;
                return { ...exam, seatingPlan: plan };
            }
        }
        return exam;
    });

    if (hasChanged) {
        saveDB({ ...db, exams: updatedExams });
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
    studentSets: (Omit<StudentSet, 'id' | 'studentCount'>)[];
}, teacherId: string): Promise<Exam> => {
    const newExam: Exam = {
        title: examData.title,
        date: examData.date,
        id: `exam${Date.now()}`,
        createdBy: teacherId,
        halls: examData.halls.map((h, i) => ({ ...h, id: `hall${Date.now()}${i}` })),
        studentSets: examData.studentSets.map((s, i) => ({
             ...s, 
             id: `set${Date.now()}${i}`, 
             studentCount: s.students.length 
        })),
        seatingPlan: undefined,
    };
    saveDB({ ...db, exams: [...db.exams, newExam] });
    return Promise.resolve(newExam);
};

export const updateExam = (updatedExam: Exam): Promise<Exam> => {
    const newExams = db.exams.map(exam => exam.id === updatedExam.id ? updatedExam : exam);
    saveDB({ ...db, exams: newExams });
    return Promise.resolve(updatedExam);
};

export const deleteExam = (examId: string): Promise<boolean> => {
    const initialLength = db.exams.length;
    const newExams = db.exams.filter(e => e.id !== examId);
    const wasDeleted = newExams.length < initialLength;
    if (wasDeleted) {
        saveDB({ ...db, exams: newExams });
    }
    return Promise.resolve(wasDeleted);
};

export const generateSeatingPlan = (halls: Hall[], studentSets: StudentSet[]): SeatingPlan | null => {
    const totalSeats = halls.reduce((acc, hall) => acc + hall.rows * hall.cols, 0);
    const totalStudents = studentSets.reduce((acc, set) => acc + set.students.length, 0);

    if (totalStudents > totalSeats) {
        console.error("Not enough seats for all students.");
        return null;
    }

    // Create a flat list of all available seats
    const allSeats: Seat[] = [];
    halls.forEach(hall => {
        for (let r = 0; r < hall.rows; r++) {
            for (let c = 0; c < hall.cols; c++) {
                allSeats.push({ hallId: hall.id, row: r, col: c });
            }
        }
    });
    
    const assignedSeats: { [key: string]: Seat } = {};
    
    // Create a map of set IDs to their SORTED student lists
    const studentsBySet = studentSets.reduce((acc, set) => {
      // Sort students by register number instead of shuffling
      const sortedStudents = [...set.students].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      acc[set.id] = sortedStudents.map((studentId, i) => ({
        id: studentId, // The actual register number
        setId: set.id,
        setNumber: i + 1, // A sequence number within the set
      }));
      return acc;
    }, {} as Record<string, { id: string; setId: string; setNumber: number }[]>);
    
    const activeStudentSets = studentSets.filter(set => set.students.length > 0);

    const useSpacedLayout = activeStudentSets.length === 1 && (() => {
        const studentsToPlace = studentsBySet[activeStudentSets[0].id];
        const requiredSeatsForSpacing = studentsToPlace.length * 2 - (studentsToPlace.length > 0 ? 1 : 0);
        return totalSeats >= requiredSeatsForSpacing;
    })();

    if (useSpacedLayout) {
        const singleSet = activeStudentSets[0];
        const studentsToPlace = studentsBySet[singleSet.id];
        let seatIndex = 0;
        for (const studentToAssign of studentsToPlace) {
            if (seatIndex < allSeats.length) {
                const seat = allSeats[seatIndex];
                seat.student = studentToAssign;
                assignedSeats[`${seat.hallId}-${seat.row}-${seat.col}`] = seat;
                seatIndex += 2; // Skip the next seat
            }
        }
    } else {
        // Default logic for multiple sets, or for a single set without enough room to be spaced out.
        const studentSetsRotator = [...studentSets].filter(set => set.students.length > 0);
        let setIndex = 0;
        let studentPlacedCount = 0;
        
        // Assign students to seats
        for (let i = 0; i < allSeats.length && studentPlacedCount < totalStudents; i++) {
            const seat = allSeats[i];
            
            const setsWithStudents = studentSets.filter(set => (studentsBySet[set.id]?.length || 0) > 0);

            if (setsWithStudents.length > 0) {
                let assigned = false;
                let attempts = 0;
                // Rotate through sets to ensure students from the same set are separated.
                while(!assigned && attempts < studentSetsRotator.length) {
                    const currentSetId = studentSetsRotator[setIndex % studentSetsRotator.length].id;
                    
                    if (studentsBySet[currentSetId]?.length > 0) {
                        const studentToAssign = studentsBySet[currentSetId].shift()!;
                        seat.student = studentToAssign;
                        assignedSeats[`${seat.hallId}-${seat.row}-${seat.col}`] = seat;
                        studentPlacedCount++;
                        assigned = true;
                    }
                    
                    setIndex++;
                    attempts++;
                }
            }
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
