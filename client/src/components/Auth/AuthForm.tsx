import React, { useState } from 'react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface AuthFormProps {
    onSubmit: (
        username: string,
        password: string,
        isRegister: boolean,
    ) => Promise<void>;
    isLoading: boolean;
    errorMessage: string;
}

export function AuthForm({ onSubmit, isLoading, errorMessage }: AuthFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (isRegister: boolean) => {
        if (username && password && !isLoading) {
            await onSubmit(username, password, isRegister);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && username && password && !isLoading) {
            handleSubmit(false); // Default to login on Enter
        }
    };

    return (
        <div className="min-h-screen bg-gradient-auth flex items-center justify-center px-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md animate-slideIn">
                <h1 className="text-3xl font-bold text-center text-auth-text-dark mb-8 bg-gradient-text bg-clip-text text-transparent">
                    Vocabulary App
                </h1>

                <div className="space-y-6">
                    <div>
                        <Input
                            type="text"
                            value={username}
                            onChange={setUsername}
                            placeholder="Enter your username"
                            disabled={isLoading}
                            onKeyDown={handleKeyPress}
                        />
                    </div>

                    <div>
                        <Input
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="Enter your password"
                            disabled={isLoading}
                            onKeyDown={handleKeyPress}
                        />
                    </div>

                    {errorMessage && (
                        <div className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
                            {errorMessage}
                        </div>
                    )}

                    <div className="space-y-3">
                        <Button
                            onClick={() => handleSubmit(false)}
                            disabled={!username || !password || isLoading}
                            className="w-full"
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>

                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={!username || !password || isLoading}
                            className={`w-full px-6 py-2 border-2 border-slate-200 rounded-lg font-montserrat font-semibold cursor-pointer transition-all duration-200 bg-slate-50 text-slate-600 shadow-sm ${!username || !password || isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'}`}
                        >
                            {isLoading
                                ? 'Creating Account...'
                                : 'Create Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
