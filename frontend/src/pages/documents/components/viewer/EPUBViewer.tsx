import React, { useState, useEffect } from 'react';
import { ReactReader } from 'react-reader';
import type { Contents, Rendition } from 'epubjs';

export type EPUBTheme = 'light' | 'sepia' | 'twilight' | 'dark';

interface EPUBViewerProps {
    url: string;
    theme?: EPUBTheme;
    className?: string;
    onProgress?: (progress: number) => void;
}

const themeStyles: Record<EPUBTheme, { body: React.CSSProperties }> = {
    light: {
        body: {
            background: '#ffffff',
            color: '#1a1a1a',
        },
    },
    sepia: {
        body: {
            background: '#f4ecd8',
            color: '#5c4b37',
        },
    },
    twilight: {
        body: {
            background: '#1e293b',
            color: '#cbd5e1',
        },
    },
    dark: {
        body: {
            background: '#0a0a0a',
            color: '#e5e5e5',
        },
    },
};

/**
 * EPUB Viewer using react-reader
 */
export const EPUBViewer: React.FC<EPUBViewerProps> = ({
    url,
    theme = 'dark',
    className = '',
    onProgress,
}) => {
    const [location, setLocation] = useState<string | number>(0);
    const [rendition, setRendition] = useState<Rendition | null>(null);

    // Apply theme when it changes
    useEffect(() => {
        if (rendition) {
            const styles = themeStyles[theme];
            rendition.themes.default({
                body: styles.body,
                'body *': {
                    color: `${styles.body.color} !important`,
                    background: 'transparent !important',
                },
            });
        }
    }, [theme, rendition]);

    const handleLocationChange = (epubcifi: string) => {
        setLocation(epubcifi);

        // Calculate progress if callback provided
        if (onProgress && rendition) {
            rendition.book.locations.generate(1024).then(() => {
                const progress = rendition.book.locations.percentageFromCfi(epubcifi);
                onProgress(progress);
            });
        }
    };

    const handleRendition = (rend: Rendition) => {
        setRendition(rend);

        // Apply initial theme
        const styles = themeStyles[theme];
        rend.themes.default({
            body: styles.body,
            'body *': {
                color: `${styles.body.color} !important`,
                background: 'transparent !important',
            },
        });

        // Register theme for click-through
        rend.on('selected', (cfiRange: string, contents: Contents) => {
            console.log('Selected:', cfiRange, contents);
        });
    };

    return (
        <div className={`w-full h-full ${className}`} style={{ position: 'relative' }}>
            <ReactReader
                url={url}
                location={location}
                locationChanged={handleLocationChange}
                getRendition={handleRendition}
                epubOptions={{
                    flow: 'paginated',
                    manager: 'default',
                }}
            />
        </div>
    );
};

export default EPUBViewer;
