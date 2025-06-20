import type { User } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';

interface AdminPanelProps {
    users: User[];
    onUserDetailsClick: (userId: string) => void;
}

export function AdminPanel({ users, onUserDetailsClick }: AdminPanelProps) {
    return (
        <div className="w-full max-w-6xl mx-auto px-xl py-xl relative min-h-[calc(100vh-80px)] pb-32">
            {/* Admin Header */}
            <div className="text-center mb-2xl">
                <h1 className="text-white text-6xl font-extrabold drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] drop-shadow-[0_2px_6px_rgba(102,126,234,0.6)] tracking-tight mb-lg">
                    User Management
                </h1>
            </div>

            {/* Admin Table */}
            <table className="w-full border-collapse mb-2xl bg-vocab-surface backdrop-blur-xl rounded-xl overflow-hidden shadow-lg border border-white/20">
                <thead className="bg-gradient-secondary text-white uppercase text-sm font-bold tracking-wider">
                    <tr>
                        <th className="py-3 px-4 text-left border-b border-vocab-border-light">
                            Username
                        </th>
                        <th className="py-3 px-4 text-left border-b border-vocab-border-light">
                            Created
                        </th>
                        <th className="py-3 px-4 text-left border-b border-vocab-border-light">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => (
                        <tr
                            key={user.id}
                            className={`transition-all duration-200 ${
                                index % 2 === 0
                                    ? 'bg-white/70'
                                    : 'bg-vocab-bg/80'
                            } hover:bg-vocab-surface-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(102,126,234,0.1)]`}
                        >
                            <td className="py-2 px-4 border-b border-vocab-border-light">
                                <span className="font-montserrat font-semibold text-auth-text-dark py-1 px-2 rounded-sm text-base">
                                    {user.username}
                                </span>
                            </td>
                            <td className="py-2 px-4 border-b border-vocab-border-light text-auth-text-medium">
                                {formatRelativeTime(user.created_at)}
                            </td>
                            <td className="py-2 px-4 border-b border-vocab-border-light">
                                <button
                                    className="p-2 bg-gradient-primary text-white border-none rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs text-sm min-w-9 hover:bg-gradient-secondary hover:-translate-y-px hover:shadow-sm"
                                    onClick={() =>
                                        onUserDetailsClick(user.id.toString())
                                    }
                                    title="User Settings"
                                >
                                    Settings
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
