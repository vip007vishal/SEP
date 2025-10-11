import { Hall, StudentSet, SeatingPlan, Exam, Seat, User, Role, HallTemplate, StudentSetTemplate, SeatDefinition, StudentInfo } from '../types';

// To ensure a true singleton in a hot-reload dev environment, we attach our DB to the window object.
// This prevents HMR from resetting our data on every change.
if (!(window as any).APP_DB) {
    console.log("Initializing In-Memory Database...");
    (window as any).APP_DB = {
        users: [
            { id: 'admin01', name: 'Admin User', email: 'admin@exam.com', role: Role.ADMIN, password: 'password123', institutionName: 'Global Tech University' },
            { id: 'admin02', name: 'Second Admin', email: 'admin2@exam.com', role: Role.ADMIN, password: 'password123', institutionName: 'Innovate Institute' },
            { id: 'teacher01', name: 'Dr. Evelyn Reed', email: 'teacher1@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123', adminId: 'admin01' },
            { id: 'teacher02', name: 'Mr. Samuel Chen', email: 'teacher2@exam.com', role: Role.TEACHER, permissionGranted: false, password: 'password123', adminId: 'admin02' },
            { id: 'teacher03', name: 'Ms. Anya Sharma', email: 'teacher3@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123', adminId: 'admin01' },
            { id: 'teacher04', name: 'Ms. Nitya', email: 'teacher4@exam.com', role: Role.TEACHER, permissionGranted: false, password: 'password123', adminId: 'admin01' },
        ],
        exams: [
            {
                id: 'exam01',
                title: 'Mid-Term Examinations',
                date: '2024-09-15',
                halls: [
                    { id: 'hallA', name: 'Hall A', layout: Array.from({length: 64}, (_, i) => ({id: `s${i}`, row: Math.floor(i/8), col: i % 8, type: 'standard'})), constraints: { type: 'no-limit' } },
                    { id: 'hallB', name: 'Hall B', layout: Array.from({length: 42}, (_, i) => ({id: `s${i}`, row: Math.floor(i/7), col: i % 7, type: 'standard'})), constraints: { type: 'no-limit' } },
                ],
                studentSets: [
                    { id: 'set101', subject: '101', studentCount: 50 },
                    { id: 'set102', subject: '102', studentCount: 45 },
                ],
                seatingPlan: undefined,
                createdBy: 'teacher01',
                adminId: 'admin01'
            }
        ],
        hallTemplates: [
            { id: 'template01', name: 'Main Auditorium', layout: Array.from({length: 100}, (_, i) => ({id: `s${i}`, row: Math.floor(i/10), col: i % 10, type: 'standard'})), createdBy: 'teacher01', adminId: 'admin01' },
            { id: 'template02', name: 'Computer Lab 1', layout: Array.from({length: 40}, (_, i) => ({id: `s${i}`, row: Math.floor(i/8), col: i % 8, type: 'standard'})), createdBy: 'teacher01', adminId: 'admin01' },
        ],
        studentSetTemplates: [
            { id: 'settemplate01', subject: 'Physics 101', studentCount: 50, createdBy: 'teacher01', adminId: 'admin01' },
            { id: 'settemplate02', subject: 'Chemistry Lab', studentCount: 24, createdBy: 'teacher01', adminId: 'admin01' },
            { id: 'settemplate03', subject: 'Calculus III', studentCount: 45, createdBy: 'teacher03', adminId: 'admin01' },
        ]
    };
}

// All functions will now reference this singleton DB.
const db: { users: User[], exams: Exam[], hallTemplates: HallTemplate[], studentSetTemplates: StudentSetTemplate[] } = (window as any).APP_DB;


// --- User Management Functions (Synchronous, returning Promises) ---

export const getInstitutions = (): Promise<{ id: string, name: string }[]> => {
    return Promise.resolve(
        db.users
            .filter(u => u.role === Role.ADMIN && u.institutionName)
            .map(u => ({ id: u.id, name: u.institutionName! }))
            .sort((a, b) => a.name.localeCompare(b.name))
    );
};

