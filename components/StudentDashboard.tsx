import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Exam, Seat } from '../types';
import { getExamsForStudent } from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';
import Button from './common/Button';

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [assignedExams, setAssignedExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const findStudentSeatInExam = useCallback((exam: Exam, registerNumber: string): Seat | null => {
        if (!exam.seatingPlan) return null;
        for (const hallId in exam.seatingPlan) {
            const hallPlan = exam.seatingPlan[hallId];
            for (const row of hallPlan) {
                for (const seat of row) {
                    if (seat.student?.id === registerNumber) {
                        return seat;
                    }
                }
            }
        }
        return null;
    }, []);

    useEffect(() => {
        const fetchStudentExams = async () => {
            if (!user?.registerNumber || !user.adminId) {
                setIsLoading(false);
                return;
            };
            setIsLoading(true);
            const fetchedExams = await getExamsForStudent(user.registerNumber, user.adminId);
            setAssignedExams(fetchedExams);
            setIsLoading(false);
        };

        fetchStudentExams();
    }, [user]);

    const studentSeat = selectedExam && user?.registerNumber ? findStudentSeatInExam(selectedExam, user.registerNumber) : null;
    
    if (isLoading) {
        return (
             <div className="min-h-screen">
                <Header />
                <main className="max-w-4xl mx-auto py-6 px-4 text-center">Loading your exam schedules...</main>
            </div>
        );
    }
    
    if (selectedExam) {
        const hall = studentSeat ? selectedExam.halls.find(h => h.id === studentSeat.hallId) : null;

        return (
            <div className="min-h-screen">
                <Header />
                <main className="max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <Button onClick={() => setSelectedExam(null)} variant="secondary" className="mb-4">
                        &larr; Back to My Schedules
                    </Button>
                    <Card className="mb-8">
                        <h3 className="text-2xl font-bold mb-2">{selectedExam.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">Date: {selectedExam.date}</p>
                        
                        {studentSeat && hall ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center p-4 bg-violet-50 dark:bg-violet-500/10 rounded-lg">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Your Hall</p>
                                    <p className="text-lg font-semibold">{hall?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Your Seat</p>
                                    <p className="text-lg font-semibold">Row {studentSeat.row + 1}, Column {studentSeat.col + 1}</p>
                                </div>
                            </div>
                        ) : (
                             <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <p className="text-slate-600 dark:text-slate-400">Your seat details could not be found for this exam.</p>
                            </div>
                        )}
                    </Card>

                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">Seating Arrangements</h3>
                     <div className="space-y-8">
                        {selectedExam.seatingPlan ? (
                            selectedExam.halls.map(hallInPlan => (
                                <Card key={hallInPlan.id}>
                                    <SeatingPlanVisualizer 
                                        hall={hallInPlan}
                                        plan={selectedExam.seatingPlan}
                                        studentSets={selectedExam.studentSets}
                                        highlightSeat={studentSeat?.hallId === hallInPlan.id ? { row: studentSeat.row, col: studentSeat.col } : undefined}
                                    />
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <p className="text-center text-slate-500 dark:text-slate-400 py-10">
                                    The seating plan for this exam is currently unavailable.
                                </p>
                            </Card>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header />
            <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">My Assigned Exams</h2>
                {assignedExams.length > 0 ? (
                    <div className="space-y-4">
                        {assignedExams.map(exam => (
                            <Card 
                                key={exam.id}
                                className="hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-500 border border-transparent transition-all cursor-pointer"
                                onClick={() => setSelectedExam(exam)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-lg text-violet-700 dark:text-violet-400">{exam.title}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Date: {exam.date}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300`}>
                                            Plan Available
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <div className="text-center py-10">
                            <p className="text-slate-500 dark:text-slate-400">You have no upcoming exams scheduled at this time.</p>
                        </div>
                    </Card>
                )}
            </main>
        </div>
    );
};

export default StudentDashboard;