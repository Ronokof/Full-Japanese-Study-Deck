import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { UUID } from 'crypto';

export const deckName: string = 'Full Japanese Study Deck [JLPT N5~N1 vocab/kanji + common vocab and kanji + grammar]';

export type URLPath = `/${string | `/${string}/${string}`}${'/' | ''}`;

export type JLPT = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface Path {
    filename: string;
    urlPath: URLPath;
    pages?: number | undefined;
}

export interface KanjiForm {
    kanjiForm: string;
    notes?: string[] | undefined;
}

export interface Reading {
    reading: string;
    notes?: string[] | undefined;
    audio?: string | undefined;
}

export interface Translation {
    translation: string;
    notes?: string[] | undefined;
}

export interface KanjiComponent {
    component: string;
    meaning?: string | undefined;
}

export interface Kanji {
    kanji: string;
    strokes?: string | undefined;
    meanings?: string[] | undefined;
    onyomi?: string[] | undefined;
    kunyomi?: string[] | undefined;
    nanori?: string[] | undefined;
    svg?: string | undefined;
    components?: KanjiComponent[] | undefined;
    mnemonic?: string | undefined;
    words?: Word[] | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    source?: string | undefined;
    noteID?: `kanji_${UUID}` | undefined;
    doNotCreateNote?: true | undefined;
}

export interface Radical {
    radical: string;
    reading: string;
    meanings: string[];
    strokes?: string | undefined;
    svg?: string | undefined;
    mnemonic?: string | undefined;
    kanji?: Kanji[] | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    sources?: string[] | undefined;
    noteID?: `radical_${UUID}` | undefined;
}

export interface Phrase {
    phrase: string;
    translation: string;
    furigana?: string | undefined;
}

export interface Word {
    id?: string | undefined;
    readings: Reading[];
    translations: Translation[];
    kanjiForms?: KanjiForm[] | undefined;
    kanji?: Kanji[] | undefined;
    phrases?: Phrase[] | undefined;
    image?: string | undefined;
    common?: true | undefined;
    tags?: string[] | undefined;
    noteID?: `word_${UUID}` | undefined;
}

export interface Kana {
    kana: string;
    reading: string;
    audio?: string | undefined;
    svg?: string | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    noteID?: `kana_${UUID}` | undefined;
}

export interface GrammarMeaning {
    meaning: string;
    example?: string | undefined;
}

export interface Grammar {
    point: string;
    meaning: GrammarMeaning;
    readings?: Reading[] | undefined;
    usages?: string[] | undefined;
    phrases?: Phrase[] | undefined;
    jlpt?: JLPT | undefined;
    source?: string | undefined;
    audio?: string | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    noteID?: `grammar_${UUID}` | undefined;
}

export type Result = Word | Kanji | Radical | Kana | Grammar;

export interface ResultPathsObject {
    vocabJLPT: string;
    kanjiJLPT: string;
    radicals: string;
    kana: string;
    grammar: string;
    extraKanji: string;
    allKana: string;
}

export const resultPaths: ResultPathsObject = {
    vocabJLPT: path.resolve('./results/vocabJLPT'),
    kanjiJLPT: path.resolve('./results/kanjiJLPT'),
    radicals: path.resolve('./results/radicals'),
    kana: path.resolve('./results/kana'),
    grammar: path.resolve('./results/grammar'),
    extraKanji: path.resolve('./results/extra-kanji'),
    allKana: path.resolve('./results/all-kana')
};

export function saveEntries(resultPath: string): void {
    if (existsSync(resultPath)) {
        let jsonDir: string = `${resultPath}/json`;

        let jsonFiles: string[] = (existsSync(jsonDir)) ? readdirSync(jsonDir, { encoding: 'utf-8', recursive: false }) : [];

        for (let jsonFile of jsonFiles) {
            let jsonFileContent: Result[] | null | undefined = JSON.parse(readFileSync(`${jsonDir}/${jsonFile}`, 'utf-8'));
            let jsonFilename: string = path.parse(jsonFile).name;

            if (jsonFileContent && Array.isArray(jsonFileContent) && jsonFileContent.every((result: Result) => typeof result === 'object')) {
                let ankiNotesFile: string | undefined = generateAnkiNotesFile(jsonFileContent, jsonFilename);

                if (ankiNotesFile) {
                    writeFileSync(`${resultPath}/${jsonFilename}.txt`, ankiNotesFile, 'utf-8');
                    console.log(`Saved ${jsonFile} with ${jsonFileContent.length} entries`);
                }
            }
        }
    }
}

export function isWord(entry: Result): entry is Word {
    return ((entry as Word).translations !== undefined && (entry as Word).readings !== undefined);
}