export const findUserByEmail = (email: string): Promise<User | undefined> => {
     return Promise.resolve(db.users.find(u => u.email.toLowerCase() === email.toLowerCase()));
};

export const findUserById = (id: string): Promise<User | undefined> => {
    return Promise.resolve(db.users.find(u => u.id === id));
};

export const createAdminUser = (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return Promise.resolve(null); // User already exists
    }

    const newAdmin: User = {
        id: `admin${Date.now()}`,
        name,
        email,
        role: Role.ADMIN,
        password,
        institutionName,
    };

    db.users = [...db.users, newAdmin]; // Immutable update
    console.log('New admin created:', newAdmin);
    console.log('Current users:', db.users);
    return Promise.resolve(newAdmin);
};


export const createTeacherUser = (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return Promise.resolve(null); // User with this email already exists
    }

    const admin = db.users.find(u => u.role === Role.ADMIN && (u.id === adminIdentifier || u.institutionName?.toLowerCase() === adminIdentifier.toLowerCase()));

    if (!admin) {
        console.error(`Admin with identifier "${adminIdentifier}" not found.`);
        return Promise.resolve(null);
    }

    const newTeacher: User = {
        id: `teacher${Date.now()}`,
        name,
        email,
        role: Role.TEACHER,
        permissionGranted: false,
        password,
        adminId: admin.id,
    };

    db.users = [...db.users, newTeacher]; // Immutable update
    return Promise.resolve(newTeacher);
};


export const getTeachersForAdmin = (adminId: string): Promise<User[]> => {
    return Promise.resolve(db.users.filter(u => u.role === 'TEACHER' && u.adminId === adminId));
};

export const grantTeacherPermission = (teacherId: string, adminId: string): Promise<User | undefined> => {
    let updatedTeacher: User | undefined = undefined;
    db.users = db.users.map(user => {
        if (user.id === teacherId && user.role === 'TEACHER' && user.adminId === adminId) {
            updatedTeacher = { ...user, permissionGranted: true };
            return updatedTeacher;
        }
        return user;
    });
    return Promise.resolve(updatedTeacher);
};

export const revokeTeacherPermission = (teacherId: string): Promise<User | undefined> => {
    let updatedTeacher: User | undefined = undefined;
    db.users = db.users.map(user => {
        if (user.id === teacherId && user.role === 'TEACHER') {
            updatedTeacher = { ...user, permissionGranted: false };
            return updatedTeacher;
        }
        return user;
    });
    return Promise.resolve(updatedTeacher);
};

export const deleteTeacher = (teacherId: string, adminId: string): Promise<boolean> => {
    const initialUserCount = db.users.length;
    const teacherToDelete = db.users.find(u => u.id === teacherId);

    // Admin can only delete teachers assigned to their institution.
    if (!teacherToDelete || teacherToDelete.adminId !== adminId) {
        return Promise.resolve(false);
    }
    
    db.users = db.users.filter(u => u.id !== teacherId);

    // Also remove all assets created by this teacher
    db.exams = db.exams.filter(exam => exam.createdBy !== teacherId);
    db.hallTemplates = db.hallTemplates.filter(t => t.createdBy !== teacherId);
    db.studentSetTemplates = db.studentSetTemplates.filter(t => t.createdBy !== teacherId);
    
    return Promise.resolve(db.users.length < initialUserCount);
};


// --- Exam Management Functions (Synchronous, returning Promises) ---

export const getExamsForAdmin = (adminId: string): Promise<Exam[]> => {
    return Promise.resolve([...db.exams].filter(e => e.adminId === adminId).sort((a, b) => b.id.localeCompare(a.id)));
};

