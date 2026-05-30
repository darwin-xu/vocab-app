import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DefinitionWindow } from '../components/Vocabulary/DefinitionWindow';

vi.mock('../components/TTSControls', () => ({
    default: vi.fn(() => <div data-testid="tts-controls" />),
}));

import TTSControls from '../components/TTSControls';

describe('DefinitionWindow', () => {
    it('does not force image controls while definition is loading', () => {
        render(
            <DefinitionWindow
                isVisible
                x={10}
                y={20}
                content="Loading."
                word="plane"
                isLoading
            />,
        );

        expect(TTSControls).toHaveBeenCalledWith(
            expect.objectContaining({
                visualReference: undefined,
            }),
            undefined,
        );
    });

    it('does not duplicate image controls when content already has a marker', () => {
        render(
            <DefinitionWindow
                isVisible
                x={10}
                y={20}
                content='<!-- vocab-image:{"word":"plane","image_query":"passenger airplane"} -->'
                word="plane"
                isLoading={false}
            />,
        );

        expect(TTSControls).toHaveBeenCalledWith(
            expect.objectContaining({
                visualReference: undefined,
            }),
            undefined,
        );
    });

    it('forces image controls for known object nouns after loading', () => {
        render(
            <DefinitionWindow
                isVisible
                x={10}
                y={20}
                content="# plane\n\n## Noun"
                word="plane"
                isLoading={false}
            />,
        );

        expect(TTSControls).toHaveBeenCalledWith(
            expect.objectContaining({
                visualReference: {
                    word: 'plane',
                    image_query: 'passenger airplane',
                },
            }),
            undefined,
        );
    });
});
