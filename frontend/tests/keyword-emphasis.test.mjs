import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';

// Use the installed compiler and Node's test runner, including on CI's Node 20.
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const emphasisUrl = moduleUrl(compile(await readFile(new URL('../src/utils/keywordEmphasis.ts', import.meta.url), 'utf8')));
const { extractEmphasisTerms, findEmphasisRanges, splitEmphasizedText } = await import(emphasisUrl);
const pluginSource = compile(await readFile(new URL('../src/utils/rehypeKeywordEmphasis.ts', import.meta.url), 'utf8'))
    .replace(/from ['"]\.\/keywordEmphasis['"]/g, `from '${emphasisUrl}'`);
const { rehypeKeywordEmphasis } = await import(moduleUrl(pluginSource));
const emphasized = (value, query, facts = false) => splitEmphasizedText(value, findEmphasisRanges(value, extractEmphasisTerms(query), facts))
    .filter(part => part.emphasized).map(part => part.text);

test('plain revenue answer emphasizes question terms and complete currency figures without Markdown', () => {
    const value = 'The revenue for Quarter 1 (January, February, and March) 2026 is RM224,000.00. January is RM72,000.00, February RM75,000.00 and March RM77,000.00 [S2].';
    const hits = emphasized(value, 'What is the revenue for Quarter 1 2026?', true);
    for (const expected of ['revenue', 'Quarter 1', '2026', 'RM224,000.00', 'RM72,000.00', 'RM75,000.00', 'RM77,000.00']) assert.ok(hits.includes(expected), expected);
    assert.equal(splitEmphasizedText(value, findEmphasisRanges(value, extractEmphasisTerms('revenue 2026'), true)).map(part => part.text).join(''), value);
});

test('short technical terms match whole words and preserve product codes', () => {
    assert.deepEqual(emphasized('HR uses pH and ISO for 5W-30. Internet is separate.', 'HR pH ISO 5W-30 net'), ['HR', 'pH', 'ISO', '5W-30']);
});

test('Chinese questions emphasize Chinese text and values beside Han characters', () => {
    const hits = emphasized('2026年第一季度营收为RM224,000.00，年假有14天。', '2026年第一季度营收和年假是多少？', true);
    assert.ok(hits.some(value => value.includes('营收')));
    assert.ok(hits.some(value => value.includes('年假')));
    assert.ok(hits.some(value => value.includes('RM224,000.00')));
    assert.ok(hits.some(value => value.includes('14天')));
});

test('Malay stop words do not drown out meaningful matches', () => {
    const hits = emphasized('Hasil suku pertama ialah RM224,000.00.', 'Apakah hasil untuk suku pertama?', true);
    assert.deepEqual(hits, ['Hasil', 'suku', 'pertama', 'RM224,000.00']);
});

test('normalization preserves original full-width and ligature text offsets', () => {
    assert.deepEqual(emphasized('ＲＭ２２４，０００．００ and ﬁlter', 'filter', true), ['ＲＭ２２４，０００．００', 'ﬁlter']);
    assert.deepEqual(emphasized('10.2 mm²/s at 100°C', '', true), ['10.2 mm²/s', '100°C']);
});

test('literal matching escapes regex characters and leaves source citations intact', () => {
    assert.deepEqual(emphasized('Viscosity 10.2, not 10x2. [S2]', '10.2 S2', true), ['10.2']);
});

test('rendered Markdown retains formatting, code, link targets and citations', () => {
    const html = renderToStaticMarkup(createElement(ReactMarkdown, {
        rehypePlugins: [[rehypeKeywordEmphasis, { query: 'revenue RM224,000.00 S2', includeFacts: true }]],
        children: '**Revenue** is RM224,000.00 [S2].\n\n- Revenue facts\n- `RM224,000.00`\n\n[revenue](https://example.test/revenue)',
    }));
    assert.ok(html.includes('<strong>Revenue</strong>'));
    assert.ok(html.includes('<strong class="keyword-emphasis">RM224,000.00</strong> [S2]'));
    assert.ok(html.includes('<code>RM224,000.00</code>'));
    assert.ok(html.includes('<a href="https://example.test/revenue">revenue</a>'));
    assert.ok(html.includes('<ul>'));
    assert.ok(!html.includes('<mark'));
    assert.ok(!html.includes('<strong><strong'));
});
