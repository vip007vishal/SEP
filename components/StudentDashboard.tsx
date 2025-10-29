import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Exam, Seat } from '../types';
import { getExamsForStudent } from '../services/api';
import Header from './common/Header';
import Card from './common/Card';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';
import Button from './common/Button';
import Input from './common/Input';

const SearchIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const UserFocusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);


const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [assignedExams, setAssignedExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hallCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // New state for search functionality
    const [searchValue, setSearchValue] = useState('');
    const [searchError, setSearchError] = useState('');
    const [activelyHighlightedSeat, setActivelyHighlightedSeat] = useState<Seat | null>(null);

    const findStudentSeatInExam = useCallback((exam: Exam, registerNumber: string): Seat | null => {
        if (!exam.seatingPlan) return null;
        for (const hallId in exam.seatingPlan) {
            const hallPlan = exam.seatingPlan[hallId];
            for (const row of hallPlan) {
                for (const seat of row) {
                    if (seat?.student?.id === registerNumber) {
                        return seat;
                    }
                }
            }
        }
        return null;
    }, []);

    const loggedInStudentSeat = selectedExam && user?.registerNumber ? findStudentSeatInExam(selectedExam, user.registerNumber) : null;

    // Centralized, precise scroll function using manual calculation
    const scrollToSeat = useCallback((seat: Seat | null) => {
        if (!seat) return;

        const timer = setTimeout(() => {
            const hallCardElement = hallCardRefs.current[seat.hallId];
            const headerElement = document.querySelector('header');
            
            if (hallCardElement && headerElement) {
                const headerHeight = headerElement.offsetHeight;
                const elementRect = hallCardElement.getBoundingClientRect();
                const absoluteElementTop = elementRect.top + window.scrollY;
                
                // Calculate the position to scroll to so the element is centered in the VISIBLE viewport (below header)
                const visibleViewportHeight = window.innerHeight - headerHeight;
                const desiredScrollTop = absoluteElementTop - (visibleViewportHeight / 2) + (hallCardElement.offsetHeight / 2) - headerHeight;

                window.scrollTo({
                    top: desiredScrollTop,
                    behavior: 'smooth'
                });
            } else if (hallCardElement) {
                // Fallback if header isn't found for some reason
                 hallCardElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }, 150);

        return () => clearTimeout(timer);
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

    // Effect to set the initial highlighted seat and trigger the initial scroll
    useEffect(() => {
        if (selectedExam && loggedInStudentSeat) {
            setActivelyHighlightedSeat(loggedInStudentSeat);
            setSearchValue(user?.registerNumber || '');
            scrollToSeat(loggedInStudentSeat);
        } else {
            setActivelyHighlightedSeat(null);
            setSearchValue('');
        }
        setSearchError(''); // Reset error when changing exam
    }, [selectedExam, loggedInStudentSeat, user?.registerNumber, scrollToSeat]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExam || !searchValue.trim()) return;
        const foundSeat = findStudentSeatInExam(selectedExam, searchValue.trim());
        if (foundSeat) {
            setActivelyHighlightedSeat(foundSeat);
            setSearchError('');
            scrollToSeat(foundSeat);
        } else {
            setActivelyHighlightedSeat(null);
            setSearchError(`Register Number "${searchValue.trim()}" not found in this exam.`);
        }
    };

    const handleFindMySeat = () => {
        if (loggedInStudentSeat) {
            setActivelyHighlightedSeat(loggedInStudentSeat);
            setSearchValue(user?.registerNumber || '');
            setSearchError('');
            scrollToSeat(loggedInStudentSeat);
        }
    };

    if (isLoading) {
        return (
             <div className="min-h-screen">
                <Header />
                <main className="max-w-4xl mx-auto py-8 px-4 text-center">Loading your exam schedules...</main>
            </div>
        );
    }
    
    if (selectedExam) {
        const currentHall = activelyHighlightedSeat ? selectedExam.halls.find(h => h.id === activelyHighlightedSeat.hallId) : null;

        return (
            <div className="min-h-screen">
                <Header />
                <main className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <Button onClick={() => setSelectedExam(null)} variant="secondary" className="mb-4">
                        &larr; Back to My Schedules
                    </Button>
                    <Card className="mb-8">
                        <h3 className="text-2xl font-bold mb-2">{selectedExam.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">Date: {selectedExam.date}</p>
                        
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-4">
                            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    containerClassName="flex-grow"
                                    id="search-register-number"
                                    placeholder="Enter any Register Number to find a seat"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                                <Button type="submit" className="flex items-center justify-center gap-2">
                                    <SearchIcon className="h-5 w-5"/> Search
                                </Button>
                            </form>
                            {searchError && <p className="text-sm text-center text-red-600 dark:text-red-400">{searchError}</p>}

                            {activelyHighlightedSeat && currentHall ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center p-4 bg-violet-50 dark:bg-violet-500/10 rounded-lg border dark:border-violet-500/20">
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Register Number</p>
                                        <p className="text-lg font-semibold">{activelyHighlightedSeat.student?.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Hall</p>
                                        <p className="text-lg font-semibold">{currentHall?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Seat</p>
                                        <p className="text-lg font-semibold">Row {activelyHighlightedSeat.row + 1}, Column {activelyHighlightedSeat.col + 1}</p>
                                    </div>
                                </div>
                            ) : !searchError && (
                                <div className="text-center p-2">
                                     <p className="text-slate-600 dark:text-slate-400 text-sm">Your seat is highlighted below. Use the search bar to find anyone's seat.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">Seating Arrangements</h3>
                     <div className="space-y-8">
                        {selectedExam.seatingPlan ? (
                            selectedExam.halls.map(hallInPlan => (
                                <Card key={hallInPlan.id} ref={el => { if(el) hallCardRefs.current[hallInPlan.id] = el; }}>
                                    <SeatingPlanVisualizer 
                                        hall={hallInPlan}
                                        plan={selectedExam.seatingPlan}
                                        studentSets={selectedExam.studentSets}
                                        highlightSeat={activelyHighlightedSeat?.hallId === hallInPlan.id ? { row: activelyHighlightedSeat.row, col: activelyHighlightedSeat.col } : undefined}
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

                    {loggedInStudentSeat && (
                        <button
                            onClick={handleFindMySeat}
                            className="fixed bottom-6 right-6 bg-violet-600 text-white p-4 rounded-full shadow-lg hover:bg-violet-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 z-10"
                            aria-label="Find my seat"
                            title="Find my seat"
                        >
                            <UserFocusIcon />
                        </button>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header />
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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