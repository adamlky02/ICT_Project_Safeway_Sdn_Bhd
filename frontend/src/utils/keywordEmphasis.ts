export interface EmphasisRange { start: number; end: number }
export interface EmphasisPart { text: string; emphasized: boolean }

const STOP_WORDS = new Set(('a an the is are was were be been being what which how when where why who can could would should do does did ' +
    'i me my we our you your it its this that these those for of to and or in on at by with from as please tell about ' +
    'apa apakah berapa bila bagaimana yang dan atau di ke dari untuk boleh saya kami anda ini itu ialah adalah sila').split(' '));
const HAN_STOP_WORDS = new Set(['什么', '多少', '怎么', '如何', '请问', '是否', '这个', '那个', '可以', '我们', '你们', '第一', '第二', '第三', '第四']);
const HAN = /\p{Script=Han}/u;

// Preserve a map to original offsets when full-width characters or ligatures normalize.
function normalize(value: string) {
    let text = '';
    const offsets: EmphasisRange[] = [];
    let offset = 0;
    for (const character of value) {
        const folded = character.normalize('NFKC').toLowerCase();
        for (const normalized of folded) {
            if (normalized === '\u00ad') continue;
            text += normalized;
            for (let index = 0; index < normalized.length; index++) {
                offsets.push({ start: offset, end: offset + character.length });
            }
        }
        offset += character.length;
    }
    return { text, offsets };
}

type SegmenterConstructor = new (locale: string, options: { granularity: 'word' }) => {
    segment(value: string): Iterable<{ segment: string; isWordLike?: boolean }>;
};

export function extractEmphasisTerms(query: string): string[] {
    const terms = new Set<string>();
    const value = query.normalize('NFKC');
    const periods = value.match(/\b(?:quarter\s+[1-4]|q[1-4])\b|第?[一二三四1-4]季度/giu) ?? [];
    periods.forEach(period => terms.add(period.toLowerCase()));
    const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
    const segmenter = Segmenter ? new Segmenter('zh', { granularity: 'word' }) : null;
    for (const match of value.matchAll(/\p{Script=Han}+|[\p{Script=Latin}\p{N}]+(?:[.,/\-][\p{Script=Latin}\p{N}]+)*/gu)) {
        const token = match[0].toLowerCase();
        if (HAN.test(token)) {
            const characters = Array.from(token);
            const bigrams = characters.slice(0, -1).map((_, index) => characters.slice(index, index + 2).join(''));
            const words = [...(segmenter ? Array.from(segmenter.segment(token), item => item.segment) : []), ...bigrams];
            if (characters.length === 1) words.push(token);
            words.forEach(word => {
                if ((word.length >= 2 || token.length === 1) && !HAN_STOP_WORDS.has(word)) terms.add(word);
            });
        } else if (token.length >= 2 && !STOP_WORDS.has(token)) {
            terms.add(token);
        }
    }
    return [...terms].slice(0, 128).sort((a, b) => b.length - a.length);
}

export function mergeEmphasisRanges(ranges: EmphasisRange[]): EmphasisRange[] {
    const merged: EmphasisRange[] = [];
    for (const range of ranges.filter(range => range.end > range.start).sort((a, b) => a.start - b.start || b.end - a.end)) {
        const previous = merged[merged.length - 1];
        if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
        else merged.push({ ...range });
    }
    return merged;
}

function wordCharacter(character: string) {
    return /[\p{L}\p{N}_]/u.test(character) && !HAN.test(character);
}

const FACTS = /(?:\b(?:RM|MYR|USD|SGD|CNY|RMB|EUR|GBP)|[$€£¥￥])\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|juta|万|亿))?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%|％|°[CF]|cSt\b|mPa[·.]?s\b|mm[²2]\/s\b|days?\b|hours?\b|months?\b|years?\b|天|小时|个月|年)/giu;

export function findEmphasisRanges(value: string, terms: string[], includeFacts = false): EmphasisRange[] {
    const normalized = normalize(value);
    const ranges: EmphasisRange[] = [];
    const add = (start: number, end: number) => {
        if (normalized.offsets[start] && normalized.offsets[end - 1]) {
            ranges.push({ start: normalized.offsets[start].start, end: normalized.offsets[end - 1].end });
        }
    };
    if (terms.length) {
        const pattern = terms.map(term => normalize(term).text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')).filter(Boolean).join('|');
        if (pattern) {
            for (const match of normalized.text.matchAll(new RegExp(`(?=(${pattern}))`, 'gu'))) {
                const term = match[1];
                const start = match.index!;
                const end = start + term.length;
                if (wordCharacter(term[0]) && start > 0 && wordCharacter(normalized.text[start - 1])) continue;
                if (wordCharacter(term.slice(-1)) && end < normalized.text.length && wordCharacter(normalized.text[end])) continue;
                add(start, end);
            }
        }
    }
    if (includeFacts) {
        for (const match of normalized.text.matchAll(FACTS)) add(match.index!, match.index! + match[0].length);
    }
    const citations = [...value.matchAll(/\[S\d+\]/g)].map(match => ({ start: match.index!, end: match.index! + match[0].length }));
    return mergeEmphasisRanges(ranges.filter(range => !citations.some(citation => range.start < citation.end && range.end > citation.start)));
}

export function splitEmphasizedText(value: string, ranges: EmphasisRange[]): EmphasisPart[] {
    const result: EmphasisPart[] = [];
    let position = 0;
    for (const range of mergeEmphasisRanges(ranges)) {
        if (range.start > position) result.push({ text: value.slice(position, range.start), emphasized: false });
        result.push({ text: value.slice(range.start, range.end), emphasized: true });
        position = range.end;
    }
    if (position < value.length) result.push({ text: value.slice(position), emphasized: false });
    return result;
}

