'use client';

import { useState, useEffect } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

interface EncryptedTextProps {
    text: string | number;
    enabled: boolean;
    className?: string;
    preserveLength?: boolean;
}

export default function EncryptedText({ text, enabled, className = '', preserveLength = true }: EncryptedTextProps) {
    const [display, setDisplay] = useState(text ? text.toString() : '');

    useEffect(() => {
        if (!enabled) {
            setDisplay(text ? text.toString() : '');
            return;
        }

        const rawText = text ? text.toString() : '';
        // If preserveLength is false, use fixed length or random length
        const length = preserveLength ? rawText.length : 8;

        let result = '';
        for (let i = 0; i < length; i++) {
            if (rawText[i] === ' ' || rawText[i] === ',' || rawText[i] === '.') {
                result += rawText[i]; // Preserve punctuation/spaces for readability of structure
            } else {
                result += CHARS[Math.floor(Math.random() * CHARS.length)];
            }
        }
        setDisplay(result);

    }, [enabled, text, preserveLength]);

    return (
        <span className={`${className} ${enabled ? 'font-mono tracking-wider' : ''}`}>
            {display}
        </span>
    );
}