export function isRadical(entry: Result): entry is Radical {
    return ((entry as Radical).radical !== undefined && (entry as Radical).reading !== undefined && (entry as Radical).meanings !== undefined);
}

export function isKanji(entry: Result): entry is Kanji {
    return ((entry as Word).translations === undefined && (entry as Word).readings === undefined && (entry as Radical).radical === undefined && (entry as Kanji).kanji !== undefined);
}

export function isKana(entry: Result): entry is Kana {
    return ((entry as Kana).kana !== undefined && (entry as Kana).reading !== undefined);
}

export function isGrammar(entry: Result): entry is Grammar {
    return ((entry as Grammar).point !== undefined && (entry as Grammar).meaning !== undefined);
}

export const createNotes: (notes: string[], phrase?: true | undefined) => string = (notes: string[], phrase?: true | undefined) => `${(phrase === true) ? '<details><summary>Show translation</summary>' : ''}<ul class="note-list">${notes.map((note: string) => `<li class="note">${note}</li>`).join('')}</ul>${(phrase === true) ? '</details>' : ''}`;
export const createEntry: (entry: string, notes?: string[] | undefined, hidden?: true | undefined, phrase?: true | undefined) => string = (entry: string, notes?: string[] | undefined, hidden?: true | undefined, phrase?: true | undefined) => `${(hidden === true) ? '<details><summary>Show</summary>' : ''}<div class="entry">${entry}${(notes && notes.length > 0) ? createNotes(notes, phrase) : ''}</div>${(hidden === true) ? '</details>' : ''}`;
export const noKanjiForms: string = '<span class="word word-kanjiform">(no kanji forms)</span>';

