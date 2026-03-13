import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Exam, Seat } from '../types';
import { getExamsForStudent } from '../services/examService';
import Header from './common/Header';
import Card from './common/Card';
import SeatingPlanVisualizer from './common/SeatingPlanVisualizer';
import Button from './common/Button';
import Input from './common/Input';

const SearchIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const UserFocusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);

const CalendarIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ListIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
);

const TicketIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
);


const CalendarView: React.FC<{
    exams: Exam[];
    onSelectExam: (exam: Exam) => void;
}> = ({ exams, onSelectExam }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const examsByDate = useMemo(() => {
        return exams.reduce((acc, exam) => {
            const date = exam.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(exam);
            return acc;
        }, {} as Record<string, Exam[]>);
    }, [exams]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const leadingEmptyDays = Array.from({ length: firstDay });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    };
    
    return (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-lg">
             <div className="flex justify-between items-center mb-6">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{monthName} {year}</h3>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border dark:border-slate-700">
                {dayNames.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
                        {day}
                    </div>
                ))}
                {leadingEmptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="bg-white dark:bg-slate-800 h-24 sm:h-32"></div>
                ))}
                {days.map(day => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const examsForDay = examsByDate[dateStr] || [];
                    const isCurrentDay = isToday(day);

                    return (
                        <div key={day} className={`bg-white dark:bg-slate-800 h-24 sm:h-32 p-1 sm:p-2 flex flex-col relative transition-colors hover:bg-slate-50 dark:hover:bg-slate-750`}>
                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${isCurrentDay ? 'bg-violet-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300'}`}>
                                {day}
                            </span>
                            <div className="flex-grow space-y-1 overflow-y-auto custom-scrollbar">
                                {examsForDay.map(exam => (
                                    <button
                                        key={exam.id}
                                        onClick={() => onSelectExam(exam)}
                                        className="w-full text-left p-1.5 rounded text-[10px] sm:text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-500/30 truncate transition-colors border-l-2 border-violet-500"
                                        title={exam.title}
                                    >
                                        {exam.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const ExamListView: React.FC<{
    exams: Exam[];
    onSelectExam: (exam: Exam) => void;
}> = ({ exams, onSelectExam }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => {
                const dateObj = new Date(exam.date);
                const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                const day = dateObj.getDate();
                
                return (
                    <div 
                        key={exam.id} 
                        className="group bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-lg border border-slate-200 dark:border-slate-700 p-0 overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full"
                        onClick={() => onSelectExam(exam)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectExam(exam)}
                    >
                        <div className="p-5 flex items-start gap-4 flex-grow">
                            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg w-16 h-16 border border-slate-200 dark:border-slate-600">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{month}</span>
                                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{day}</span>
                            </div>
                            <div className="flex-grow min-w-0">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{exam.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                    {exam.halls.length} Hall{exam.halls.length !== 1 ? 's' : ''} • {exam.studentSets.length} Subject{exam.studentSets.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/30 px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">View details</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-violet-500 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [assignedExams, setAssignedExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
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
            
            try {
                setIsLoading(true);
                const fetchedExams = await getExamsForStudent(user.registerNumber, user.adminId);
                setAssignedExams(fetchedExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            } catch (error) {
                console.error("Error fetching exams:", error);
            } finally {
                setIsLoading(false);
            }
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
                <main className="max-w-4xl mx-auto py-12 px-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400">Loading your exam schedules...</p>
                </main>
            </div>
        );
    }
    
    if (selectedExam) {
        const currentHall = activelyHighlightedSeat ? selectedExam.halls.find(h => h.id === activelyHighlightedSeat.hallId) : null;

        return (
            <div className="min-h-screen">
                <Header />
                <main className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <Button onClick={() => setSelectedExam(null)} variant="secondary" className="!px-3 !py-1 text-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                            Back to My Schedules
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Details & Search */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-t-4 border-t-violet-500">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{selectedExam.title}</h2>
                                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5 text-violet-500" />
                                    {new Date(selectedExam.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </Card>

                            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Find a Seat</h3>
                                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                                    <Input
                                        containerClassName="flex-grow"
                                        id="search-register-number"
                                        placeholder="Enter Reg. Number"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        className="!bg-white dark:!bg-slate-900"
                                    />
                                    <Button type="submit" className="!px-3">
                                        <SearchIcon className="h-5 w-5"/>
                                    </Button>
                                </form>
                                {searchError && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30 mb-4">{searchError}</p>}

                                {activelyHighlightedSeat && currentHall ? (
                                    <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        {/* Ticket Stub Design */}
                                        <div className="bg-violet-600 text-white p-3 flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase tracking-wider">Exam Ticket</span>
                                            <TicketIcon className="h-5 w-5 opacity-80" />
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-end border-b border-dashed border-slate-200 dark:border-slate-700 pb-3">
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Student ID</p>
                                                    <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100">{activelyHighlightedSeat.student?.id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Subject</p>
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{activelyHighlightedSeat.student?.setId}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-1">
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Hall</p>
                                                    <p className="text-base font-bold text-violet-600 dark:text-violet-400">{currentHall?.name || 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Seat Position</p>
                                                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">R{activelyHighlightedSeat.row + 1} - C{activelyHighlightedSeat.col + 1}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : !searchError && (
                                    <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm italic">
                                        Enter a register number above to locate a specific seat.
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Right Column: Visualizer */}
                        <div className="lg:col-span-2 space-y-8">
                            {selectedExam.seatingPlan ? (
                                selectedExam.halls.map(hallInPlan => (
                                    <div key={hallInPlan.id} ref={el => { if(el) hallCardRefs.current[hallInPlan.id] = el; }}>
                                        <Card className="relative overflow-hidden">
                                            {activelyHighlightedSeat?.hallId === hallInPlan.id && (
                                                <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-md z-10">
                                                    Your Hall
                                                </div>
                                            )}
                                            <SeatingPlanVisualizer 
                                                hall={hallInPlan}
                                                plan={selectedExam.seatingPlan!}
                                                studentSets={selectedExam.studentSets}
                                                highlightSeat={activelyHighlightedSeat?.hallId === hallInPlan.id ? { row: activelyHighlightedSeat.row, col: activelyHighlightedSeat.col } : undefined}
                                            />
                                        </Card>
                                    </div>
                                ))
                            ) : (
                                <Card>
                                    <div className="text-center py-16">
                                        <div className="inline-block p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                            <CalendarIcon className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Seating Plan Unavailable</h3>
                                        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                            The administrator hasn't generated or published the seating arrangement for this exam yet. Please check back later.
                                        </p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>

                    {loggedInStudentSeat && (
                        <button
                            onClick={handleFindMySeat}
                            className="fixed bottom-8 right-8 bg-violet-600 text-white p-4 rounded-full shadow-xl hover:bg-violet-700 transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-violet-300 z-50 flex items-center gap-2 group"
                            aria-label="Find my seat"
                            title="Find my seat"
                        >
                            <UserFocusIcon className="h-6 w-6" />
                            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium text-sm">My Seat</span>
                        </button>
                    )}
                </main>
            </div>
        );
    }

    // Default Dashboard View
    const nextExam = assignedExams.length > 0 ? assignedExams[0] : null;

    return (
        <div className="min-h-screen">
            <Header />
            <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        Hello, <span className="text-violet-600 dark:text-violet-400">{user?.name || 'Student'}</span>!
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Here is your examination schedule.</p>
                </div>

                {/* Next Up Highlight */}
                {nextExam && (
                    <div className="mb-10 p-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="text-violet-200 text-sm font-semibold uppercase tracking-wider mb-1">Next Up</div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-1">{nextExam.title}</h2>
                                <p className="text-violet-100 flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5" />
                                    {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <Button 
                                onClick={() => setSelectedExam(nextExam)}
                                className="bg-white text-violet-700 hover:bg-violet-50 border-none shadow-none font-bold px-6 py-3"
                            >
                                View Details & Seat
                            </Button>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex flex-col sm:flex-row justify-between items-end mb-6 gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6 text-slate-400" /> All Exams
                    </h2>
                    {assignedExams.length > 0 && (
                        <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                                <CalendarIcon className="h-4 w-4" /> Calendar
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                                <ListIcon className="h-4 w-4" /> List
                            </button>
                        </div>
                    )}
                </div>

                {assignedExams.length > 0 ? (
                    <div className="animate-fade-in-up">
                        {viewMode === 'calendar' ? (
                             <CalendarView exams={assignedExams} onSelectExam={setSelectedExam} />
                        ) : (
                            <ExamListView exams={assignedExams} onSelectExam={setSelectedExam} />
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <div className="inline-block p-4 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                            <CalendarIcon className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No Exams Scheduled</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                            You don't have any upcoming exams assigned to your register number yet. Relax!
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default StudentDashboard;