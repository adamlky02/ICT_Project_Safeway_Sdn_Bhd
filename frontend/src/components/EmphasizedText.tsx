import { useMemo } from 'react';
import { extractEmphasisTerms, findEmphasisRanges, splitEmphasizedText } from '../utils/keywordEmphasis';

export function EmphasizedText({ text, query }: { text: string; query: string }) {
    const parts = useMemo(() => splitEmphasizedText(text, findEmphasisRanges(text, extractEmphasisTerms(query), true)), [text, query]);
    return <>{parts.map((part, index) => part.emphasized
        ? <strong className="keyword-emphasis" key={index}>{part.text}</strong>
        : part.text)}</>;
}
