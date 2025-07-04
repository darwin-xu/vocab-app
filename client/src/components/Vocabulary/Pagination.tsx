interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
}: PaginationProps) {
    // Always show pagination, even with 1 page
    // if (totalPages <= 1) return null;

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
                for (
                    let i = Math.max(totalPages - maxVisible + 1, 1);
                    i <= totalPages;
                    i++
                ) {
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
        <div className="flex justify-center items-center gap-1 mt-6 bg-gray-300/80 rounded-xl p-2 shadow-md">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="w-8 h-8 rounded-sm bg-transparent text-gray-700 hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm flex items-center justify-center"
            >
                {'<'}
            </button>

            {getPageNumbers().map((pageNum, index) => (
                <button
                    key={index}
                    onClick={() =>
                        typeof pageNum === 'number' && onPageChange(pageNum)
                    }
                    disabled={pageNum === '...' || pageNum === currentPage}
                    className={`w-8 h-8 rounded-sm transition-all duration-200 text-sm flex items-center justify-center ${
                        pageNum === currentPage
                            ? 'bg-gradient-primary text-white shadow-sm'
                            : pageNum === '...'
                              ? 'cursor-default text-gray-500 bg-transparent'
                              : 'bg-transparent text-gray-700 hover:bg-white/60'
                    }`}
                >
                    {pageNum}
                </button>
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="w-8 h-8 rounded-sm bg-transparent text-gray-700 hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm flex items-center justify-center"
            >
                {'>'}
            </button>
        </div>
    );
}