export function generateAnkiNote(entry: Result): string[] {
    if (!entry.noteID) throw new Error('Invalid note ID');

    let fields: string[] = [];

    if (isWord(entry)) {
        let usuallyInKana: boolean = entry.translations.every((translation) => translation.notes && translation.notes.includes('Word usually written using kana alone'));

        fields.push(
            ...(entry.kanjiForms && !usuallyInKana) ?
                [
                    entry.kanjiForms.map((kanjiFormEntry: KanjiForm, index: number) => (index === 0) ? createEntry(`<span class="word word-kanjiform"><ruby><rb>${kanjiFormEntry.kanjiForm}</rb><rt>${(entry as Word).readings[0]!.reading}</rt></ruby></span>`, kanjiFormEntry.notes) : createEntry(`<span class="word word-kanjiform">${kanjiFormEntry.kanjiForm}</span>`, kanjiFormEntry.notes, true)).join(''),
                    entry.readings.map((readingEntry: Reading, index: number) => createEntry(`<span class="word word-reading">${readingEntry.reading}${(readingEntry.audio !== undefined) ? `<br>[sound:${readingEntry.audio}]` : ''}</span>`, readingEntry.notes, (index > 0) ? true : undefined)).join('')
                ]
                :
                [
                    entry.readings.map((readingEntry: Reading, index: number) => createEntry(`<span class="word word-reading">${readingEntry.reading}${(readingEntry.audio !== undefined) ? `<br>[sound:${readingEntry.audio}]` : ''}</span>`, readingEntry.notes, (index > 0) ? true : undefined)).join(''),
                    (entry.kanjiForms) ? entry.kanjiForms.map((kanjiFormEntry: KanjiForm, index: number) => (index === 0) ? createEntry(`<span class="word word-kanjiform"><ruby><rb>${kanjiFormEntry.kanjiForm}</rb><rt>${(entry as Word).readings[0]!.reading}</rt></ruby></span>`, kanjiFormEntry.notes) : createEntry(`<span class="word word-kanjiform">${kanjiFormEntry.kanjiForm}</span>`, kanjiFormEntry.notes, true)).join('') : noKanjiForms
                ],
            entry.translations.map((translationEntry: Translation) => createEntry(`<span class="word word-translation">${translationEntry.translation}</span>`, translationEntry.notes)).join(''),
            (entry.kanji) ? entry.kanji.map((kanjiEntry: Kanji) => createEntry(`<span class="word word-kanji">${kanjiEntry.kanji}${(kanjiEntry.meanings === undefined) ? ' (no meanings)' : ''}</span>`, kanjiEntry.meanings)).join('') : '<span class="word word-kanji">(no kanji)</span>',
            (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="word word-phrase"><ruby><rb>${phraseEntry.phrase}</rb><rt>${phraseEntry.furigana!}</rt></ruby></span>`, [phraseEntry.translation], undefined, true)).join('') : '<span class="word word-phrase">(no phrases) (Search on dictionaries!)</span>',
            ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
        );
    }

    if (isRadical(entry)) fields.push(
        createEntry(`<span class="radical radical-character">${entry.radical}</span>`),
        createEntry(`<span class="radical radical-reading">${entry.reading}</span>`),
        entry.meanings.map((meaningEntry: string) => createEntry(`<span class="radical radical-meaning">${meaningEntry}</span>`)).join(''),
        (entry.mnemonic) ? createEntry(`<span class="radical radical-mnemonic">${entry.mnemonic}</span>`) : '<span class="radical radical-mnemonic">(no mnemonic) (Come up with your own!)</span>',
        (entry.kanji) ? entry.kanji.map((kanji: Kanji) => createEntry(`<span class="radical radical-kanji">${kanji.kanji}${(kanji.meanings && kanji.meanings.length === 1) ? ` - ${kanji.meanings[0]}` : ''}</span>`)).join('') : '<span class="radical radical-kanji">(no "used-in" kanji)</span>',
        (entry.strokes) ? createEntry(`<span class="radical radical-strokes">${entry.strokes}<br>${(entry.svg) ? `<img class="radical radical-stroke-order" src="${entry.svg}" alt="${entry.radical} stroke order SVG">` : '(no stroke order SVG available)'}</span>`) : '<span class="radical radical-strokes">(no stroke number)</span>',
        (entry.sources) ? `<span class="radical radical-source">${entry.sources.map((source: string, index: number) => `<a href="${source}" target="_blank">Source ${index + 1}</a>`).join('<br>')}</span>` : '<span class="kanji kanji-source">(no sources)</span>',
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (isKanji(entry)) fields.push(
        createEntry(`<span class="kanji kanji-character">${entry.kanji}</span>`),
        (entry.meanings) ? entry.meanings.map((meaningEntry: string) => createEntry(`<span class="kanji kanji-meaning">${meaningEntry}</span>`)).join('') : '<span class="kanji kanji-meaning">(no meanings)</span>',
        (entry.onyomi) ? entry.onyomi.map((onyomiEntry: string) => createEntry(`<span class="kanji kanji-onyomi">${onyomiEntry}</span>`)).join('') : '<span class="kanji kanji-onyomi">(no onyomi) (kokuji)</span>',
        (entry.kunyomi) ? entry.kunyomi.map((kunyomiEntry: string) => createEntry(`<span class="kanji kanji-kunyomi">${kunyomiEntry}</span>`)).join('') : '<span class="kanji kanji-kunyomi">(no kunyomi)</span>',
        (entry.nanori) ? entry.nanori.map((nanoriEntry: string) => createEntry(`<span class="kanji kanji-nanori">${nanoriEntry}</span>`)).join('') : '<span class="kanji kanji-nanori">(no nanori)</span>',
        (entry.components) ? entry.components.map((componentEntry: KanjiComponent) => createEntry(`<span class="kanji kanji-component">${componentEntry.component}${(componentEntry.meaning) ? ` - ${componentEntry.meaning}` : ''}</span>`)).join('') : '<span class="kanji kanji-component">(no components)</span>',
        (entry.mnemonic) ? createEntry(`<span class="kanji kanji-mnemonic">${entry.mnemonic}</span>`) : '<span class="kanji kanji-mnemonic">(no mnemonic) (Come up with your own!)</span>',
        (entry.words) ? entry.words.map((word: Word) => createEntry(`<span class="kanji kanji-words">${(word.kanjiForms && word.kanjiForms.length > 0) ? word.kanjiForms[0]!.kanjiForm : '(no kanji form)'} / ${word.readings[0]!.reading} - ${word.translations[0]!.translation}</span>`)).join('') : '<span class="kanji kanji-words">(no words) (Search on dictionaries!)</span>',
        (entry.strokes) ? createEntry(`<span class="kanji kanji-strokes">${entry.strokes}<br>${(entry.svg) ? `<img class="kanji kanji-stroke-order" src="${entry.svg}" alt="${entry.kanji} stroke order SVG">` : '(no stroke order SVG available)'}</span>`) : '<span class="kanji kanji-strokes">(no stroke number)</span>',
        (entry.source) ? `<span class="kanji kanji-source"><a href="${entry.source}" target="_blank">Source</a></span>` : '<span class="kanji kanji-source">(no components/mnemonic source)</span>',
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (isKana(entry)) fields.push(
        createEntry(`<span class="kana kana-character">${entry.kana}</span>`),
        createEntry(`<span class="kana kana-reading">${entry.reading}${(entry.audio !== undefined) ? `<br>[sound:${entry.audio}]` : ''}<br>${(entry.svg) ? `<img class="kana kana-stroke-order" src="${entry.svg}" alt="${entry.kana} stroke order SVG">` : '(no stroke order SVG available)'}</span>`),
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (isGrammar(entry)) fields.push(
        createEntry(`<span class="grammar grammar-point">${entry.point}</span>`),
        (entry.readings) ? entry.readings.map((readingEntry: Reading) => createEntry(`<span class="grammar grammar-reading">${readingEntry.reading}</span>`)).join('') : '<span class="grammar grammar-reading">(no additional readings)</span>',
        createEntry(`<span class="grammar grammar-meaning">${entry.meaning.meaning}${(entry.meaning.example && entry.meaning.example.length > 0) ? `<br><span class="grammar grammar-meaning-example">${entry.meaning.example}</span>` : ''}</span>`),
        (entry.usages) ? entry.usages.map((usage) => createEntry(`<span class="grammar grammar-usage">${usage}</span>`)).join('') : '<span class="grammar grammar-usage">(no usages)</span>',
        (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="grammar grammar-phrase"><ruby><rb>${phraseEntry.phrase}</rb><rt>${phraseEntry.furigana!}</rt></ruby></span>`, [phraseEntry.translation], undefined, true)).join('') : '<span class="grammar grammar-phrase">(no phrases) (Search on dictionaries!)</span>',
        (entry.source) ? `<span class="grammar grammar-source"><a href="${entry.source}" target="_blank">Source</a></span>` : '<span class="grammar grammar-source">(no source)</span>',
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (fields.length > 0) return fields.map((field: string) => field.replaceAll('\n', '<br>'));
    else throw new Error('Invalid entry');
}

export function generateAnkiNotesFile(list: Result[], urlPath: Path | string): string | undefined {
    list = list.filter((result: Result) => {
        if ((result as Kanji).kanji !== undefined) {
            if ((result as Kanji).doNotCreateNote === true) return false;
        }

        return true;
    });

    if (list.length > 0) {
        let headers: string[] = ['#separator:tab\n', '#html:true\n', '#guid column:1\n', '#notetype column:2\n', '#deck column:3\n'];

        let deck: string = `${deckName}::`;

        let filename: string = (typeof urlPath === 'string') ? urlPath : urlPath.filename;
        let filenameParts: string[] = filename.split('_');

        switch (filenameParts.length) {
            case 1:
                if (filenameParts[0]! === 'hiragana') deck += '0. Kana::Hiragana';
                else if (filenameParts[0]! === 'katakana') deck += '0. Kana::Katakana';
                else if (filenameParts[0]! === 'radicals') deck += '3. Kanji radicals (reference)';

                break;
            case 2:
                if (filenameParts[0]! === 'kana' && filenameParts[1]! === 'words') deck += '4. Vocab with no kanji (mining/reference)';
                else if (filenameParts[0]! === 'grammar') deck += `2. Grammar::${(filenameParts[1]! === 'additional') ? 'Additional' : filenameParts[1]!.toUpperCase()}`;
                else if (filenameParts[1]! === 'extended') deck += `0. Kana::${(filenameParts[0]! === 'hiragana') ? 'Hiragana' : (filenameParts[0]! === 'katakana') ? 'Katakana' : ''} extended`;
                else if (filenameParts[0]! === 'kanji' && filenameParts[1]!.startsWith('n')) deck += `1. JLPT::Kanji::${filenameParts[1]!.toUpperCase()}`;
                else if (filenameParts[0]! === 'vocab' && filenameParts[1]!.startsWith('n')) deck += `1. JLPT::Vocab::${filenameParts[1]!.toUpperCase()}`;
                else if (filenameParts[0]! === 'extra' && filenameParts[1]! === 'kanji') deck += '5. Extra kanji (mining/reference)::Kanji';

                break;
            case 3:
                if (filenameParts[0]! === 'extra' && filenameParts[1]! === 'kanji' && filenameParts[2]! === 'words') deck += '5. Extra kanji (mining/reference)::Vocab';

                break;
            default:
                throw new Error('Invalid filename');
        }

        let ankiNotes: string = list.map((result: Result) => {
            if (!result.noteID) throw new Error('Invalid result');

            let note: string[] = generateAnkiNote(result);
            if (headers.length === 5) headers.push(`#tags column:${note.length + 3}\n`);

            let noteType: string = '';

            if (isWord(result)) noteType = 'Word';
            if (isRadical(result)) noteType = 'Radical';
            if (isKanji(result)) noteType = 'Kanji';
            if (isKana(result)) noteType = 'Kana';
            if (isGrammar(result)) noteType = 'Grammar';

            if (noteType.length === 0) throw new Error('Invalid entry');

            return `${result.noteID}\t${noteType}\t${deck}\t${note.join('\t')}`;
        }).join('\n').trim();

        if (ankiNotes.length === 0) throw new Error('Invalid list');

        return `${headers.join('')}${ankiNotes}`;
    } else console.log('No entries available for Anki notes creation');

    return undefined;
}