import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../components/UI/Input';

describe('Input Component - Clear Button', () => {
    it('should not show clear button when input is empty', () => {
        const onChange = vi.fn();
        render(<Input value="" onChange={onChange} />);

        const clearButton = screen.queryByLabelText('Clear input');
        expect(clearButton).not.toBeInTheDocument();
    });

    it('should show clear button when input has value', () => {
        const onChange = vi.fn();
        render(<Input value="test" onChange={onChange} />);

        const clearButton = screen.getByLabelText('Clear input');
        expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear button when input is disabled', () => {
        const onChange = vi.fn();
        render(<Input value="test" onChange={onChange} disabled={true} />);

        const clearButton = screen.queryByLabelText('Clear input');
        expect(clearButton).not.toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<Input value="test" onChange={onChange} />);

        const clearButton = screen.getByLabelText('Clear input');
        await user.click(clearButton);

        expect(onChange).toHaveBeenCalledWith('');
    });
});
