import { GoogleGenAI, Type } from '@google/genai';
import { Hall, StudentSet, SeatingPlan, Exam, Seat, User, Role, HallTemplate, StudentSetTemplate, SeatDefinition, StudentInfo } from '../types';
import { initialDbData } from './mockData';

// --- PRODUCTION-READY ARCHITECTURE ---
// In a real KWS/PostgreSQL application, this entire file would be the API client layer.
// Instead of manipulating a local 'db' object, each function would make a `fetch` call
// to a corresponding endpoint on your backend server.

// We initialize our simulated database from a clean mock data source.
// This is a deep copy, so the state is fresh on every full page load,
// just like fetching from a real API.
let db: typeof initialDbData = JSON.parse(JSON.stringify(initialDbData));

const API_LATENCY = 200; // ms to simulate network delay

// --- User Management Functions (Simulating Backend API calls) ---

export const getInstitutions = async (): Promise<{ id: string, name: string }[]> => {
    console.log('SIMULATING API: GET /api/institutions');
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    const institutions = db.users
        .filter(u => u.role === Role.ADMIN && u.institutionName)
        .map(u => ({ id: u.id, name: u.institutionName! }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    return Promise.resolve(institutions);
};

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
    console.log(`SIMULATING API: GET /api/users?email=${email}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    
    return Promise.resolve(db.users.find(u => u.email.toLowerCase() === email.toLowerCase()));
};

export const findUserById = async (id: string): Promise<User | undefined> => {
    console.log(`SIMULATING API: GET /api/users/${id}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    return Promise.resolve(db.users.find(u => u.id === id));
};

export const createAdminUser = async (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
    console.log('SIMULATING API: POST /api/admins');
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

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

    db.users = [...db.users, newAdmin];
    return Promise.resolve(newAdmin);
};

export const createTeacherUser = async (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
    console.log('SIMULATING API: POST /api/teachers');
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

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

    db.users = [...db.users, newTeacher];
    return Promise.resolve(newTeacher);
};


export const getTeachersForAdmin = async (adminId: string): Promise<User[]> => {
    console.log(`SIMULATING API: GET /api/admins/${adminId}/teachers`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    
    return Promise.resolve(db.users.filter(u => u.role === 'TEACHER' && u.adminId === adminId));
};

export const getUnassignedTeachers = async (): Promise<User[]> => {
    console.log('SIMULATING API: GET /api/teachers?assigned=false');
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    return Promise.resolve(db.users.filter(u => u.role === 'TEACHER' && !u.permissionGranted && !u.adminId));
};


export const grantTeacherPermission = async (teacherId: string, adminId: string): Promise<User | undefined> => {
    console.log(`SIMULATING API: PATCH /api/teachers/${teacherId}/permission`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    let updatedTeacher: User | undefined = undefined;
    db.users = db.users.map(user => {
        if (user.id === teacherId && user.role === 'TEACHER') {
            updatedTeacher = { ...user, permissionGranted: true, adminId: adminId };
            return updatedTeacher;
        }
        return user;
    });
    return Promise.resolve(updatedTeacher);
};

export const revokeTeacherPermission = async (teacherId: string): Promise<User | undefined> => {
    console.log(`SIMULATING API: PATCH /api/teachers/${teacherId}/permission`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

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

export const deleteTeacher = async (teacherId: string, adminId: string): Promise<boolean> => {
    console.log(`SIMULATING API: DELETE /api/teachers/${teacherId}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    const initialUserCount = db.users.length;
    const teacherToDelete = db.users.find(u => u.id === teacherId);

    if (!teacherToDelete || (teacherToDelete.adminId && teacherToDelete.adminId !== adminId)) {
        return Promise.resolve(false);
    }
    
    db.users = db.users.filter(u => u.id !== teacherId);
    db.exams = db.exams.filter(exam => exam.createdBy !== teacherId);
    db.hallTemplates = db.hallTemplates.filter(t => t.createdBy !== teacherId);
    db.studentSetTemplates = db.studentSetTemplates.filter(t => t.createdBy !== teacherId);
    
    return Promise.resolve(db.users.length < initialUserCount);
};


// --- Exam Management Functions ---

export const getExamsForAdmin = async (adminId: string): Promise<Exam[]> => {
    console.log(`SIMULATING API: GET /api/admins/${adminId}/exams`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    return Promise.resolve([...db.exams].filter(e => e.adminId === adminId).sort((a, b) => b.id.localeCompare(a.id)));
};

export const getExamsForStudent = async (registerNumber: string, adminId: string): Promise<Exam[]> => {
    console.log(`SIMULATING API: GET /api/students/${registerNumber}/exams?adminId=${adminId}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    // On a real backend, this logic would be a complex SQL query.
    // For this demonstration, we generate plans on-the-fly if they don't exist.
    for (const exam of db.exams) {
        if (!exam.seatingPlan && exam.adminId === adminId) {
            let result;
            if(exam.editorMode === 'classic') {
                result = await generateClassicSeatingPlan({ halls: exam.halls, studentSets: exam.studentSets, seatingType: exam.seatingType });
            } else {
                result = await generateSeatingPlan({ halls: exam.halls, studentSets: exam.studentSets, rules: exam.aiSeatingRules, seatingType: exam.seatingType });
            }
            if (result.plan) exam.seatingPlan = result.plan;
        }
    }

    const studentExams = db.exams.filter(exam => {
        if (exam.adminId !== adminId || !exam.seatingPlan) return false;
        return Object.values(exam.seatingPlan).some(hallPlan => 
            hallPlan.some(row => 
                row.some(seat => seat?.student?.id === registerNumber)
            )
        );
    });

    return Promise.resolve(studentExams.sort((a, b) => b.id.localeCompare(a.id)));
};

export const getExamsForTeacher = async (teacherId: string): Promise<Exam[]> => {
    console.log(`SIMULATING API: GET /api/teachers/${teacherId}/exams`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    return Promise.resolve(db.exams.filter(e => e.createdBy === teacherId).sort((a,b) => b.id.localeCompare(a.id)));
};

export const createExam = async (examData: {
    title: string;
    date: string;
    halls: Omit<Hall, 'id'>[];
    studentSets: Omit<StudentSet, 'id'>[];
    aiSeatingRules?: string;
    seatingType?: 'normal' | 'fair';
    editorMode?: 'ai' | 'classic';
}, teacherId: string): Promise<Exam> => {
    console.log('SIMULATING API: POST /api/exams');
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    const teacher = await findUserById(teacherId);
    if (!teacher || !teacher.adminId) {
        throw new Error("Cannot create exam: Teacher is not assigned to an admin.");
    }

    const newExam: Exam = {
        title: examData.title,
        date: examData.date,
        aiSeatingRules: examData.aiSeatingRules,
        seatingType: examData.seatingType || 'normal',
        editorMode: examData.editorMode || 'ai',
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

export const updateExam = async (updatedExam: Exam): Promise<Exam> => {
    console.log(`SIMULATING API: PUT /api/exams/${updatedExam.id}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

    db.exams = db.exams.map(exam => exam.id === updatedExam.id ? updatedExam : exam);
    return Promise.resolve(updatedExam);
};

export const deleteExam = async (examId: string, ownerId: string, role: Role): Promise<boolean> => {
    console.log(`SIMULATING API: DELETE /api/exams/${examId}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));

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

const generateStudentList = (studentSets: StudentSet[]): StudentInfo[] => {
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
    return allStudents;
}

// --- Seating Plan Generation ---

export const generateClassicSeatingPlan = async (
    examData: { halls: Hall[], studentSets: StudentSet[], seatingType?: 'normal' | 'fair' }
): Promise<{ plan: SeatingPlan | null; message?: string }> => {
    console.log(`--- RUNNING CLASSIC SEATING ALGORITHM (Mode: ${examData.seatingType || 'normal'}) ---`);
    const { halls, studentSets, seatingType = 'normal' } = examData;

    const allStudents = generateStudentList(studentSets);
    const assignments = new Map<string, StudentInfo>();
    
    const studentQueues: { [setId: string]: StudentInfo[] } = {};
    studentSets.forEach(set => {
        studentQueues[set.id] = allStudents.filter(s => s.setId === set.id);
    });

    if (seatingType === 'fair') {
        let seatSkipCounter = 0;
        let setCycleIndex = 0;

        for (const hall of halls) {
            const seatsInHall = hall.layout
                .filter(seat => seat.type !== 'faculty')
                .sort((a, b) => {
                    const arrangement = hall.constraints?.arrangement || 'horizontal';
                    if (arrangement === 'vertical') {
                        if (a.col !== b.col) return a.col - b.col;
                        return a.row - b.row;
                    }
                    if (a.row !== b.row) return a.row - b.row;
                    return a.col - b.col;
                });

            const allPossibleSetIdsForHall = hall.constraints?.type === 'advanced'
                ? hall.constraints.allowedSetIds!
                : Object.keys(studentQueues);
            
            for (const seat of seatsInHall) {
                // SEAT-BY-SEAT RE-EVALUATION
                const eligibleSetsForThisHall = allPossibleSetIdsForHall.filter(id => studentQueues[id].length > 0);

                if (eligibleSetsForThisHall.length === 0) {
                    break; // No more eligible students for this hall
                }

                if (eligibleSetsForThisHall.length === 1) {
                    // FAIR SPACING MODE
                    if (seatSkipCounter > 0) {
                        seatSkipCounter--;
                        continue; // Skip this seat
                    }

                    const setIdToUse = eligibleSetsForThisHall[0];
                    if (studentQueues[setIdToUse] && studentQueues[setIdToUse].length > 0) {
                        const studentToAssign = studentQueues[setIdToUse].shift()!;
                        assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
                        seatSkipCounter = 1; // Set counter to skip the next seat
                    } else {
                        break; // Should not happen if eligibility check is correct
                    }
                } else {
                    // MULTI-SET ROUND-ROBIN MODE
                    let studentToAssign: StudentInfo | undefined;
                    let triedSets = 0;

                    while (!studentToAssign && triedSets < eligibleSetsForThisHall.length) {
                        const currentSetId = eligibleSetsForThisHall[setCycleIndex % eligibleSetsForThisHall.length];
                        if (studentQueues[currentSetId].length > 0) {
                            studentToAssign = studentQueues[currentSetId].shift();
                        }
                        setCycleIndex++;
                        triedSets++;
                    }

                    if (studentToAssign) {
                        assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
                    } else {
                        break; // No more students to assign from the eligible sets for this hall
                    }
                }
            }
        }
    } else {
        // --- NORMAL SEATING LOGIC ---
        let setCycleIndex = 0;
        for (const hall of halls) {
            const seatsInHall = hall.layout
                .filter(seat => seat.type !== 'faculty')
                .sort((a, b) => {
                    const arrangement = hall.constraints?.arrangement || 'horizontal';
                    if (arrangement === 'vertical') {
                        if (a.col !== b.col) return a.col - b.col;
                        return a.row - b.row;
                    }
                    if (a.row !== b.row) return a.row - b.row;
                    return a.col - b.col;
                });

            const getEligibleSetsForHall = () => {
                const allRemaining = Object.keys(studentQueues).filter(id => studentQueues[id].length > 0);
                const allowedSetIds = hall.constraints?.type === 'advanced' ? hall.constraints.allowedSetIds : null;
                return allowedSetIds ? allRemaining.filter(id => allowedSetIds.includes(id)) : allRemaining;
            };

            for (const seat of seatsInHall) {
                const eligibleSetsForThisHall = getEligibleSetsForHall();
                if (eligibleSetsForThisHall.length === 0) break;

                let studentToAssign: StudentInfo | undefined;
                let triedSets = 0;

                while (!studentToAssign && triedSets < eligibleSetsForThisHall.length) {
                    const currentSetId = eligibleSetsForThisHall[setCycleIndex % eligibleSetsForThisHall.length];
                    if (studentQueues[currentSetId].length > 0) {
                        studentToAssign = studentQueues[currentSetId].shift();
                    }
                    setCycleIndex++;
                    triedSets++;
                }

                if (studentToAssign) {
                    assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
                } else {
                    break;
                }
            }
        }
    }

    const unassignedStudents = Object.values(studentQueues).flat();
    if (unassignedStudents.length > 0) {
        if (seatingType === 'fair') {
            return { plan: null, message: "not enough seats for fair seating" };
        }
        return { plan: null, message: `Failed to assign all students. ${unassignedStudents.length} students remain unplaced, possibly due to lack of seats.` };
    }
    
    // Build the final plan from assignments
    const finalPlan: SeatingPlan = {};
    halls.forEach(hall => {
        const maxRow = Math.max(-1, ...hall.layout.map(s => s.row));
        const maxCol = Math.max(-1, ...hall.layout.map(s => s.col));
        const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
        hall.layout.forEach(seatDef => {
            const student = assignments.get(`${hall.id}-${seatDef.row}-${seatDef.col}`);
            hallGrid[seatDef.row][seatDef.col] = { ...seatDef, hallId: hall.id, ...(student && { student }) };
        });
        finalPlan[hall.id] = hallGrid;
    });

    return { plan: finalPlan, message: "Classic seating plan generated successfully!" };
};


export const generateSeatingPlan = async (
    examData: { halls: Hall[], studentSets: StudentSet[], rules?: string, seatingType?: 'normal' | 'fair' }
): Promise<{ plan: SeatingPlan | null; message?: string }> => {
    console.log('--- RUNNING AI SEATING ALGORITHM ---');
    const { halls, studentSets, rules, seatingType } = examData;

    if (!process.env.API_KEY) {
        return { plan: null, message: "CRITICAL: API_KEY environment variable not set. Cannot contact AI service." };
    }

    const allStudents = generateStudentList(studentSets);
    const availableSeats = halls.flatMap(hall => hall.layout.filter(seat => seat.type !== 'faculty'));
    
    if (seatingType !== 'fair' && allStudents.length > availableSeats.length) {
        return { plan: null, message: `Not enough seats. Required: ${allStudents.length}, Available: ${availableSeats.length}.` };
    }


    const promptData = {
        halls: halls.map(h => ({
            id: h.id,
            name: h.name,
            seats: h.layout.map(s => ({ row: s.row, col: s.col, type: s.type })),
            constraints: h.constraints
        })),
        studentSets: studentSets.map(s => ({
            id: s.id,
            subject: s.subject,
            students: allStudents.filter(stu => stu.setId === s.id).map(stu => stu.id)
        }))
    };

    let seatingRules = '';
    if (seatingType === 'fair') {
        seatingRules = `
            **CRITICAL: DYNAMIC HALL-CENTRIC FAIR SEATING ALGORITHM**
            Your primary goal is to create a fair seating arrangement. This requires a dynamic, hall-centric approach.

            **Execution Flow:**
            Process halls in the order they are provided. For each seat in a hall:
            1.  **Re-evaluate:** Determine the list of student sets that are eligible for the CURRENT hall (based on hall constraints) and still have students left to be seated.
            2.  **Decide Strategy:**
                *   If the list from step 1 contains only ONE set, you MUST use **"Fair Spacing" mode** for this seat. This means you place one student, and then you MUST leave the next available seat EMPTY. The pattern must be [STUDENT], [EMPTY], [STUDENT], [EMPTY].
                *   If the list from step 1 contains MULTIPLE sets, you MUST use **"Normal Placement" mode**. This means you use a round-robin approach to pick a student from the eligible sets and you MUST fill the current seat without leaving a gap.
            3.  **Repeat:** Move to the next seat and go back to step 1. This re-evaluation for every seat is the most important rule.

            **Example Scenario:**
            - Hall A is eligible for Set X and Set Y.
            - You start filling Hall A using "Normal Placement": [X], [Y], [X], [Y]...
            - At some point, you place the LAST student of Set X.
            - For the VERY NEXT seat in Hall A, you re-evaluate. Now, only Set Y is eligible for Hall A.
            - You MUST immediately switch to "Fair Spacing" mode for the rest of Hall A: [Y], [EMPTY], [Y], [EMPTY]...

            If you cannot place every single student while following these rules (especially the spacing rule when required), you MUST return a plan with fewer students than the total, which will signal an error.
        `;
    } else { // normal seating
        seatingRules = `
            **CRITICAL: NORMAL SEATING ALGORITHM**
            You must fill every available seat without leaving any empty spaces between students. When placing students while multiple sets still have unseated students, assign them by cycling through each student set (e.g., Set A, Set B, Set C, then back to Set A...). This ensures students from the same set are not adjacent.
        `;
    }

    const prompt = `
        You are a highly intelligent exam seating arrangement assistant. Your task is to assign every student to a unique seat based on the provided data and rules.

        **JSON Data:**
        Here is the complete data for the exam, including all halls, seats, and students.
        \`\`\`json
        ${JSON.stringify(promptData, null, 2)}
        \`\`\`
        
        **Seating Rules (Apply these based on the exam's seating type):**
        ${seatingRules}

        **Additional User-Provided Rules:**
        ${rules || 'No additional rules.'}


        **Your Task:**
        Assign EVERY student from the JSON data to a unique 'standard' or 'accessible' seat. Do not use 'faculty' seats.
        You MUST return your response as a single, valid JSON object. The JSON object must conform to the provided schema. The root of the object must be a key named "assignments", which is an array of assignment objects.
        Do not output any text or explanation before or after the JSON object.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                assignments: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            studentId: { type: Type.STRING },
                            hallId: { type: Type.STRING },
                            row: { type: Type.INTEGER },
                            col: { type: Type.INTEGER },
                        },
                        required: ["studentId", "hallId", "row", "col"]
                    }
                }
            },
            required: ["assignments"]
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });
        
        const resultJson = JSON.parse(response.text);
        const assignments: { studentId: string, hallId: string, row: number, col: number }[] = resultJson.assignments;
        
        if (assignments.length !== allStudents.length) {
             if (seatingType === 'fair') {
                return { plan: null, message: "not enough seats for fair seating" };
             }
             return { plan: null, message: `AI Error: The AI did not return an assignment for every student. Expected ${allStudents.length}, got ${assignments.length}. This may be because a constraint made a full assignment impossible.` };
        }

        const assignmentsMap = new Map<string, StudentInfo>();
        assignments.forEach(a => {
            const studentInfo = allStudents.find(s => s.id === a.studentId);
            if(studentInfo) {
                assignmentsMap.set(`${a.hallId}-${a.row}-${a.col}`, studentInfo);
            }
        });

        const finalPlan: SeatingPlan = {};
        halls.forEach(hall => {
            const maxRow = Math.max(-1, ...hall.layout.map(s => s.row));
            const maxCol = Math.max(-1, ...hall.layout.map(s => s.col));
            const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
            hall.layout.forEach(seatDef => {
                const student = assignmentsMap.get(`${hall.id}-${seatDef.row}-${seatDef.col}`);
                hallGrid[seatDef.row][seatDef.col] = { ...seatDef, hallId: hall.id, ...(student && { student }) };
            });
            finalPlan[hall.id] = hallGrid;
        });

        return { plan: finalPlan, message: 'AI-powered seating plan generated successfully!' };

    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        return { plan: null, message: `An error occurred while communicating with the AI service: ${error.message}` };
    }
};


// --- Template Management Functions ---

export const getHallTemplatesForTeacher = async (teacherId: string): Promise<HallTemplate[]> => {
    console.log(`SIMULATING API: GET /api/teachers/${teacherId}/hall-templates`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.hallTemplates.filter(t => t.createdBy === teacherId).sort((a,b) => a.name.localeCompare(b.name)));
};

export const createHallTemplate = async (templateData: { name: string; layout: SeatDefinition[]; }, teacherId: string): Promise<HallTemplate> => {
    console.log('SIMULATING API: POST /api/hall-templates');
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const teacher = await findUserById(teacherId);
    if (!teacher || !teacher.adminId) throw new Error("Teacher not assigned to an admin.");
    const newTemplate: HallTemplate = { ...templateData, id: `template${Date.now()}`, createdBy: teacherId, adminId: teacher.adminId };
    db.hallTemplates = [...db.hallTemplates, newTemplate];
    return Promise.resolve(newTemplate);
};

export const deleteHallTemplate = async (templateId: string, teacherId: string): Promise<boolean> => {
    console.log(`SIMULATING API: DELETE /api/hall-templates/${templateId}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const initialLength = db.hallTemplates.length;
    db.hallTemplates = db.hallTemplates.filter(t => !(t.id === templateId && t.createdBy === teacherId));
    return Promise.resolve(db.hallTemplates.length < initialLength);
};

export const getStudentSetTemplatesForTeacher = async (teacherId: string): Promise<StudentSetTemplate[]> => {
    console.log(`SIMULATING API: GET /api/teachers/${teacherId}/student-set-templates`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.studentSetTemplates.filter(t => t.createdBy === teacherId).sort((a,b) => a.subject.localeCompare(b.subject)));
};

export const createStudentSetTemplate = async (templateData: { subject: string; studentCount: number; }, teacherId: string): Promise<StudentSetTemplate> => {
    console.log('SIMULATING API: POST /api/student-set-templates');
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const teacher = await findUserById(teacherId);
    if (!teacher || !teacher.adminId) throw new Error("Teacher not assigned to an admin.");
    const newTemplate: StudentSetTemplate = { ...templateData, id: `settemplate${Date.now()}`, createdBy: teacherId, adminId: teacher.adminId };
    db.studentSetTemplates = [...db.studentSetTemplates, newTemplate];
    return Promise.resolve(newTemplate);
};

export const deleteStudentSetTemplate = async (templateId: string, teacherId: string): Promise<boolean> => {
    console.log(`SIMULATING API: DELETE /api/student-set-templates/${templateId}`);
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const initialLength = db.studentSetTemplates.length;
    db.studentSetTemplates = db.studentSetTemplates.filter(t => !(t.id === templateId && t.createdBy === teacherId));
    return Promise.resolve(db.studentSetTemplates.length < initialLength);
};
