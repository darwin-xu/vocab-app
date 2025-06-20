interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
                    pages.push(i);
                }
                if (totalPages > maxVisible) {
                    pages.push('...');
                    pages.push(totalPages);
                }
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = Math.max(totalPages - maxVisible + 1, 1); i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    return (
        <div className="flex justify-center items-center gap-2 mt-6">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 rounded-lg border border-vocab-border text-auth-text-dark hover:bg-vocab-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
                Previous
            </button>
            
            {getPageNumbers().map((page, index) => (
                <button
                    key={index}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...' || page === currentPage}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                        page === currentPage
                            ? 'bg-gradient-primary text-white shadow-md'
                            : page === '...'
                            ? 'cursor-default text-auth-text-medium'
                            : 'border border-vocab-border text-auth-text-dark hover:bg-vocab-surface-hover'
                    }`}
                >
                    {page}
                </button>
            ))}
            
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 rounded-lg border border-vocab-border text-auth-text-dark hover:bg-vocab-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
                Next
            </button>
        </div>
    );
}