// Ensures all exams have a seating plan generated if they don't already.
const ensureAllPlansAreGenerated = () => {
    for (const exam of db.exams) {
        if (!exam.seatingPlan) {
            const result = generateSeatingPlan(exam.halls, exam.studentSets);
            if (result.plan) {
                exam.seatingPlan = result.plan;
            }
        }
    }
};

export const getExamsForStudent = (registerNumber: string, adminId: string): Promise<Exam[]> => {
    ensureAllPlansAreGenerated();

    const studentExams = db.exams.filter(exam => {
        if (exam.adminId !== adminId) {
            return false;
        }
        
        if (!exam.seatingPlan) {
            return false;
        }

        return Object.values(exam.seatingPlan).some(hallPlan => 
            hallPlan.some(row => 
                row.some(seat => seat?.student?.id === registerNumber)
            )
        );
    });

    return Promise.resolve(studentExams.sort((a, b) => b.id.localeCompare(a.id)));
};

export const getExamsForTeacher = (teacherId: string): Promise<Exam[]> => {
    return Promise.resolve(db.exams.filter(e => e.createdBy === teacherId).sort((a,b) => b.id.localeCompare(a.id)));
};

export const createExam = async (examData: {
    title: string;
    date: string;
    halls: Omit<Hall, 'id'>[];
    studentSets: Omit<StudentSet, 'id'>[];
}, teacherId: string): Promise<Exam> => {
    const teacher = await findUserById(teacherId);
    if (!teacher || !teacher.adminId) {
        throw new Error("Cannot create exam: Teacher is not assigned to an admin.");
    }

    const newExam: Exam = {
        title: examData.title,
        date: examData.date,
        id: `exam${Date.now()}`,
        createdBy: teacherId,
        adminId: teacher.adminId,
        halls: examData.halls.map((h, i) => ({ ...h, id: `hall${Date.now()}${i}` })),
        studentSets: examData.studentSets.map((s, i) => ({ ...s, id: `set${Date.now()}${i}` })),
        seatingPlan: undefined,
    };
    db.exams = [...db.exams, newExam];
    return Promise.resolve(newExam);
};

export const updateExam = (updatedExam: Exam): Promise<Exam> => {
    db.exams = db.exams.map(exam => exam.id === updatedExam.id ? updatedExam : exam);
    return Promise.resolve(updatedExam);
};

export const deleteExam = (examId: string, ownerId: string, role: Role): Promise<boolean> => {
    const initialLength = db.exams.length;
    const exam = db.exams.find(e => e.id === examId);
    if (!exam) return Promise.resolve(false);
    
    const isAdminOwner = role === Role.ADMIN && exam.adminId === ownerId;
    const isTeacherOwner = role === Role.TEACHER && exam.createdBy === ownerId;

    if (isAdminOwner || isTeacherOwner) {
        db.exams = db.exams.filter(e => e.id !== examId);
        return Promise.resolve(db.exams.length < initialLength);
    }
    
    return Promise.resolve(false);
};

// --- Seating Plan Generation ---

