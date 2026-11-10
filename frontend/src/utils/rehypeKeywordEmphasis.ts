import { extractEmphasisTerms, findEmphasisRanges, splitEmphasizedText } from './keywordEmphasis';

interface EmphasisNode {
    type: string;
    value?: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: EmphasisNode[];
}

// Operate on parsed text nodes so Markdown, links, source IDs and escaped HTML stay intact.
export function rehypeKeywordEmphasis({ query, includeFacts = false }: { query: string; includeFacts?: boolean }) {
    const terms = extractEmphasisTerms(query);
    return (tree: EmphasisNode) => {
        const visit = (node: EmphasisNode) => {
            if (!node.children || ['code', 'pre', 'a', 'mark', 'strong', 'script', 'style'].includes(node.tagName ?? '')) return;
            node.children = node.children.flatMap(child => {
                if (child.type !== 'text' || !child.value) {
                    visit(child);
                    return [child];
                }
                const ranges = findEmphasisRanges(child.value, terms, includeFacts);
                if (!ranges.length) return [child];
                return splitEmphasizedText(child.value, ranges).map(part => part.emphasized
                    ? { type: 'element', tagName: 'strong', properties: { className: ['keyword-emphasis'] }, children: [{ type: 'text', value: part.text }] }
                    : { type: 'text', value: part.text });
            });
        };
        visit(tree);
    };
}
