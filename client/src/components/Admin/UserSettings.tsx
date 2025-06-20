import type { UserDetails } from '../../types';

interface UserSettingsProps {
    selectedUser: UserDetails;
    onSave: () => void;
    onCancel: () => void;
    onUserChange: (updatedUser: UserDetails) => void;
}

export function UserSettings({
    selectedUser,
    onSave,
    onCancel,
    onUserChange,
}: UserSettingsProps) {
    const isOwnProfile =
        selectedUser?.id.toString() === localStorage.getItem('userId');

    return (
        <div className="min-h-screen box-border p-8 overflow-y-auto flex items-start justify-center bg-gradient-auth pt-8">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-12 max-w-2xl w-full shadow-xl border border-white/20 relative animate-slideIn">
                <div className="text-center mb-10">
                    <h1 className="m-0 text-4xl font-bold bg-gradient-text bg-clip-text text-transparent tracking-tight">
                        {isOwnProfile ? 'My Settings' : 'User Settings'}
                    </h1>
                    <p className="m-0 text-auth-text-medium text-base font-normal leading-relaxed mt-4">
                        {isOwnProfile
                            ? 'Configure your custom word definition instructions'
                            : `Configure custom instructions for ${selectedUser?.username}`}
                    </p>
                </div>
                <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-3.5">
                        <label
                            htmlFor="instructions"
                            className="text-sm font-semibold text-auth-text-dark ml-0.5"
                        >
                            Custom Word Definition Instructions
                        </label>
                        <textarea
                            id="instructions"
                            placeholder="Enter custom instructions for how words should be defined for this user. Use {word} as placeholder for the word to be defined.

Example:
Define the word '{word}' in a simple way:
**Meaning:** [simple definition]
**Example:** [example sentence]"
                            value={selectedUser?.custom_instructions}
                            onChange={(e) =>
                                onUserChange({
                                    ...selectedUser,
                                    custom_instructions: e.target.value,
                                })
                            }
                            rows={10}
                            className="w-full p-5 border-2 border-gray-200 rounded-lg text-sm font-mono resize-y min-h-64 transition-all duration-200 bg-gray-50 text-gray-800 focus:outline-none focus:border-auth-primary focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1),0_4px_12px_rgba(0,0,0,0.08)] focus:bg-white focus:-translate-y-px placeholder:text-auth-text-light"
                        />
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                        <button
                            className="px-9 py-5 border-none rounded-lg text-lg font-semibold cursor-pointer transition-all duration-200 bg-gradient-primary text-white shadow-vocab-lg hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] active:translate-y-0"
                            onClick={onSave}
                        >
                            Save Instructions
                        </button>
                        <button
                            className="px-9 py-5 border-2 border-slate-200 rounded-lg text-lg font-semibold cursor-pointer transition-all duration-200 bg-slate-50 text-slate-600 shadow-sm hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