// Sub-algorithm to place a given list of students into a given list of seats
const assignStudentsToSeats = (seats: Seat[], students: StudentInfo[], studentSets: StudentSet[]): { assignedSeatsMap: Map<string, Seat>; message?: string } => {
    const assignedSeatsMap = new Map<string, Seat>();
    let message: string | undefined = undefined;
    let seatIndex = 0;

    const studentsBySet = studentSets.reduce((acc, set) => {
        acc[set.id] = students.filter(s => s.setId === set.id);
        return acc;
    }, {} as Record<string, StudentInfo[]>);
    
    let activeSetIds = studentSets.map(s => s.id).filter(id => studentsBySet[id] && studentsBySet[id].length > 0);
    let setRotationIndex = 0;

    // Distribute students from different sets in a zig-zag pattern
    while (activeSetIds.length > 1 && seatIndex < seats.length) {
        setRotationIndex = setRotationIndex % activeSetIds.length;
        const currentSetId = activeSetIds[setRotationIndex];
        const studentToAssign = studentsBySet[currentSetId].shift();
        
        if (studentToAssign) {
            const seat = seats[seatIndex];
            seat.student = studentToAssign;
            assignedSeatsMap.set(`${seat.hallId}-${seat.row}-${seat.col}`, seat);
            seatIndex++;
        }
        
        if (studentsBySet[currentSetId].length === 0) {
            activeSetIds.splice(setRotationIndex, 1);
        } else {
            setRotationIndex++;
        }
    }

    // Handle the last remaining set (or if there was only one set to begin with)
    if (activeSetIds.length === 1 && seatIndex < seats.length) {
        const remainingSetId = activeSetIds[0];
        const studentQueue = studentsBySet[remainingSetId];
        
        const remainingSeatsCount = seats.length - seatIndex;
        // If there's enough space, leave one empty seat between students.
        // The space required is (number of students * 2) - 1. E.g., for 3 students: S_S_S needs 5 seats.
        if (remainingSeatsCount >= (studentQueue.length * 2 - 1)) {
            while (studentQueue.length > 0 && seatIndex < seats.length) {
                const seat = seats[seatIndex];
                seat.student = studentQueue.shift();
                assignedSeatsMap.set(`${seat.hallId}-${seat.row}-${seat.col}`, seat);
                seatIndex += 2; // Skip a seat
            }
        } else { // Not enough space for spacing, fill normally
            if (studentSets.length === 1) {
                message = "Not enough hall space for a spaced arrangement (one empty seat per student). Students have been seated normally.";
            } else {
                message = "Not enough hall space for a spaced arrangement for the last set of students. They have been seated normally.";
            }
            while (studentQueue.length > 0 && seatIndex < seats.length) {
                const seat = seats[seatIndex];
                seat.student = studentQueue.shift();
                assignedSeatsMap.set(`${seat.hallId}-${seat.row}-${seat.col}`, seat);
                seatIndex += 1;
            }
        }
    }
    
    return { assignedSeatsMap, message };
};

