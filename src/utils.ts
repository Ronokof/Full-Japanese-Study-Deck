import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { UUID } from 'crypto';

export type URLPath = `/${string | `/${string}/${string}`}${'/' | ''}`;

export type JLPT = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface Path {
    filename: string;
    urlPath: URLPath;
    pages?: number | undefined;
}

export interface Entry {
    id: string;
    pageEntry?: Element | undefined;
    urlPath?: Path | undefined;
    common?: true | undefined;
    audio?: true | undefined;
}

export interface KanjiForm {
    kanjiForm: string;
    notes?: string[] | undefined;
    audio?: string | undefined;
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
    meanings?: string[] | undefined;
    onyomi?: string[] | undefined;
    kunyomi?: string[] | undefined;
    strokes?: string | undefined;
    svg?: string | undefined;
    components?: KanjiComponent[] | undefined;
    mnemonic?: string | undefined;
    words?: Word[] | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    noteID?: UUID | undefined;
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
    noteID?: UUID | undefined;
}

export interface Phrase {
    phrase: string;
    translations: string[];
}

export interface Word {
    readings: Reading[];
    translations: Translation[];
    kanjiForms?: KanjiForm[] | undefined;
    kanji?: Kanji[] | undefined;
    phrases?: Phrase[] | undefined;
    image?: string | undefined;
    common?: true | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    noteID?: UUID | undefined;
}

export interface Kana {
    kana: string;
    reading: string;
    audio?: string | undefined;
    svg?: string | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    noteID?: UUID | undefined;
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
    audio?: string | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    noteID?: UUID | undefined;
}

export type Result = Word | Kanji | Radical | Kana | Grammar;

export interface Note {
    note: string;
    fieldNumber: number;
}

export interface ResultPathsObject {
    vocabJLPT: string;
    kanjiJLPT: string;
    radicals: string;
    kana: string;
    grammar: string;
    allKanji: string;
    allKana: string;
}

export const resultPaths: ResultPathsObject = {
    vocabJLPT: path.resolve('./results/vocabJLPT'),
    kanjiJLPT: path.resolve('./results/kanjiJLPT'),
    radicals: path.resolve('./results/radicals'),
    kana: path.resolve('./results/kana'),
    grammar: path.resolve('./results/grammar'),
    allKanji: path.resolve('./results/all-kanji'),
    allKana: path.resolve('./results/all-kana')
};

export function saveEntries(resultPath: string): void {
    if (existsSync(resultPath)) {
        let jsonDir: string = `${resultPath}/json`;

        let jsonFiles: string[] = (existsSync(jsonDir)) ? readdirSync(jsonDir, { encoding: 'utf-8', recursive: false }) : [];

        for (let jsonFile of jsonFiles) {
            let jsonFileContent: Result[] | null | undefined = JSON.parse(readFileSync(`${jsonDir}/${jsonFile}`, 'utf-8'));

            if (jsonFileContent && Array.isArray(jsonFileContent) && jsonFileContent.every((result: Result) => typeof result === 'object')) {
                let ankiNotesFile: string | undefined = generateAnkiNotesFile(jsonFileContent);

                if (ankiNotesFile) {
                    writeFileSync(`${resultPath}/${path.parse(jsonFile).name}.txt`, ankiNotesFile, 'utf-8');
                    console.log(`Saved ${jsonFile} with ${jsonFileContent.length} entries`);
                }
            }
        }
    }
}

export const createNotes: (notes: string[]) => string = (notes: string[]) => `<ul class="note-list">${notes.filter((note: string) => !note.trim().startsWith('See also:')).map((note: string) => `<li class="note">${note.trim()}</li>`).join('')}</ul>`;
export const createEntry: (entry: string, notes?: string[] | undefined) => string = (entry: string, notes?: string[] | undefined) => `<div class="entry">${entry}${(notes && notes.length > 0) ? createNotes(notes) : ''}</div>`;
export const noKanjiForms: string = '<span class="word word-kanjiform">(no kanji forms)</span>';

