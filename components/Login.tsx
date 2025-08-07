
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { Role } from '../types';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registerNumber, setRegisterNumber] = useState('');
    const [loginType, setLoginType] = useState<'admin' | 'teacher' | 'student'>('admin');

    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginStudent } = useAuth();
    const navigate = useNavigate();

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
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
    
    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        const user = await loginStudent(registerNumber);
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
        setStep(1);
        setEmail('');
        setPassword('');
        setOtp('');
        setRegisterNumber('');
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-violet-700">Smart Exam Planner</h1>
                <p className="text-slate-500 mt-2">Please log in to access your dashboard.</p>
            </div>
            <Card className="w-full max-w-md">
                <div className="flex justify-center border-b border-slate-200 mb-6">
                    <button onClick={() => handleLoginTypeChange('admin')} className={`px-4 py-2 text-sm font-semibold transition-colors ${loginType === 'admin' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Admin</button>
                    <button onClick={() => handleLoginTypeChange('teacher')} className={`px-4 py-2 text-sm font-semibold transition-colors ${loginType === 'teacher' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Teacher</button>
                    <button onClick={() => handleLoginTypeChange('student')} className={`px-4 py-2 text-sm font-semibold transition-colors ${loginType === 'student' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Student</button>
                </div>

                {(loginType === 'admin' || loginType === 'teacher') && (
                    <>
                    {step === 1 ? (
                        <form onSubmit={handleStaffSubmit}>
                            <h2 className="text-2xl font-semibold text-center mb-6">{loginType === 'admin' ? 'Admin' : 'Teacher'} Login</h2>
                            <div className="space-y-4">
                                <Input label="Email Address" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={`e.g., ${loginType === 'admin' ? 'admin' : 'teacher1'}@exam.com`} />
                                <Input label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Default: password123"/>
                            </div>
                            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                                {isLoading ? 'Loading...' : 'Continue'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleStaffVerify}>
                             <h2 className="text-2xl font-semibold text-center mb-2">2-Step Verification</h2>
                             <p className="text-center text-slate-500 mb-6">An OTP has been "sent" to your email. <br/>(Hint: use <strong>123456</strong>)</p>
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
                )}

                {loginType === 'student' && (
                     <form onSubmit={handleStudentLogin}>
                        <h2 className="text-2xl font-semibold text-center mb-6">Student Login</h2>
                        <div className="space-y-4">
                            <Input label="Register Number" id="registerNumber" type="text" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} required placeholder="e.g., 101001" />
                        </div>
                        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                            {isLoading ? 'Logging In...' : 'Login'}
                        </Button>
                    </form>
                )}

                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                
            </Card>
        </div>
    );
};

export default Login;