export const generateSeatingPlan = (halls: Hall[], studentSets: StudentSet[]): { plan: SeatingPlan | null; message?: string } => {
    const finalPlan: SeatingPlan = {};
    const allMessages: string[] = [];

    // 1. Generate student list
    const allStudents: StudentInfo[] = [];
    studentSets.forEach(set => {
        if (set.students && set.students.length > 0) {
            set.students.forEach((studentId, i) => allStudents.push({ id: studentId, setId: set.id, setNumber: i + 1 }));
        } else {
            const subjectPrefix = /^\d+$/.test(set.subject) ? set.subject : '999';
            for (let i = 0; i < set.studentCount; i++) {
                const studentPaddedNumber = (i + 1).toString().padStart(3, '0');
                allStudents.push({ id: `${subjectPrefix}${studentPaddedNumber}`, setId: set.id, setNumber: i + 1 });
            }
        }
    });

    let unseatedStudents = [...allStudents];
    const advancedHalls = halls.filter(h => h.constraints?.type === 'advanced');
    const noLimitHalls = halls.filter(h => h.constraints?.type !== 'advanced');

    // 2. Process "Advanced" halls, allowing overflow
    for (const hall of advancedHalls) {
        const allowedSetIds = new Set(hall.constraints?.allowedSetIds || []);
        const eligibleStudents = unseatedStudents.filter(s => allowedSetIds.has(s.setId));
        
        const sortFunction = hall.constraints?.arrangement === 'vertical'
            ? (a: SeatDefinition, b: SeatDefinition) => a.col - b.col || a.row - b.row
            : (a: SeatDefinition, b: SeatDefinition) => a.row - b.row || a.col - b.col;

        const seatsForHall: Seat[] = hall.layout
            .filter(seatDef => seatDef.type === 'standard' || seatDef.type === 'accessible')
            .sort(sortFunction)
            .map(seatDef => ({ ...seatDef, hallId: hall.id }));

        let studentsToSeat: StudentInfo[] = [];

        if (allowedSetIds.size === 1 && seatsForHall.length > 0) {
            // Special case for single-set advanced halls to enforce spaced seating.
            const maxSpacedCapacity = Math.ceil(seatsForHall.length / 2);
            studentsToSeat = eligibleStudents.slice(0, maxSpacedCapacity);

            if (eligibleStudents.length > studentsToSeat.length) {
                allMessages.push(`Hall "${hall.name}" was filled to capacity with spaced seating. ${eligibleStudents.length - studentsToSeat.length} students from the assigned set will be placed in other available halls.`);
            }
        } else {
            // Default logic: interleave students from all allowed sets up to the hall's capacity.
            if (eligibleStudents.length > 0 && seatsForHall.length > 0) {
                const studentsBySet = eligibleStudents.reduce((acc, student) => {
                    if (!acc[student.setId]) {
                        acc[student.setId] = [];
                    }
                    acc[student.setId].push(student);
                    return acc;
                }, {} as Record<string, StudentInfo[]>);
            
                let activeSetIdsInHall = Object.keys(studentsBySet);
                let setRotationIndex = 0;
        
                while (studentsToSeat.length < seatsForHall.length && activeSetIdsInHall.length > 0) {
                    setRotationIndex = setRotationIndex % activeSetIdsInHall.length;
                    const currentSetId = activeSetIdsInHall[setRotationIndex];
                    const studentToTake = studentsBySet[currentSetId].shift();
        
                    if (studentToTake) {
                        studentsToSeat.push(studentToTake);
                    }
        
                    if (studentsBySet[currentSetId].length === 0) {
                        activeSetIdsInHall.splice(setRotationIndex, 1);
                    } else {
                        setRotationIndex++;
                    }
                }
            }
    
            if (eligibleStudents.length > seatsForHall.length) {
                allMessages.push(`Hall "${hall.name}" was filled to capacity. ${eligibleStudents.length - seatsForHall.length} students from the assigned sets will be placed in other available halls.`);
            }
        }
        
        const studentsToSeatIds = new Set(studentsToSeat.map(s => s.id));
        const setIdsForThisBatch = new Set(studentsToSeat.map(s => s.setId));
        const setsForThisBatch = studentSets.filter(s => setIdsForThisBatch.has(s.id));
        
        const { assignedSeatsMap, message } = assignStudentsToSeats(seatsForHall, studentsToSeat, setsForThisBatch);
        if (message) allMessages.push(message);

        const maxRow = Math.max(-1, ...hall.layout.map(s => s.row));
        const maxCol = Math.max(-1, ...hall.layout.map(s => s.col));
        const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
        hall.layout.forEach(seatDef => {
            const key = `${hall.id}-${seatDef.row}-${seatDef.col}`;
            hallGrid[seatDef.row][seatDef.col] = assignedSeatsMap.get(key) || { ...seatDef, hallId: hall.id };
        });
        finalPlan[hall.id] = hallGrid;
        
        unseatedStudents = unseatedStudents.filter(s => !studentsToSeatIds.has(s.id));
    }

    // 3. Process remaining students in "No Limit" halls
    const remainingStudents = unseatedStudents;
    const noLimitSeats: Seat[] = [];
    noLimitHalls.forEach(hall => {
        const sortFunction = hall.constraints?.arrangement === 'vertical'
            ? (a: SeatDefinition, b: SeatDefinition) => a.col - b.col || a.row - b.row
            : (a: SeatDefinition, b: SeatDefinition) => a.row - b.row || a.col - b.col;
        
        const seatsFromThisHall = hall.layout
            .filter(seatDef => seatDef.type === 'standard' || seatDef.type === 'accessible')
            .sort(sortFunction)
            .map(seatDef => ({ ...seatDef, hallId: hall.id }));
        
        noLimitSeats.push(...seatsFromThisHall);
    });

    if (remainingStudents.length > noLimitSeats.length) {
        const message = noLimitHalls.length > 0
            ? `Not enough seats in the 'No Limit' halls for all remaining students. Required: ${remainingStudents.length}, Available: ${noLimitSeats.length}.`
            : `Not enough space in the 'Advanced' halls. ${remainingStudents.length} students remain unseated, and there are no 'No Limit' halls available.`;
        return { plan: null, message };
    }

    const remainingStudentSetIds = new Set(remainingStudents.map(s => s.setId));
    const remainingStudentSets = studentSets.filter(s => remainingStudentSetIds.has(s.id));
    
    const { assignedSeatsMap, message } = assignStudentsToSeats(noLimitSeats, remainingStudents, remainingStudentSets);
    if (message) allMessages.push(message);

    noLimitHalls.forEach(hall => {
        const maxRow = Math.max(-1, ...hall.layout.map(s => s.row));
        const maxCol = Math.max(-1, ...hall.layout.map(s => s.col));
        const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
        hall.layout.forEach(seatDef => {
            const key = `${hall.id}-${seatDef.row}-${seatDef.col}`;
            hallGrid[seatDef.row][seatDef.col] = assignedSeatsMap.get(key) || { ...seatDef, hallId: hall.id };
        });
        finalPlan[hall.id] = hallGrid;
    });

    return { plan: finalPlan, message: allMessages.join(' \n') };
};


