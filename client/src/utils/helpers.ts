// Utility functions for the vocabulary app

// Function to calculate dynamic page size based on window height
export function calculatePageSize(windowHeight: number): number {
    // Estimate available height for table content
    // Account for header (~120px), input area (~120px), pagination (~80px), margins (~100px)
    const overhead = 420;
    const availableHeight = Math.max(300, windowHeight - overhead);

    // Assume each table row is approximately 50px
    const rowHeight = 50;
    const estimatedRows = Math.floor(availableHeight / rowHeight);

    // Clamp between reasonable bounds and double the size
    const baseSize = Math.max(5, Math.min(50, estimatedRows));
    return baseSize * 2;
}

// Utility function to format relative time
export function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const addedDate = new Date(dateString);
    const diffMs = now.getTime() - addedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'today';
    } else if (diffDays < 30) {
        return `${diffDays} d`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} m`;
    } else {
        const years = Math.floor(diffDays / 365);
        return `${years} y`;
    }
}