export function generateAnkiNote(entry: Result): Note {
    if ((entry as Word).translations !== undefined && (entry as Word).readings !== undefined) {
        entry = entry as Word;

        let kanjiFormsField: string = (entry.kanjiForms) ? entry.kanjiForms.map((kanjiFormEntry: KanjiForm, index: number) => (index === 0) ? createEntry(`<span class="word word-kanjiform"><ruby><rb>${kanjiFormEntry.kanjiForm}</rb><rt>${(entry as Word).readings[0]!.reading}</rt></ruby>${(kanjiFormEntry.audio !== undefined) ? `<br>[sound:${kanjiFormEntry.audio}]` : ''}</span>`, kanjiFormEntry.notes) : createEntry(`<details><summary>Show</summary><span class="word word-kanjiform">${kanjiFormEntry.kanjiForm}${(kanjiFormEntry.audio !== undefined) ? `<br>[sound:${kanjiFormEntry.audio}]` : ''}</span></details>`, kanjiFormEntry.notes)).join('') : noKanjiForms;
        let readingsField: string = entry.readings.map((readingEntry: Reading, index: number) => createEntry(`${(index > 0) ? '<details><summary>Show</summary>' : ''}<span class="word word-reading">${readingEntry.reading}${(readingEntry.audio !== undefined) ? `<br>[sound:${readingEntry.audio}]` : ''}</span>${(index > 0) ? '</details>' : ''}`, readingEntry.notes)).join('');
        let translationsField: string = entry.translations.map((translationEntry: Translation) => createEntry(`<span class="word word-translation">${translationEntry.translation}</span>`, translationEntry.notes)).join('');
        let kanjiField: string = (entry.kanji) ? entry.kanji.map((kanjiEntry: Kanji) => createEntry(`<span class="word word-kanji">${kanjiEntry.kanji}${(kanjiEntry.meanings === undefined) ? ' (no meanings)' : ''}</span>`, kanjiEntry.meanings)).join('') : '<span class="word word-kanji">(no kanji)</span>';
        let phrasesField: string = (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="word word-phrase">${phraseEntry.phrase}</span>`, phraseEntry.translations)).join('') : '<span class="word word-phrase">(no phrases) (Search on dictionaries!)</span>';
        let noteIDField: string | undefined = (entry.noteID) ? `<span class="word word-noteid">${entry.noteID}</span>` : undefined;
        if (noteIDField === undefined) throw new Error('Invalid note ID');
        let tagsField: string | undefined = (entry.tags && entry.tags.length > 0) ? entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ') : undefined;

        let usuallyInKana: boolean = entry.translations.every((translation) => translation.notes && translation.notes.includes('Usually written using kana alone'));

        return { note: `${(kanjiFormsField !== noKanjiForms && !usuallyInKana) ? kanjiFormsField : readingsField}\t${(kanjiFormsField !== noKanjiForms && !usuallyInKana) ? readingsField : kanjiFormsField}\t${translationsField}\t${kanjiField}\t${phrasesField}\t${noteIDField}${(tagsField) ? `\t${tagsField}` : ''}`.replaceAll('\n', '<br>'), fieldNumber: 7 };
    }

    if ((entry as Radical).radical !== undefined && (entry as Radical).reading !== undefined && (entry as Radical).meanings !== undefined) {
        entry = entry as Radical;

        let radicalField: string = createEntry(`<span class="radical radical-character">${entry.radical}</span>`);
        let readingField: string = createEntry(`<span class="radical radical-reading">${entry.reading}</span>`);
        let meaningsField: string = entry.meanings.map((meaningEntry: string) => createEntry(`<span class="radical radical-meaning">${meaningEntry}</span>`)).join('');
        let mnemonicField: string = (entry.mnemonic) ? createEntry(`<span class="radical radical-mnemonic">${entry.mnemonic}</span>`) : '<span class="radical radical-mnemonic">(no mnemonic) (Come up with your own!)</span>';
        let kanjiField: string = (entry.kanji) ? entry.kanji.map((kanji: Kanji) => createEntry(`<span class="radical radical-kanji">${kanji.kanji}${(kanji.meanings && kanji.meanings.length === 1) ? ` - ${kanji.meanings[0]}` : ''}</span>`)).join('') : '<span class="radical radical-kanji">(no "used-in" kanji)</span>';
        let strokesField: string = (entry.strokes) ? createEntry(`<span class="radical radical-strokes">${entry.strokes}<br>${(entry.svg) ? `<img class="radical radical-stroke-order" src="${entry.svg}" alt="${entry.radical} stroke order SVG">` : '(no stroke order SVG available)'}</span>`) : '<span class="radical radical-strokes">(no stroke number)</span>';
        let noteIDField: string | undefined = (entry.noteID) ? `<span class="radical radical-noteid">${entry.noteID}</span>` : undefined;
        if (noteIDField === undefined) throw new Error('Invalid note ID');
        let tagsField: string | undefined = (entry.tags && entry.tags.length > 0) ? entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ') : undefined;

        return { note: `${radicalField}\t${readingField}\t${meaningsField}\t${mnemonicField}\t${kanjiField}\t${strokesField}\t${noteIDField}${(tagsField) ? `\t${tagsField}` : ''}`.replaceAll('\n', '<br>'), fieldNumber: 8 };
    }

    if ((entry as Kanji).kanji !== undefined) {
        entry = entry as Kanji;

        let kanjiField: string = createEntry(`<span class="kanji kanji-character">${entry.kanji}</span>`);
        let meaningsField: string = (entry.meanings) ? entry.meanings.map((meaningEntry: string) => createEntry(`<span class="kanji kanji-meaning">${meaningEntry}</span>`)).join('') : '<span class="kanji kanji-meaning">(no meanings)</span>';
        let onyomiField: string = (entry.onyomi) ? entry.onyomi.map((onyomiEntry: string) => createEntry(`<span class="kanji kanji-onyomi">${onyomiEntry}</span>`)).join('') : '<span class="kanji kanji-onyomi">(no onyomi) (kokuji)</span>';
        let kunyomiField: string = (entry.kunyomi) ? entry.kunyomi.map((kunyomiEntry: string) => createEntry(`<span class="kanji kanji-kunyomi">${kunyomiEntry}</span>`)).join('') : '<span class="kanji kanji-kunyomi">(no kunyomi)</span>';
        let componentsField: string = (entry.components) ? entry.components.map((componentEntry: KanjiComponent) => createEntry(`<span class="kanji kanji-component">${componentEntry.component}${(componentEntry.meaning) ? ` - ${componentEntry.meaning}` : ''}</span>`)).join('') : '<span class="kanji kanji-component">(no components)</span>';
        let mnemonicField: string = (entry.mnemonic) ? createEntry(`<span class="kanji kanji-mnemonic">${entry.mnemonic}</span>`) : '<span class="kanji kanji-mnemonic">(no mnemonic) (Come up with your own!)</span>';
        let wordsField: string = (entry.words) ? entry.words.filter((word: Word) => (word.kanjiForms && word.kanjiForms.length === 1) && word.readings.length === 1 && word.translations.length === 1).map((word: Word) => createEntry(`<span class="kanji kanji-words">${word.kanjiForms![0]!.kanjiForm} / ${word.readings[0]!.reading} - ${word.translations[0]!.translation}</span>`)).join('') : '<span class="kanji kanji-words">(no words) (Search on dictionaries!)</span>';
        let strokesField: string = (entry.strokes) ? createEntry(`<span class="kanji kanji-strokes">${entry.strokes}<br>${(entry.svg) ? `<img class="kanji kanji-stroke-order" src="${entry.svg}" alt="${entry.kanji} stroke order SVG">` : '(no stroke order SVG available)'}</span>`) : '<span class="kanji kanji-strokes">(no stroke number)</span>';
        let noteIDField: string | undefined = (entry.noteID) ? `<span class="kanji kanji-noteid">${entry.noteID}</span>` : undefined;
        if (noteIDField === undefined) throw new Error('Invalid note ID');
        let tagsField: string | undefined = (entry.tags && entry.tags.length > 0) ? entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ') : undefined;

        return { note: `${kanjiField}\t${meaningsField}\t${onyomiField}\t${kunyomiField}\t${componentsField}\t${mnemonicField}\t${wordsField}\t${strokesField}\t${noteIDField}${(tagsField) ? `\t${tagsField}` : ''}`.replaceAll('\n', '<br>'), fieldNumber: 10 };
    }

    if ((entry as Kana).kana !== undefined && (entry as Kana).reading !== undefined) {
        entry = entry as Kana;

        let kanaField: string = createEntry(`<span class="kana kana-character">${entry.kana}</span>`);
        let readingField: string = createEntry(`<span class="kana kana-reading">${entry.reading}${(entry.audio !== undefined) ? `<br>[sound:${entry.audio}]` : ''}<br>${(entry.svg) ? `<img class="kana kana-stroke-order" src="${entry.svg}" alt="${entry.kana} stroke order SVG">` : '(no stroke order SVG available)'}</span>`);
        let noteIDField: string | undefined = (entry.noteID) ? `<span class="kana kana-noteid">${entry.noteID}</span>` : undefined;
        if (noteIDField === undefined) throw new Error('Invalid note ID');
        let tagsField: string | undefined = (entry.tags && entry.tags.length > 0) ? entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ') : undefined;

        return { note: `${kanaField}\t${readingField}\t${noteIDField}${(tagsField) ? `\t${tagsField}` : ''}`.replaceAll('\n', '<br>'), fieldNumber: 4 };
    }

    if ((entry as Grammar).point !== undefined && (entry as Grammar).meaning !== undefined) {
        entry = entry as Grammar;

        let pointField: string = createEntry(`<span class="grammar grammar-point">${entry.point}</span>`);
        let readingField: string = (entry.readings) ? entry.readings.map((readingEntry: Reading) => createEntry(`<span class="grammar grammar-reading">${readingEntry.reading}</span>`)).join('') : '<span class="grammar grammar-reading">(no additional readings)</span>';
        let meaningField: string = createEntry(`<span class="grammar grammar-meaning">${entry.meaning.meaning}${(entry.meaning.example && entry.meaning.example.length > 0) ? `<br><span class="grammar grammar-meaning-example">${entry.meaning.example}</span>` : ''}</span>`);
        let usageField: string = (entry.usages) ? entry.usages.map((usage) => createEntry(`<span class="grammar grammar-usage">${usage}</span>`)).join('') : '<span class="grammar grammar-usage">(no usages)</span>';
        let phrasesField: string = (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="grammar grammar-phrase">${phraseEntry.phrase}</span>`, phraseEntry.translations)).join('') : '<span class="grammar grammar-phrase">(no phrases) (Search on dictionaries!)</span>';
        let noteIDField: string | undefined = (entry.noteID) ? `<span class="grammar grammar-noteid">${entry.noteID}</span>` : undefined;
        if (noteIDField === undefined) throw new Error('Invalid note ID');
        let tagsField: string | undefined = (entry.tags && entry.tags.length > 0) ? entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ') : undefined;

        return { note: `${pointField}\t${readingField}\t${meaningField}\t${usageField}\t${phrasesField}\t${noteIDField}${(tagsField) ? `\t${tagsField}` : ''}`, fieldNumber: 7 };
    }

    throw new Error('Invalid entry');
}

export function generateAnkiNotesFile(list: Result[]): string | undefined {
    list = list.filter((result: Result) => {
        if ((result as Kanji).kanji !== undefined) if ((result as Kanji).doNotCreateNote === true) return false;

        return true;
    });

    if (list.length > 0) {
        let headers: string[] = ['#separator:tab\n', '#html:true\n'];
        let ankiNotes: string = list.map((result: Result) => {
            let note: Note = generateAnkiNote(result);
            if (headers.length === 2) headers.push(`#tags column:${note.fieldNumber}\n`);

            return note.note;
        }).join('\n').trim();

        if (ankiNotes.length === 0) throw new Error('Invalid list');

        return `${headers.join('')}${ankiNotes}`;
    } else console.log('No entries available for Anki notes creation');

    return undefined;
}