// --- Hall Template Management ---

export const getHallTemplatesForTeacher = (teacherId: string): Promise<HallTemplate[]> => {
    return Promise.resolve(
        db.hallTemplates
            .filter(t => t.createdBy === teacherId)
            .sort((a,b) => a.name.localeCompare(b.name))
    );
};

export const createHallTemplate = async (templateData: { name: string; layout: SeatDefinition[]; }, teacherId: string): Promise<HallTemplate> => {
    const teacher = await findUserById(teacherId);
    if (!teacher || !teacher.adminId) {
        throw new Error("Cannot create template: Teacher is not assigned to an admin.");
    }
    const newTemplate: HallTemplate = {
        ...templateData,
        id: `template${Date.now()}`,
        createdBy: teacherId,
        adminId: teacher.adminId,
    };
    db.hallTemplates = [...db.hallTemplates, newTemplate];
    return Promise.resolve(newTemplate);
};

export const deleteHallTemplate = (templateId: string, teacherId: string): Promise<boolean> => {
    const initialLength = db.hallTemplates.length;
    db.hallTemplates = db.hallTemplates.filter(t => !(t.id === templateId && t.createdBy === teacherId));
    return Promise.resolve(db.hallTemplates.length < initialLength);
};

// --- Student Set Template Management ---

export const getStudentSetTemplatesForTeacher = (teacherId: string): Promise<StudentSetTemplate[]> => {
    return Promise.resolve(
        db.studentSetTemplates
            .filter(t => t.createdBy === teacherId)
            .sort((a,b) => a.subject.localeCompare(b.subject))
    );
};

export const createStudentSetTemplate = async (templateData: { subject: string; studentCount: number; }, teacherId: string): Promise<StudentSetTemplate> => {
     const teacher = await findUserById(teacherId);
    if (!teacher || !teacher.adminId) {
        throw new Error("Cannot create template: Teacher is not assigned to an admin.");
    }
    const newTemplate: StudentSetTemplate = {
        ...templateData,
        id: `settemplate${Date.now()}`,
        createdBy: teacherId,
        adminId: teacher.adminId,
    };
    db.studentSetTemplates = [...db.studentSetTemplates, newTemplate];
    return Promise.resolve(newTemplate);
};

export const deleteStudentSetTemplate = (templateId: string, teacherId: string): Promise<boolean> => {
    const initialLength = db.studentSetTemplates.length;
    db.studentSetTemplates = db.studentSetTemplates.filter(t => !(t.id === templateId && t.createdBy === teacherId));
    return Promise.resolve(db.studentSetTemplates.length < initialLength);
};
