import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import Logo from './common/Logo';
import { Role } from '../types';
import { getInstitutions } from '../services/examService';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registerNumber, setRegisterNumber] = useState('');
    const [loginType, setLoginType] = useState<'admin' | 'teacher' | 'student'>('admin');
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [registerName, setRegisterName] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [registerInstitution, setRegisterInstitution] = useState('');
    const [adminIdentifier, setAdminIdentifier] = useState('');
    
    const [institutions, setInstitutions] = useState<{ id: string, name: string }[]>([]);
    const [selectedInstitution, setSelectedInstitution] = useState('');

    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginStudent, registerTeacher, registerAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInst = async () => {
            try {
                const data = await getInstitutions();
                setInstitutions(data);
            } catch (error) {
                console.error("Failed to fetch institutions:", error);
                setError("Could not load list of institutions.");
            }
        };
        fetchInst();
    }, []);

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        // This is a simulation, in a real app, this would trigger an OTP send
        setTimeout(() => {
            setIsLoading(false);
            setStep(2);
        }, 500);
    };
    
    const handleStaffVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        
        // Simulating OTP check
        if(otp !== '123456') {
             setError('Invalid OTP. Please use 123456 for this demo.');
             setIsLoading(false);
             return;
        }

        const user = await login(email, password);
        setIsLoading(false);
        if (user) {
            if (loginType === 'admin') {
                if (user.role === Role.ADMIN) {
                    navigate('/admin');
                } else {
                    setError('This account does not have admin privileges.');
                    setStep(1);
                }
            } else if (loginType === 'teacher') {
                if (user.role === Role.TEACHER) {
                    navigate('/teacher');
                } else {
                    setError('This account is not a teacher account.');
                    setStep(1);
                }
            }
        } else {
            setError('Invalid credentials. Please try again.');
            setStep(1);
        }
    };

    const handleAdminRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        if (!registerName || !email || !registerPassword || !registerInstitution) {
            setError('Please fill in all fields.');
            setIsLoading(false);
            return;
        }

        if (registerPassword !== confirmPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (registerPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            setIsLoading(false);
            return;
        }

        const newUser = await registerAdmin(registerName, email, registerPassword, registerInstitution);
        setIsLoading(false);
        if (newUser) {
            setSuccessMessage('Admin account created successfully. You can now log in.');
            setAuthMode('login');
            setRegisterName('');
            setEmail('');
            setRegisterPassword('');
            setConfirmPassword('');
            setRegisterInstitution('');
        } else {
            setError('An account with this email already exists.');
        }
    };

    const handleTeacherRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        if (!registerName || !email || !registerPassword || !adminIdentifier) {
            setError('Please fill in all fields.');
            setIsLoading(false);
            return;
        }

        if (registerPassword !== confirmPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (registerPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            setIsLoading(false);
            return;
        }

        const newUser = await registerTeacher(registerName, email, registerPassword, adminIdentifier);
        setIsLoading(false);
        if (newUser) {
            setSuccessMessage('Account created. An admin must grant permission before you can log in.');
            setAuthMode('login');
            setRegisterName('');
            setEmail('');
            setRegisterPassword('');
            setConfirmPassword('');
            setAdminIdentifier('');
        } else {
            setError('Registration failed. Please check your details. The admin ID or institution may not exist, or an account with this email already exists.');
        }
    };
    
    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        if (!selectedInstitution) {
            setError('Please select your institution.');
            setIsLoading(false);
            return;
        }
        const user = await loginStudent(registerNumber, selectedInstitution);
        setIsLoading(false);
        if (user) {
            navigate('/student');
        } else {
            setError('Please enter a valid, numeric Register Number.');
        }
    };

    const handleLoginTypeChange = (type: 'admin' | 'teacher' | 'student') => {
        setLoginType(type);
        setError('');
        setSuccessMessage('');
        setStep(1);
        setEmail('');
        setPassword('');
        setOtp('');
        setRegisterNumber('');
        setAuthMode('login');
        setRegisterName('');
        setRegisterPassword('');
        setConfirmPassword('');
        setRegisterInstitution('');
        setAdminIdentifier('');
        setSelectedInstitution('');
    }

    const renderAdminForm = () => {
        if (authMode === 'register') {
            return (
                <form onSubmit={handleAdminRegister}>
                    <h2 className="text-2xl font-semibold text-center mb-6">Create Admin Account</h2>
                    <div className="space-y-4">
                        <Input label="Full Name" id="registerName" type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required placeholder="e.g., Jane Doe" />
                        <Input label="Email Address" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g., admin@exam.com" />
                        <Input label="Institution / Organization Name" id="registerInstitution" type="text" value={registerInstitution} onChange={(e) => setRegisterInstitution(e.target.value)} required placeholder="e.g., Global Tech University" />
                        <Input label="Password" id="registerPassword" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required placeholder="Minimum 6 characters" />
                        <Input label="Confirm Password" id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Re-enter your password" />
                    </div>
                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </Button>
                    <Button variant="secondary" onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); }} className="w-full mt-2">
                        Back to Login
                    </Button>
                </form>
            );
        }

        // Login form (with 2-step)
        return (
             <>
                {step === 1 ? (
                    <form onSubmit={handleStaffSubmit}>
                        <h2 className="text-2xl font-semibold text-center mb-6">Admin Login</h2>
                        <div className="space-y-4">
                            <Input label="Email Address" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g., admin@exam.com" />
                            <Input label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password"/>
                        </div>
                        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                            {isLoading ? 'Loading...' : 'Continue'}
                        </Button>
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                            Need an admin account?{' '}
                            <button type="button" onClick={() => { setAuthMode('register'); setError(''); }} className="font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 focus:outline-none">
                                Create one
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleStaffVerify}>
                         <h2 className="text-2xl font-semibold text-center mb-2">2-Step Verification</h2>
                         <p className="text-center text-slate-500 dark:text-slate-400 mb-6">An OTP has been "sent" to your email. <br/>(Hint: use <strong>123456</strong>)</p>
                        <div className="space-y-4">
                             <Input label="One-Time Password" id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="Enter 6-digit code"/>
                        </div>
                        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify & Login'}
                        </Button>
                         <Button variant="secondary" onClick={() => { setStep(1); setError(''); }} className="w-full mt-2">
                            Back
                        </Button>
                    </form>
                )}
            </>
        )
    };


    const renderTeacherForm = () => {
        if (authMode === 'register') {
            return (
                <form onSubmit={handleTeacherRegister}>
                    <h2 className="text-2xl font-semibold text-center mb-6">Create Teacher Account</h2>
                    <div className="space-y-4">
                        <Input label="Full Name" id="teacherName" type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required placeholder="e.g., Dr. Evelyn Reed" />
                        <Input label="Email Address" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g., teacher@exam.com" />
                        <Input label="Admin ID or Institution Name" id="adminIdentifier" type="text" value={adminIdentifier} onChange={(e) => setAdminIdentifier(e.target.value)} required placeholder="Enter your institution's name or admin ID" />
                        <Input label="Password" id="teacherPassword" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required placeholder="Minimum 6 characters" />
                        <Input label="Confirm Password" id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Re-enter your password" />
                         <p className="text-xs text-slate-500 dark:text-slate-400 text-center">An administrator will need to grant you access after creation.</p>
                    </div>
                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </Button>
                    <Button variant="secondary" onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); }} className="w-full mt-2">
                        Back to Login
                    </Button>
                </form>
            );
        }

        // Login form (with 2-step)
        return (
             <>
                {step === 1 ? (
                    <form onSubmit={handleStaffSubmit}>
                        <h2 className="text-2xl font-semibold text-center mb-6">Teacher Login</h2>
                        <div className="space-y-4">
                            <Input label="Email Address" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g., teacher1@exam.com" />
                            <Input label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password"/>
                        </div>
                        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                            {isLoading ? 'Loading...' : 'Continue'}
                        </Button>
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                            Don't have an account?{' '}
                            <button type="button" onClick={() => { setAuthMode('register'); setError(''); }} className="font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 focus:outline-none">
                                Create one
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleStaffVerify}>
                         <h2 className="text-2xl font-semibold text-center mb-2">2-Step Verification</h2>
                         <p className="text-center text-slate-500 dark:text-slate-400 mb-6">An OTP has been "sent" to your email. <br/>(Hint: use <strong>123456</strong>)</p>
                        <div className="space-y-4">
                             <Input label="One-Time Password" id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="Enter 6-digit code"/>
                        </div>
                        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify & Login'}
                        </Button>
                         <Button variant="secondary" onClick={() => { setStep(1); setError(''); }} className="w-full mt-2">
                            Back
                        </Button>
                    </form>
                )}
            </>
        )
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4">
            <div className="text-center mb-8 flex flex-col items-center gap-4">
                <Logo className="h-16 w-16" />
                <div>
                    <h1 className="text-4xl font-bold text-violet-700 dark:text-violet-400">Smart Exam Planner</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Please log in to access your dashboard.</p>
                </div>
            </div>
            <Card className="w-full max-w-md">
                <div className="flex justify-center border-b border-slate-200 dark:border-slate-700 mb-6">
                    <button onClick={() => handleLoginTypeChange('admin')} className={`px-4 py-2 text-sm font-semibold transition-colors ${loginType === 'admin' ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Admin</button>
                    <button onClick={() => handleLoginTypeChange('teacher')} className={`px-4 py-2 text-sm font-semibold transition-colors ${loginType === 'teacher' ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Teacher</button>
                    <button onClick={() => handleLoginTypeChange('student')} className={`px-4 py-2 text-sm font-semibold transition-colors ${loginType === 'student' ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Student</button>
                </div>

                {successMessage && <p className="text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10 p-3 rounded-md text-sm mb-4 text-center">{successMessage}</p>}
                {error && <p className="text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-500/20 p-3 rounded-md text-sm mb-4 text-center">{error}</p>}

                {loginType === 'admin' && renderAdminForm()}

                {loginType === 'teacher' && renderTeacherForm()}

                {loginType === 'student' && (
                     <form onSubmit={handleStudentLogin}>
                        <h2 className="text-2xl font-semibold text-center mb-6">Student Login</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="institution-select" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Institution / Organization</label>
                                <select
                                    id="institution-select"
                                    value={selectedInstitution}
                                    onChange={(e) => setSelectedInstitution(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                >
                                    <option value="" disabled>Select your institution</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="Register Number" id="registerNumber" type="text" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} required placeholder="e.g., 101001" />
                        </div>
                        <Button type="submit" className="w-full mt-6" disabled={isLoading || !selectedInstitution}>
                            {isLoading ? 'Logging In...' : 'Login'}
                        </Button>
                    </form>
                )}

            </Card>
        </div>
    );
};

export default Login;