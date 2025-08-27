import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';

import { deckName, dictsDir, dictsNames, fileNames, kanjiInfoFile, noteMap, noteTypes, notSearchedForms, radicalInfoFile, regexps, resultPaths, subDeckNames, svgDir } from './constants';
import { PollyClient, SynthesizeSpeechCommand, SynthesizeSpeechCommandOutput } from '@aws-sdk/client-polly';
import libxml from 'libxmljs2';
import xml from 'xml2js';
import iconv from 'iconv-lite';
import { randomUUID, UUID } from 'crypto';

const Kuroshiro = require('kuroshiro');
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

export type JLPT = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type DictName = 'JMDict' | 'Kanjidic' | 'tanaka' | 'radk' | 'krad';

export interface DictKanjiForm {
    form: string;
    notes?: string[] | undefined;
    commonness?: string[] | undefined;
}

export interface DictReading {
    reading: string;
    notes?: string[] | undefined;
    commonness?: string[] | undefined;
    kanjiFormRestrictions?: string[] | undefined;
}
export interface DictMeaning {
    partOfSpeech?: string[] | undefined;
    translations?: (string | { translation: string, type: 'lit' | 'expl' | 'tm' })[] | undefined;
    references?: string[] | undefined;
    kanjiFormRestrictions?: string[] | undefined;
    readingRestrictions?: string[] | undefined;
    antonyms?: string[] | undefined;
    fields?: string[] | undefined;
    info?: string[] | undefined
    misc?: string[] | undefined;
    dialects?: string[] | undefined;
}

export interface DictWord {
    id: string;
    kanjiForms?: DictKanjiForm[] | undefined;
    readings: DictReading[];
    meanings: DictMeaning[];
}

export interface DictKanjiMisc {
    strokeNumber: string;
    jlpt?: string | undefined;
}

export interface DictKanjiReading {
    reading: string;
    type: 'ja_on' | 'ja_kun';
}

export interface DictKanjiReadingMeaningGroup {
    readings: DictKanjiReading[];
    meanings: string[];
}

export interface DictKanjiReadingMeaning {
    groups: DictKanjiReadingMeaningGroup[];
    nanori?: string[] | undefined;
}

export interface DictKanji {
    kanji: string;
    misc?: DictKanjiMisc | undefined;
    readingMeaning: DictKanjiReadingMeaning[];
}

export interface DictRadical {
    radical: string;
    kanji: DictKanji[];
    strokes: string;
}

export interface DictKanjiWithRadicals {
    kanji: string;
    radicals: (DictKanji | string)[];
}

export interface ExamplePart {
    baseForm: string;
    reading?: string | undefined;
    glossNumber?: number | undefined;
    inflectedForm?: string | undefined;
    referenceID?: string | undefined
    edited?: true | undefined;
}

export interface TanakaExample {
    phrase: string;
    translation: string;
    parts: ExamplePart[];
    furigana?: string | undefined;
}

export type Dict = DictWord[] | DictKanji[] | TanakaExample[] | DictRadical[] | DictKanjiWithRadicals[];

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
    noteID?: `kanji_${string}` | undefined;
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
    noteID?: `radical_${string}` | undefined;
}

export interface Phrase {
    phrase: string;
    translation: string;
    originalPhrase: string;
}

export interface Word {
    id?: string | undefined;
    readings: Reading[];
    translations?: Translation[];
    kanjiForms?: KanjiForm[] | undefined;
    kanji?: Kanji[] | undefined;
    phrases?: Phrase[] | undefined;
    image?: string | undefined;
    common?: true | undefined;
    tags?: string[] | undefined;
    noteID?: `word_${string}` | undefined;
}

export interface Kana {
    kana: string;
    reading: string;
    audio?: string | undefined;
    svg?: string | undefined;
    tags?: string[] | undefined;
    id?: string | undefined;
    noteID?: `kana_${string}` | undefined;
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
    noteID?: `grammar_${string}` | undefined;
}

export type Result = Word | Kanji | Radical | Kana | Grammar;

export interface SubDeckNames {
    kana: {
        '_': string;
        hiragana: string;
        hiraganaExtended: string;
        katakana: string;
        katakanaExtended: string;
    };
    jlpt: {
        '_': string;
        kanji: {
            '_': string;
            n5: string;
            n4: string;
            n3: string;
            n2: string;
            n1: string;
        };
        vocab: {
            '_': string;
            n5: string;
            n4: string;
            n3: string;
            n2: string;
            n1: string;
        };
    };
    grammar: {
        '_': string;
        n5: string;
        n4: string;
        n3: string;
        n2: string;
        n1: string;
        additional: string;
    };
    radicals: { '_': string };
    kanaWords: { '_': string };
    extraKanji: {
        '_': string;
        kanji: string;
        vocab: string;
    };
}

export interface NoteTypes {
    grammar: string;
    kana: string;
    kanji: string;
    radical: string;
    word: string;
}

export function capitalizeFirstLetter(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isValidArray(arg: any): arg is any[] {
    return arg !== null && arg !== undefined && Array.isArray(arg);
}

export function isValidArrayWithFirstElement(arg: any): arg is any[] {
    return arg !== null && arg !== undefined && Array.isArray(arg) && arg[0] !== null && arg[0] !== undefined;
}

export function isStringArray(arg: any): arg is string[] {
    return arg !== null && arg !== undefined && Array.isArray(arg) && arg.every((element: any) => typeof element === 'string');
}

export function shuffleArray<T>(arr: T[]): T[] {
    const a: T[] = arr.slice();

    for (let i: number = a.length - 1; i > 0; i--) {
        const j: number = Math.floor(Math.random() * (i + 1));
        const tmp: T | undefined = a[i];
        const tmp2: T | undefined = a[j];

        if (!tmp || !tmp2) throw new Error('Invalid array');

        a[i] = tmp2;
        a[j] = tmp;
    }

    return a;
}

export async function convertDicts(): Promise<void> {
    return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
        try {
            const dicts: string[] = readdirSync(dictsDir, 'utf-8');

            if (!existsSync(`${dictsDir}/json`)) mkdirSync(`${dictsDir}/json`, { recursive: true });

            console.log('Converting dictionary files');

            for (const dict of dicts.filter((file: string) => path.parse(file).ext.toLowerCase() === '.xml')) {
                if (existsSync(`${dictsDir}/json/${path.parse(dict).name}.json`)) { console.log(`Already converted ${dict}`); continue; }

                console.log(`Converting ${dict}`);

                const dictParsed: libxml.Document = libxml.parseXml(readFileSync(`${dictsDir}/${dict}`, 'utf-8'), { dtdvalid: true, nonet: false, noent: true, recover: false });

                xml.parseString(dictParsed, (err: Error | null, result: any) => {
                    if (err) console.log(err);

                    if (dict === 'JMdict_e.xml') {
                        const dictObj: DictWord[] = [];

                        if (result.JMdict && typeof result.JMdict === 'object' && isValidArray(result.JMdict.entry))
                            for (const entry of result.JMdict.entry) {
                                const entryObj: DictWord = {
                                    id: '',
                                    readings: [],
                                    meanings: []
                                }

                                const kanjiForms: any = entry.k_ele;
                                const readings: any = entry.r_ele;
                                const meanings: any = entry.sense;

                                if (isValidArray(entry.ent_seq) && entry.ent_seq[0] && typeof entry.ent_seq[0] === 'string') entryObj.id = entry.ent_seq[0];

                                if (isValidArray(kanjiForms)) {
                                    entryObj.kanjiForms = [];

                                    for (const kanjiForm of kanjiForms) {
                                        const form: DictKanjiForm = { form: '' };

                                        if (isValidArrayWithFirstElement(kanjiForm.keb) && typeof kanjiForm.keb[0] === 'string') form.form = kanjiForm.keb[0];
                                        if (isStringArray(kanjiForm.ke_inf)) form.notes = kanjiForm.ke_inf;
                                        if (isStringArray(kanjiForm.ke_pri)) form.commonness = kanjiForm.ke_pri;

                                        if (form.form.length > 0) entryObj.kanjiForms.push(form);
                                    }
                                }

                                if (isValidArray(readings))
                                    for (const reading of readings) {
                                        const readingObj: DictReading = { reading: '' };

                                        if (isValidArrayWithFirstElement(reading.reb) && typeof reading.reb[0] === 'string') readingObj.reading = reading.reb[0];
                                        if (isStringArray(reading.re_inf)) readingObj.notes = reading.re_inf;
                                        if (isStringArray(reading.re_pri)) readingObj.commonness = reading.re_pri;
                                        if (isStringArray(reading.re_restr)) readingObj.kanjiFormRestrictions = reading.re_restr;

                                        if (readingObj.reading.length > 0) entryObj.readings.push(readingObj);
                                    }

                                if (isValidArray(meanings))
                                    for (const meaning of meanings) {
                                        const meaningObj: DictMeaning = {};

                                        if (isStringArray(meaning.pos)) meaningObj.partOfSpeech = meaning.pos;
                                        if (isValidArray(meaning.gloss)) {
                                            meaningObj.translations = [];

                                            for (const gloss of meaning.gloss)
                                                if (typeof gloss === 'string') meaningObj.translations.push(gloss);
                                                else if (typeof gloss === 'object' && gloss._ && typeof gloss._ === 'string' && gloss.$ && typeof gloss.$ === 'object' && gloss.$.g_type && (gloss.$.g_type === 'lit' || gloss.$.g_type === 'expl' || gloss.$.g_type === 'tm')) meaningObj.translations.push({ translation: gloss._, type: gloss.$.g_type });
                                        }
                                        if (isStringArray(meaning.xref)) meaningObj.references = meaning.xref;
                                        if (isStringArray(meaning.stagk)) meaningObj.kanjiFormRestrictions = meaning.stagk;
                                        if (isStringArray(meaning.stagr)) meaningObj.readingRestrictions = meaning.stagr;
                                        if (isStringArray(meaning.ant)) meaningObj.antonyms = meaning.ant;
                                        if (isStringArray(meaning.field)) meaningObj.fields = meaning.field;
                                        if (isStringArray(meaning.s_inf)) meaningObj.info = meaning.s_inf;
                                        if (isStringArray(meaning.misc)) meaningObj.misc = meaning.misc;
                                        if (isStringArray(meaning.dial)) meaningObj.dialects = meaning.dial;

                                        if ((meaningObj.partOfSpeech && meaningObj.partOfSpeech.length > 0) || (meaningObj.translations && meaningObj.translations.length > 0)) entryObj.meanings.push(meaningObj);
                                    }

                                if (entryObj.id.length > 0 && entryObj.readings.length > 0 && entryObj.meanings.length > 0) dictObj.push(entryObj);
                            }

                        if (dictObj.length > 0) writeFileSync(`${dictsDir}/json/${path.parse(dict).name}.json`, JSON.stringify(dictObj, undefined, '\t'), 'utf-8');

                        writeFileSync(`${dictsDir}/json/${path.parse(dict).name}-raw.json`, JSON.stringify(result, undefined, '\t'), 'utf-8');
                    } else if (dict === 'kanjidic2.xml') {
                        const dictObj: DictKanji[] = [];

                        if (result.kanjidic2 && typeof result.kanjidic2 === 'object' && isValidArray(result.kanjidic2.character))
                            for (const entry of result.kanjidic2.character) {
                                const kanjiObj: DictKanji = {
                                    kanji: '',
                                    misc: {
                                        strokeNumber: ''
                                    },
                                    readingMeaning: []
                                }

                                if (isValidArrayWithFirstElement(entry.literal) && typeof entry.literal[0] === 'string') kanjiObj.kanji = entry.literal[0];

                                if (isValidArrayWithFirstElement(entry.misc) && typeof entry.misc[0] === 'object') {
                                    const misc: any = entry.misc[0];

                                    kanjiObj.misc = { strokeNumber: '' };

                                    if (isValidArrayWithFirstElement(misc.stroke_count) && typeof misc.stroke_count[0] === 'string') kanjiObj.misc.strokeNumber = misc.stroke_count[0];
                                    if (isValidArrayWithFirstElement(misc.jlpt) && typeof misc.jlpt[0] === 'string') kanjiObj.misc.jlpt = misc.jlpt[0];
                                }

                                if (isValidArray(entry.reading_meaning))
                                    for (const rm of entry.reading_meaning) {
                                        const rmObj: DictKanjiReadingMeaning = { groups: [] };

                                        if (isValidArray(rm.rmgroup))
                                            for (const group of rm.rmgroup) {
                                                const groupObj: DictKanjiReadingMeaningGroup = { readings: [], meanings: [] };

                                                if (isValidArray(group.reading))
                                                    for (const reading of group.reading)
                                                        if (reading._ && typeof reading._ === 'string' && reading.$ && typeof reading.$ === 'object' && reading.$.r_type && (reading.$.r_type === 'ja_on' || reading.$.r_type === 'ja_kun')) groupObj.readings.push({ reading: reading._, type: reading.$.r_type });

                                                if (isValidArray(group.meaning))
                                                    for (const meaning of group.meaning) if (typeof meaning === 'string') groupObj.meanings.push(meaning);

                                                if (groupObj.readings.length > 0 || groupObj.meanings.length > 0) rmObj.groups.push(groupObj);
                                            }

                                        if (isStringArray(rm.nanori)) rmObj.nanori = rm.nanori;

                                        if (rmObj.groups.length > 0) kanjiObj.readingMeaning.push(rmObj);
                                    }

                                if (kanjiObj.kanji.length > 0) dictObj.push(kanjiObj);
                            }

                        if (dictObj.length > 0) writeFileSync(`${dictsDir}/json/${path.parse(dict).name}.json`, JSON.stringify(dictObj, undefined, '\t'), 'utf-8');

                        writeFileSync(`${dictsDir}/json/${path.parse(dict).name}-raw.json`, JSON.stringify(result, undefined, '\t'), 'utf-8');
                    }
                });
            }

            const tanakaPath: string = `${dictsDir}/examples.utf`;

            const tanakaArray: TanakaExample[] = [];

            if (existsSync(`${dictsDir}/json/tanaka_examples.json`)) console.log('Already converted examples.utf');
            else if (existsSync(tanakaPath)) {
                console.log('Converting examples.utf');

                const tanakaParsed: string[] = readFileSync(tanakaPath, 'utf-8').split('\n');

                const kuroshiro: any = new Kuroshiro.default();
                await kuroshiro.init(new KuromojiAnalyzer());

                const convert: any = kuroshiro.convert.bind(kuroshiro);

                for (let i = 0; i <= tanakaParsed.length; i += 2) {
                    let a: string | undefined = tanakaParsed[i];
                    let b: string | undefined = tanakaParsed[i + 1];

                    if (a && b && a.startsWith('A: ') && b.startsWith('B: ')) {
                        a = a.replace('A: ', '').replace(regexps.tanakaID, '');
                        b = b.replace('B: ', '');

                        const aParts: string[] = a.split('\t');
                        const bParts: ExamplePart[] = b.split(' ').filter((part: string) => part.trim().length !== 0).map((part: string) => {
                            const partMatches: RegExpExecArray | null = regexps.tanakaPart.exec(part);
                            if (!partMatches || !partMatches.groups || partMatches.length === 0) throw new Error(`Invalid B part: ${part}`);

                            const baseForm: string | undefined = partMatches.groups['base'];
                            if (!baseForm) throw new Error(`Invalid base form of B part: ${part}`);

                            const examplePart: ExamplePart = { baseForm: baseForm };

                            const reading: string | undefined = partMatches.groups['reading'];
                            const glossNumber: string | undefined = partMatches.groups['glossnum'];
                            const inflectedForm: string | undefined = partMatches.groups['inflection'];

                            if (reading) if (regexps.tanakaReferenceID.test(reading)) {
                                const referenceID: RegExpExecArray | null = regexps.tanakaReferenceID.exec(reading);
                                if (!referenceID) throw new Error(`Invalid reference ID: ${reading}`);

                                examplePart.referenceID = referenceID[0];
                            } else examplePart.reading = reading;

                            if (glossNumber) examplePart.glossNumber = (glossNumber.startsWith('0')) ? Number.parseInt(glossNumber.substring(1)) : Number.parseInt(glossNumber);
                            if (inflectedForm) examplePart.inflectedForm = inflectedForm;
                            if (baseForm.endsWith('~')) { examplePart.edited = true; examplePart.baseForm = examplePart.baseForm.replace('~', ''); }

                            return examplePart;
                        })

                        const phrase: string | undefined = aParts[0];
                        const translation: string | undefined = aParts[1];

                        if (phrase && translation) {
                            let furigana: string | undefined = undefined;

                            if (!phrase.includes('・')) furigana = (await convert(phrase, { to: 'hiragana', mode: 'furigana' })) as string;

                            tanakaArray.push({ phrase: phrase, translation: translation, parts: bParts, ...(furigana) ? { furigana: furigana } : {} });
                        }
                    }
                }

                if (tanakaArray.length > 0) writeFileSync(`${dictsDir}/json/tanaka_examples.json`, JSON.stringify(tanakaArray, undefined, '\t'), 'utf-8');
            }

            const kanjiDict: DictKanji[] = JSON.parse(readFileSync(`${dictsDir}/json/kanjidic2.json`, 'utf-8')) as DictKanji[];

            const radkfile2Path: string = `${dictsDir}/kradzip/radkfile2`;

            const radicals: DictRadical[] = [];

            if (existsSync(`${dictsDir}/json/radkfile2.json`)) console.log('Already converted radkfile2');
            else if (existsSync(radkfile2Path)) {
                console.log('Converting radkfile2');

                const radfileBuffer: NonSharedBuffer = readFileSync(radkfile2Path);
                const fileParsed: string[] = iconv.decode(radfileBuffer, 'euc-jp').split('\n').filter((line: string) => !line.startsWith('#'));

                for (let i = 0; i <= fileParsed.length; i++) {
                    const line: string | undefined = fileParsed[i];
                    if (!line) continue;

                    const radical: DictRadical = { radical: '', kanji: [], strokes: '' };

                    if (line.startsWith('$ ')) {
                        radical.radical = line.charAt(2);
                        radical.strokes = line.substring(4);

                        let j: number = i + 1;
                        let kanjiLine: string | undefined = fileParsed[j];
                        if (!kanjiLine) continue;

                        while (kanjiLine && !kanjiLine.startsWith('$ ')) {
                            const kanjis: string[] = kanjiLine.split('');

                            for (const kanji of kanjis) {
                                const foundKanji: DictKanji | undefined = kanjiDict.find((dictKanji: DictKanji) => dictKanji.kanji === kanji);
                                if (!foundKanji) throw new Error('Kanji not found');

                                radical.kanji.push(foundKanji);
                            }

                            j++;
                            kanjiLine = fileParsed[j];
                            if (!kanjiLine) continue;

                            if (kanjiLine.startsWith('$ ')) i = j - 1;
                        }
                    }

                    if (radical.radical.length > 0 && radical.strokes.length > 0 && radical.kanji.length > 0) radicals.push(radical);
                }

                if (radicals.length > 0) writeFileSync(`${dictsDir}/json/radkfile2.json`, JSON.stringify(radicals, undefined, '\t'), 'utf-8');
            }

            const kradfile2Path: string = `${dictsDir}/kradzip/kradfile2`;

            const kanjiWithRadicals: DictKanjiWithRadicals[] = [];

            if (existsSync(`${dictsDir}/json/kradfile2.json`)) console.log('Already converted kradfile2');
            else if (existsSync(kradfile2Path)) {
                console.log('Converting kradfile2');

                const kradfileBuffer: NonSharedBuffer = readFileSync(kradfile2Path);
                const fileParsed: string[] = iconv.decode(kradfileBuffer, 'euc-jp').split('\n').filter((line: string) => !line.startsWith('#'));

                const katakana: Kana[] = [];

                loadEntries(resultPaths.kana, 'katakana', katakana);

                for (const line of fileParsed) {
                    if (line.length === 0) continue;

                    const kanji: DictKanjiWithRadicals = { kanji: '', radicals: [] };

                    const split: string[] = line.split(' : ');

                    const kanjiChar: string | undefined = split[0];
                    const radicalsRow: string | undefined = split[1];

                    if (kanjiChar && radicalsRow && kanjiChar.length === 1 && radicalsRow.length > 0) {
                        kanji.kanji = kanjiChar;

                        const radicals: string[] = radicalsRow.split(' ');

                        for (const radical of radicals) {
                            let foundRadical: DictKanji | undefined = kanjiDict.find((dictKanji: DictKanji) => dictKanji.kanji === radical);

                            if (!foundRadical) {
                                const katakanaChar: Kana | undefined = katakana.find((kana: Kana) => kana.kana === radical);
                                if (!katakanaChar) continue;

                                foundRadical = { kanji: katakanaChar.kana, readingMeaning: [{ groups: [{ readings: [{ reading: katakanaChar.kana, type: 'ja_on' }], meanings: [katakanaChar.reading] }] }] };
                            }

                            kanji.radicals.push((foundRadical) ? foundRadical : radical);
                        }
                    }

                    if (kanji.kanji.length === 1 && kanji.radicals.length > 0) kanjiWithRadicals.push(kanji);
                }
            }

            if (kanjiWithRadicals.length > 0) writeFileSync(`${dictsDir}/json/kradfile2.json`, JSON.stringify(kanjiWithRadicals, undefined, '\t'), 'utf-8');

            resolve();
        } catch (err: unknown) {
            reject(err);
        }
    });
}

export function getDict(dict: DictName): Dict {
    try {
        let name: string = '';

        switch (dict) {
            case 'JMDict':
                name = dictsNames.jmdict;
                break;
            case 'Kanjidic':
                name = dictsNames.kanjidic;
                break;
            case 'tanaka':
                name = dictsNames.tanaka;
                break;
            case 'radk':
                name = dictsNames.radk;
                break;
            case 'krad':
                name = dictsNames.krad;
                break;
        }

        const dictPath: string = `${dictsDir}/json/${name}.json`;

        if (existsSync(dictPath)) {
            const content: string = readFileSync(dictPath, 'utf-8');

            if (content.length > 0) {
                const obj: any = JSON.parse(content);

                if (isValidArray(obj)) return obj as Dict;
                else throw new Error(`Invalid ${dict} file`);
            } else throw new Error(`Empty ${dict} file`);
        } else throw new Error(`${dict} file does not exist`);
    } catch (err) {
        throw err;
    }
}

export async function synthesizeSpeech(client: PollyClient, text: string, outputFile: string): Promise<void> {
    return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
        try {
            const command: SynthesizeSpeechCommand = new SynthesizeSpeechCommand({
                Text: text,
                TextType: 'ssml',
                OutputFormat: "mp3",
                VoiceId: 'Tomoko',
                Engine: 'neural',
                LanguageCode: "ja-JP",
            });

            const response: SynthesizeSpeechCommandOutput = await client.send(command);

            if (response.AudioStream) {
                const stream: Buffer<ArrayBuffer> = Buffer.from(await response.AudioStream.transformToByteArray());

                await writeFile(outputFile, stream);
                console.log(`Audio saved as ${outputFile}`);
            }

            resolve();
        } catch (err: unknown) {
            reject(err);
        }
    })
}

export async function generateAudio(client: PollyClient): Promise<void> {
    const getCharType: (char: string) => "kanji" | "hiragana" | "katakana" | "other" = (char: string): 'kanji' | 'hiragana' | 'katakana' | 'other' => {
        if (regexps.kanji.test(char)) return 'kanji';
        if (regexps.hiragana.test(char)) return 'hiragana';
        if (regexps.katakana.test(char)) return 'katakana';
        return 'other';
    };

    const splitByScript: (text: string) => string[] = (text: string): string[] => text.match(regexps.scriptSplit) || [];
    const convertToHiragana: (str: string) => string = (str: string): string => str.replace(regexps.katakana, (c: string) => String.fromCharCode(c.charCodeAt(0) - 0x60));

    const romajiMap: Record<string, string> = {
        A: 'エー', B: 'ビー', C: 'シー', D: 'ディー', E: 'イー', F: 'エフ',
        G: 'ジー', H: 'エイチ', I: 'アイ', J: 'ジェー', K: 'ケー', L: 'エル',
        M: 'エム', N: 'エヌ', O: 'オー', P: 'ピー', Q: 'キュー', R: 'アール',
        S: 'エス', T: 'ティー', U: 'ユー', V: 'ブイ', W: 'ダブリュー', X: 'エックス',
        Y: 'ワイ', Z: 'ゼット'
    };

    const numberMap: Record<string, string> = {
        '0': 'ゼロ', '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン',
        '5': 'ゴ', '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ'
    };

    const symbolMap: Record<string, string> = {
        '＄': 'ドル', '%': 'パーセント', '¥': 'エン', '#': 'シャープ',
        '@': 'アット', '&': 'アンド'
    };

    const convertOtherToKatakana: (str: string) => string = (str: string): string => str.split('').map((c: string) => {
        if (romajiMap[c.toUpperCase()]) return romajiMap[c.toUpperCase()];
        if (numberMap[c]) return numberMap[c];
        if (symbolMap[c]) return symbolMap[c];
        return c;
    }).join('');

    function makeSSML(formText: string, fullReading: string): string {
        let ssml: string = '';

        const allTypes: ("kanji" | "hiragana" | "katakana" | "other")[] = Array.from(formText).map((c: string) => getCharType(c));
        const uniqueTypes: ("kanji" | "hiragana" | "katakana" | "other")[] = Array.from(new Set(allTypes));

        if (uniqueTypes.length === 1) switch (uniqueTypes[0]) {
            case 'kanji':
                ssml = `<speak><phoneme alphabet="x-amazon-yomigana" ph="${fullReading}">${formText}</phoneme></speak>`;

                break;
            case 'katakana':
                ssml = `<speak><phoneme alphabet="x-amazon-pron-kana" ph="${formText}">${formText}</phoneme></speak>`;

                break;
            case 'hiragana':
            default:
                ssml = `<speak>${formText}</speak>`;
        }
        else {
            const segments: string[] = splitByScript(formText);
            let pureKanjiReading: string = convertToHiragana(fullReading);

            segments.forEach((seg: string) => {
                const type: "kanji" | "hiragana" | "katakana" | "other" = getCharType(seg[0]!);

                if (type !== 'kanji') {
                    const converted: string = (type === 'other') ? convertToHiragana(convertOtherToKatakana(seg)) : convertToHiragana(seg);

                    pureKanjiReading = pureKanjiReading.replace(converted, '');
                }
            });

            const kanjiSegments: string[] = segments.filter((seg: string) => getCharType(seg[0]!) === 'kanji');
            let readingPointer: number = 0;
            let kanjiIndex: number = 0;

            const ssmlSegments: string[] = segments.map((seg: string) => {
                const type: "kanji" | "hiragana" | "katakana" | "other" = getCharType(seg[0]!);

                if (type === 'kanji') {
                    const expectedLength: number = pureKanjiReading.length / kanjiSegments.length;
                    const allocated: string = pureKanjiReading.slice(readingPointer, readingPointer + Math.ceil(expectedLength));

                    readingPointer += allocated.length;
                    kanjiIndex++;

                    return `<phoneme alphabet="x-amazon-yomigana" ph="${allocated}">${seg}</phoneme>`;
                } else if (type === 'katakana') return `<phoneme alphabet="x-amazon-pron-kana" ph="${seg}">${seg}</phoneme>`;
                else if (type === 'other') {
                    const katakanaReading: string = convertOtherToKatakana(seg);

                    return `<phoneme alphabet="x-amazon-pron-kana" ph="${katakanaReading}">${seg}</phoneme>`;
                } else return seg;
            });

            ssml = `<speak>${ssmlSegments.join('')}</speak>`;
        }

        return ssml;
    }

    return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
        try {
            let count: number = 0;

            for (const kanaPath of fileNames.kana) {
                const kana: Kana[] = [];
                loadEntries(resultPaths.kana, kanaPath, kana);

                for (const char of kana) {
                    const ssml: string = makeSSML(char.kana.replace("/", "・"), char.kana.replace("/", "・"));

                    const id: UUID = randomUUID();

                    await synthesizeSpeech(client, ssml, `${resultPaths.kana}/${id}.mp3`).catch((err: any) => { throw err; });

                    char.audio = `${id}.mp3`;

                    count++;

                    if (count === 40) await new Promise((resolve: (value: unknown) => void) => {
                        count = 0;
                        setTimeout(resolve, 1000);
                    });

                    kana[kana.findIndex((kanaChar: Kana) => kanaChar.kana === char.kana)] = char;
                };

                saveEntries(kana, kanaPath, resultPaths.kana);
            }

            for (const vocabPath of fileNames.vocabJLPT) {
                const vocab: Word[] = [];
                loadEntries(resultPaths.vocabJLPT, vocabPath, vocab);

                for (const word of vocab) {
                    if (word.kanjiForms && word.translations && !word.translations.every((translation) => translation.notes && translation.notes.includes('Usually written using kana alone'))) {
                        const form: KanjiForm | undefined = word.kanjiForms[0];
                        const firstReading: Reading | undefined = word.readings[0];

                        if (form && firstReading) {
                            const ssml: string = makeSSML(form.kanjiForm, firstReading.reading);

                            const id: UUID = randomUUID();

                            await synthesizeSpeech(client, ssml, `${resultPaths.vocabJLPT}/${id}.mp3`).catch((err: any) => { throw err; });

                            word.readings[0]!.audio = `${id}.mp3`;

                            count++;

                            if (count === 40) await new Promise((resolve: (value: unknown) => void) => {
                                count = 0;
                                setTimeout(resolve, 1000);
                            });
                        }

                        const restrictedReadings: Reading[] = word.readings.filter((reading: Reading) => reading.notes && reading.notes.some((note: string) => note.startsWith('Reading restricted to ')));

                        for (const rr of restrictedReadings) {
                            const kanjiForm: string | undefined = rr.notes!.find((note: string) => note.startsWith('Reading restricted to '))!.split(' to ')[1];

                            if (kanjiForm) {
                                const ssml: string = makeSSML(kanjiForm, rr.reading);

                                const id: UUID = randomUUID();

                                await synthesizeSpeech(client, ssml, `${resultPaths.vocabJLPT}/${id}.mp3`).catch((err: any) => { throw err; });

                                word.readings[word.readings.findIndex((wordReading: Reading) => wordReading.reading === rr.reading)]!.audio = `${id}.mp3`;

                                count++;

                                if (count === 40) await new Promise((resolve: (value: unknown) => void) => {
                                    count = 0;
                                    setTimeout(resolve, 1000);
                                });
                            }
                        }
                    } else for (const reading of word.readings) {
                        const ssml: string = makeSSML(reading.reading, reading.reading);

                        const id: UUID = randomUUID();

                        await synthesizeSpeech(client, ssml, `${resultPaths.vocabJLPT}/${id}.mp3`).catch((err: any) => { throw err; });

                        word.readings[word.readings.findIndex((wordReading: Reading) => wordReading.reading === reading.reading)]!.audio = `${id}.mp3`;

                        count++;

                        if (count === 40) await new Promise((resolve: (value: unknown) => void) => {
                            count = 0;
                            setTimeout(resolve, 1000);
                        });
                    }

                    vocab[vocab.findIndex((vocabWord: Word) => vocabWord.id === word.id)] = word;
                };

                saveEntries(vocab, vocabPath, resultPaths.vocabJLPT);
            }

            resolve();
        } catch (err: unknown) {
            reject(err);
        }
    });
}

export function saveEntries(list: Result[], filename: string, resultPath: string, withoutNote?: true | undefined): void {
    try {
        if (list.length > 0) {
            if (!filename || filename.trim().length === 0) throw new Error('Invalid filename');
            if (!existsSync(resultPath)) mkdirSync(resultPath, { recursive: true });

            const jsonDir: string = `${resultPath}/json`;
            if (!existsSync(jsonDir)) mkdirSync(jsonDir, { recursive: true });

            writeFileSync(`${jsonDir}/${filename}.json`, JSON.stringify(list, undefined, '\t'), 'utf-8');

            if (withoutNote === undefined) {
                const ankiNotesFile: string | undefined = generateAnkiNotesFile(list, filename);
                if (ankiNotesFile && ankiNotesFile.length > 0) writeFileSync(`${resultPath}/${filename}.txt`, ankiNotesFile, 'utf-8');
            }

            console.log(`Saved ${filename} with ${list.length.toString()} entries\n`);
        }
    } catch (err: unknown) {
        throw err;
    }
}

export function loadEntries(resultPath: string, filename: string | string[], list?: Result[] | undefined, ids?: Set<string> | undefined): void {
    try {
        if (list === undefined && ids === undefined) throw new Error('You must parse either a valid results list or a valid IDs list');

        if (!existsSync(resultPath)) throw new Error(`${resultPath} does not exist`);

        const jsonDir: string = `${resultPath}/json`;
        if (!existsSync(jsonDir)) throw new Error(`${jsonDir} does not exist`);

        function parsePath(filename: string): void {
            const filePath: string = `${jsonDir}/${filename}.json`;

            if (!existsSync(filePath)) return;

            const results: Result[] | null | undefined = JSON.parse(readFileSync(filePath, 'utf-8'));

            if (results && Array.isArray(results) && results.every((result: Result) => typeof result === 'object')) {
                if (list) list.push(...results);

                if (ids) {
                    const resultsWithIDs: Result[] = results.filter((result: Result) => result.id !== undefined);

                    if (resultsWithIDs.length > 0) {
                        const idsList: string[] = resultsWithIDs.map((result: Result) => result.id!);

                        for (const id of idsList) ids.add(id);
                    }
                }
            }
        }

        if (Array.isArray(filename)) for (const name of filename) parsePath(name);
        else if (typeof filename === 'string') parsePath(filename);
    } catch (err: unknown) {
        throw err;
    }
}

export function checkExistenceOfResults(resultPath: string, filename: string | string[], withoutNote?: true | undefined): boolean {
    let exists: boolean = false;

    if (existsSync(resultPath)) {
        if (filename.length === 0) throw new Error('Invalid filename');

        const jsonDir: string = `${resultPath}/json`;

        const files: string[] = readdirSync(resultPath, { encoding: 'utf-8', recursive: false });
        const jsonFiles: string[] = (existsSync(jsonDir)) ? readdirSync(jsonDir, { encoding: 'utf-8', recursive: false }) : [];

        function parsePath(filename: string): boolean {
            let exists: boolean = false;

            const jsonFile: string | undefined = jsonFiles.find((file: string) => path.parse(file).name === filename);

            if (jsonFile) {
                const jsonFileContent: Result[] | null | undefined = JSON.parse(readFileSync(`${jsonDir}/${jsonFile}`, 'utf-8'));

                if (jsonFileContent && Array.isArray(jsonFileContent) && jsonFileContent.every((result: Result) => typeof result === 'object')) {
                    exists = true;

                    if (withoutNote === undefined) {
                        const ankiNotesFile: string | undefined = generateAnkiNotesFile(jsonFileContent, filename);

                        if (ankiNotesFile && ankiNotesFile.length > 0) { writeFileSync(`${resultPath}/${path.parse(jsonFile).name}.txt`, ankiNotesFile, 'utf-8'); };
                    }
                }
            }

            if (files.some((file: string) => filename === path.parse(file).name)) exists = true;

            return exists;
        }

        if (Array.isArray(filename)) exists = filename.every((name: string) => parsePath(name));
        else if (typeof filename === 'string') exists = parsePath(filename);
    }

    return exists;
}

export function lookupWordNote(key: string, notes: string[], tags: string[], required?: boolean | undefined, fallback?: string | undefined) {
    const info: [string, string] | undefined = noteMap.get(key.toLowerCase());

    if (!info) {
        if (required) throw new Error('Invalid note info for ' + key);
        notes.push(fallback ?? key);
        return;
    }

    tags.push(info[0]);
    notes.push(info[1]);
};

export const wordAddNoteArray: (arr: string[] | undefined, cb: (v: string) => void) => void = (arr: string[] | undefined, cb: (v: string) => void) => {
    if (!arr) return;
    for (const v of arr) cb(v);
};

export function getWord(dict?: DictWord[] | undefined, id?: string | undefined, kanjiDic?: DictKanji[] | undefined, examples?: TanakaExample[] | undefined, dictWord?: DictWord | undefined): Word {
    try {
        if (!dictWord && id && dict) dictWord = dict.find((entry) => entry.id === id);

        if (dictWord) {
            const word: Word = { id: dictWord.id, readings: [], translations: [] };

            if (dictWord.kanjiForms) word.kanjiForms = dictWord.kanjiForms.map((dictKanjiForm: DictKanjiForm) => {
                if (dictKanjiForm.commonness && dictKanjiForm.commonness.length > 0 && word.common === undefined) word.common = true;

                return { kanjiForm: dictKanjiForm.form, ...(dictKanjiForm.notes) ? { notes: dictKanjiForm.notes.map((note: string) => capitalizeFirstLetter(note)) } : {} };
            });

            word.readings = dictWord.readings.map((dictReading: DictReading) => {
                if (dictReading.commonness && dictReading.commonness.length > 0 && word.common === undefined) word.common = true;

                return { reading: dictReading.reading, ...(dictReading.kanjiFormRestrictions || dictReading.notes) ? { notes: [...(dictReading.kanjiFormRestrictions) ? dictReading.kanjiFormRestrictions.map((restriction: string) => `Reading restricted to ${restriction}`) : [], ...(dictReading.notes) ? dictReading.notes.map((note: string) => capitalizeFirstLetter(note)) : []] } : {} }
            });

            word.translations = dictWord.meanings.map((dictMeaning: DictMeaning) => {
                if (!dictMeaning.translations) throw new Error(`No translations for ${dictWord!.id}`);

                const translationTypes: string[] = [];
                const translations: string[] = dictMeaning.translations.map((translation: string | { translation: string; type: "lit" | "expl" | "tm"; }) => {
                    if ((typeof translation === 'string')) return translation;
                    else {
                        if (translation.type === 'lit') translationTypes.push('Literal meaning');
                        else if (translation.type === 'expl') translationTypes.push('Explanation');
                        else if (translation.type === 'tm') translationTypes.push('Trademark');

                        return translation.translation;
                    }
                });

                const notes: string[] = [];
                word.tags = [];

                wordAddNoteArray(dictMeaning.kanjiFormRestrictions, (restriction: string) => notes.push(`Meaning restricted to ${restriction}`));
                wordAddNoteArray(dictMeaning.readingRestrictions, (restriction: string) => notes.push(`Meaning restricted to ${restriction}`));
                for (const t of translationTypes) notes.push(t);
                wordAddNoteArray(dictMeaning.partOfSpeech, (pos: string) => lookupWordNote(pos, notes, word.tags!, true));
                wordAddNoteArray(dictMeaning.fields, (field: string) => lookupWordNote(field, notes, word.tags!, false, field));
                wordAddNoteArray(dictMeaning.dialects, (dialect: string) => lookupWordNote(dialect, notes, word.tags!, true));
                wordAddNoteArray(dictMeaning.antonyms, (antonym: string) => notes.push(`Antonym: ${antonym}`));
                wordAddNoteArray(dictMeaning.references, (reference: string) => notes.push(`Related: ${reference}`));
                wordAddNoteArray(dictMeaning.info, (info: string) => lookupWordNote(info, notes, word.tags!, false, info));
                wordAddNoteArray(dictMeaning.misc, (misc: string) => lookupWordNote(misc, notes, word.tags!, false, misc));

                for (let i: number = 0; i < notes.length; i++) notes[i] = capitalizeFirstLetter(notes[i]!);

                return {
                    translation: translations.join('; '),
                    notes: notes
                }
            });

            if (kanjiDic && word.kanjiForms) {
                word.kanji = [];

                for (const kanjiForm of word.kanjiForms) for (const char of kanjiForm.kanjiForm) {
                    if (word.kanji.some((kanji: Kanji) => kanji.kanji === char)) continue;

                    const dictKanji: DictKanji | undefined = kanjiDic.find((kanji: DictKanji) => kanji.kanji === char);

                    if (dictKanji) {
                        const kanjiObj: Kanji = getKanji(dictKanji.kanji, kanjiDic, undefined);

                        word.kanji.push({ kanji: kanjiObj.kanji, ...(kanjiObj.meanings) ? { meanings: kanjiObj.meanings } : {} });
                    }
                }

                if (word.kanji.length === 0) delete word.kanji;
            }

            if (examples) {
                const readings: Set<string> = new Set<string>(word.readings.filter((reading: Reading) => (!reading.notes) || (reading.notes && !reading.notes.some((note: string) => notSearchedForms.has(note)))).map((reading: Reading) => reading.reading));
                const kanjiForms: Set<string> | undefined = (word.kanjiForms) ? new Set<string>(word.kanjiForms.map((kanjiForm: KanjiForm) => kanjiForm.kanjiForm)) : undefined;

                const kanjiFormExamples: TanakaExample[] = [];
                const readingExamples: TanakaExample[] = [];

                if (kanjiForms)
                    for (const example of examples)
                        for (const part of example.parts)
                            if (kanjiForms.has(part.baseForm)) kanjiFormExamples.push(example);

                if (kanjiFormExamples.length === 0)
                    for (const example of examples)
                        for (const part of example.parts) if (readings.has(part.baseForm)) readingExamples.push(example);

                examples = [...kanjiFormExamples, ...readingExamples];

                if (word.translations) {
                    const glossSpecificExamples: TanakaExample[] = [];

                    for (let i: number = 0; i < word.translations.length; i++) {
                        outer: for (const example of examples)
                            for (const part of example.parts)
                                if (part.glossNumber === i + 1) { glossSpecificExamples.push(example); break outer; }

                        if (glossSpecificExamples.length === 5) break;
                    }

                    if (glossSpecificExamples.length === 5) examples = glossSpecificExamples;
                    else if (glossSpecificExamples.length > 0) {
                        const seenPhrases: Set<string> = new Set<string>(glossSpecificExamples.map((ex: TanakaExample) => ex.phrase));

                        examples = [...glossSpecificExamples, ...examples.filter((ex: TanakaExample) => !seenPhrases.has(ex.phrase)).slice(0, 5 - glossSpecificExamples.length)];
                    }
                }

                word.phrases = ((examples.length > 5) ? examples.slice(0, 5) : examples).map((ex: TanakaExample) => ({ phrase: ex.furigana ?? ex.phrase, translation: ex.translation, originalPhrase: ex.phrase }));
            }

            if (word.id) word.noteID = `word_${word.id}`;
            else throw new Error('Invalid word ID');

            return word;
        } else throw new Error(`Word${(id) ? ` ${id}` : ''} not found`);
    } catch (err: unknown) {
        throw err;
    }
}

export function getKanji(kanjiChar: string, dict: DictKanji[], jmDict?: DictWord[] | undefined, svgList?: string[] | undefined): Kanji {
    try {
        const dictKanji: DictKanji | undefined = dict.find((entry: DictKanji) => entry.kanji === kanjiChar);

        if (dictKanji) {
            const kanji: Kanji = { kanji: dictKanji.kanji, ...(dictKanji.misc) ? { strokes: dictKanji.misc.strokeNumber } : {} };

            for (const rm of dictKanji.readingMeaning) {
                if (rm.nanori && rm.nanori.length > 0) { if (kanji.nanori === undefined) kanji.nanori = []; kanji.nanori.push(...rm.nanori); }

                for (const group of rm.groups) {
                    kanji.onyomi = group.readings.filter((reading: DictKanjiReading) => reading.type === 'ja_on').map((reading: DictKanjiReading) => reading.reading);
                    kanji.kunyomi = group.readings.filter((reading: DictKanjiReading) => reading.type === 'ja_kun').map((reading: DictKanjiReading) => reading.reading);

                    if (kanji.onyomi.length === 0) delete kanji.onyomi;
                    if (kanji.kunyomi.length === 0) delete kanji.kunyomi;

                    kanji.meanings = group.meanings;

                    if (kanji.meanings.length === 0) delete kanji.meanings;
                }
            }

            if (jmDict) {
                let kanjiWords: DictWord[] | Word[] = jmDict.filter((word: DictWord) => word.kanjiForms && word.kanjiForms[0]!.form.includes(kanji.kanji));

                if (kanjiWords.length > 3) kanjiWords = kanjiWords.slice(0, 2);

                if (kanjiWords.length > 0) kanji.words = kanjiWords.map((word: DictWord) => {
                    const wordObj: Word = getWord(undefined, undefined, undefined, undefined, word);

                    if (!wordObj.translations) throw new Error(`Invalid word: ${word.id}`);

                    const kanjiForm: KanjiForm = wordObj.kanjiForms![0]!;
                    let reading: Reading | undefined = wordObj.readings.find((reading: Reading) => reading.notes && reading.notes.some((note: string) => note.toLowerCase().startsWith('reading restricted to ') && note.endsWith(kanjiForm.kanjiForm)));
                    let translation: Translation | undefined = wordObj.translations.find((translation: Translation) => translation.notes && translation.notes.some((note: string) => note.toLowerCase().startsWith('meaning restricted to ') && (note.endsWith(kanjiForm.kanjiForm) || (reading && note.endsWith(reading.reading)))));

                    if (!reading) reading = wordObj.readings[0]!;
                    if (!translation) translation = wordObj.translations[0]!;

                    return { kanjiForms: [kanjiForm], readings: [reading], translations: [translation] };
                })

                if (kanjiWords.length !== 3) {
                    const wordNumber: number = 3 - kanjiWords.length;

                    kanjiWords = jmDict.filter((word: DictWord) => word.kanjiForms && word.kanjiForms.some((kanjiForm: DictKanjiForm) => kanjiForm.form.includes(kanji.kanji))).map((word: DictWord) => {
                        const wordObj: Word = getWord(undefined, undefined, undefined, undefined, word);

                        if (!wordObj.translations) throw new Error(`Invalid word: ${word.id}`);

                        const kanjiForm: KanjiForm | undefined = wordObj.kanjiForms!.find((kanjiForm: KanjiForm) => kanjiForm.kanjiForm.includes(kanji.kanji));
                        if (!kanjiForm) throw new Error('Invalid kanji form');

                        let reading: Reading | undefined = wordObj.readings.find((reading: Reading) => reading.notes && reading.notes.some((note: string) => note.toLowerCase().startsWith('reading restricted to ') && note.endsWith(kanjiForm.kanjiForm)));
                        let translation: Translation | undefined = wordObj.translations.find((translation: Translation) => translation.notes && translation.notes.some((note: string) => note.toLowerCase().startsWith('meaning restricted to ') && (note.endsWith(kanjiForm.kanjiForm) || (reading && note.endsWith(reading.reading)))));

                        if (!reading) reading = wordObj.readings[0]!;
                        if (!translation) translation = wordObj.translations[0]!;

                        return { kanjiForms: [kanjiForm], readings: [reading], translations: [translation] };
                    });

                    if (kanjiWords.length > wordNumber) kanjiWords = kanjiWords.slice(0, wordNumber - 1);

                    if (kanjiWords.length > 0)
                        if (kanji.words) kanji.words.push(...kanjiWords);
                        else kanji.words = kanjiWords;
                }
            }

            if (svgList) {
                let codePoint: number | string | undefined = kanji.kanji.codePointAt(0);

                if (codePoint !== undefined) {
                    codePoint = codePoint.toString(16);

                    const svg: string | undefined = svgList.find((svgFile: string) => svgFile.toLowerCase() === `0${codePoint}.svg` || svgFile.toLowerCase() === `${codePoint}.svg`);

                    if (svg) kanji.svg = svg;
                }
            }

            kanji.tags = [];

            if (kanji.meanings && kanji.meanings.some((meaning: string) => meaning === '(kokuji)')) {
                kanji.tags.push('kokuji');
                kanji.meanings = kanji.meanings.filter((meaning: string) => meaning !== '(kokuji)');
            }

            kanji.tags.push(
                ...(!kanji.onyomi) ? ['no::onyomi'] : [],
                ...(!kanji.kunyomi) ? ['no::kunyomi'] : [],
                ...(kanji.nanori) ? ['has::nanori'] : [],
                ...(kanji.svg) ? ['has::svg'] : [],
                ...(kanji.strokes && kanji.strokes.length > 0) ? [`strokes::${kanji.strokes}`] : [],
                ...(kanji.words) ? ['has::words'] : []
            )

            kanji.noteID = `kanji_${kanji.kanji}`;

            return kanji;
        } else throw new Error(`Kanji ${kanjiChar} not found`);
    } catch (err: unknown) {
        throw err;
    }
}

export function getKanjiExtended(kanjiChar: string, info: Kanji, dict: DictKanji[], useJpdbWords?: true | undefined, jmDict?: DictWord[] | undefined, svgList?: string[] | undefined): Kanji {
    try {
        const kanji: Kanji = getKanji(kanjiChar, dict, jmDict, svgList);

        if (info.components && info.components.length > 0) kanji.components = info.components;
        if (info.mnemonic && info.mnemonic.length > 0) kanji.mnemonic = info.mnemonic;
        if (useJpdbWords === true && info.words && info.words.length > 0) kanji.words = info.words;

        if (kanji.mnemonic && kanji.mnemonic.length > 0 && kanji.tags) kanji.tags.push('has::mnemonic');
        if (kanji.components && kanji.components.length > 0 && kanji.tags) kanji.tags.push(`components::${kanji.components.length}`);
        if (kanji.words && kanji.tags && !kanji.tags.includes('has::words')) kanji.tags.push('has::words');

        if (kanji.mnemonic || (kanji.components && kanji.components.length > 0) || kanji.words) kanji.source = `https://jpdb.io/kanji/${kanji.kanji}#a`;

        return kanji;
    } catch (err: unknown) {
        throw err;
    }
}

export function getJLPTVocab(): void {
    try {
        console.log('\nBuilding JLPT vocab');

        const jmDict: DictWord[] = getDict('JMDict') as DictWord[];
        const kanjiDic: DictKanji[] = getDict('Kanjidic') as DictKanji[];
        const tanaka: TanakaExample[] = (shuffleArray<TanakaExample>((getDict('tanaka') as TanakaExample[]))).filter((ex: TanakaExample) => ex.furigana);

        const idsPath: string = `${resultPaths.vocabJLPT}/ids`;
        if (!existsSync(idsPath)) throw new Error('There are no JLPT vocab IDs files');

        const audioReadings: Word[] = [];

        if (checkExistenceOfResults(resultPaths.vocabJLPT, 'readings_with_audio', true)) loadEntries(resultPaths.vocabJLPT, 'readings_with_audio', audioReadings);
        else throw new Error('readings_with_audio JSON file does not exist');

        for (const filename of fileNames.vocabJLPT) {
            if (checkExistenceOfResults(resultPaths.vocabJLPT, filename)) { console.log(`Already got ${filename}`); continue; }

            console.log(`Parsing ${filename}`);

            const idFilePath: string = `${idsPath}/${filename}.json`;
            if (!existsSync(idFilePath)) throw new Error(`ID file does not exist: ${idFilePath}`);

            const idList: string[] = JSON.parse(readFileSync(idFilePath, 'utf-8')) as string[];

            const words: Word[] = [];

            for (const id of idList) {
                if (typeof id !== 'string') throw new Error(`Invalid ID file: ${idFilePath}`);

                const word: Word = getWord(jmDict, id, kanjiDic, tanaka, undefined);

                const audioReadingsWord: Word | undefined = audioReadings.find((audioWord: Word) => audioWord.noteID === word.noteID);

                if (audioReadingsWord) word.readings = word.readings.map((reading: Reading) => {
                    const audioReading: Reading | undefined = audioReadingsWord.readings.find((rd: Reading) => rd.reading === reading.reading);

                    if (audioReading) reading.audio = audioReading.audio;

                    return reading;
                });

                words.push(word);
            }

            saveEntries(words, filename, resultPaths.vocabJLPT);
        }
    } catch (err: unknown) {
        throw err;
    }
}

export function getJLPTKanji(): void {
    try {
        console.log('\nBuilding JLPT kanji');

        const kanjiDic: DictKanji[] = getDict('Kanjidic') as DictKanji[];
        const jmDict: DictWord[] = getDict('JMDict') as DictWord[];

        const kanjiPath: string = `${resultPaths.kanjiJLPT}/kanji`;

        if (!existsSync(kanjiPath)) throw new Error('There are no JLPT kanji files');
        if (!existsSync(kanjiInfoFile)) throw new Error('The kanji file does not exist');
        if (!existsSync(svgDir)) throw new Error('The SVG folder does not exist');

        const kanjiInfoList: Kanji[] = JSON.parse(readFileSync(kanjiInfoFile, 'utf-8')) as Kanji[];
        const svgList: string[] = readdirSync(svgDir, 'utf-8');

        for (const filename of fileNames.kanjiJLPT) {
            if (checkExistenceOfResults(resultPaths.kanjiJLPT, filename)) { console.log(`Already got ${filename}`); continue; }

            console.log(`Parsing ${filename}`);

            const kanjiFilePath: string = `${kanjiPath}/${filename}.json`;
            if (!existsSync(kanjiFilePath)) throw new Error(`Kanji file does not exist: ${kanjiFilePath}`);

            const kanjiList: string[] = JSON.parse(readFileSync(kanjiFilePath, 'utf-8')) as string[];

            const kanjis: Kanji[] = [];

            for (const char of kanjiList) {
                if (typeof char !== 'string') throw new Error(`Invalid ID file: ${kanjiFilePath}`);

                let kanji: Kanji | undefined = undefined;

                const kanjiInfo: Kanji | undefined = kanjiInfoList.find((kanji: Kanji) => {
                    if (kanji.kanji === undefined) throw new Error('Invalid kanji info file');

                    return (kanji.kanji === char && (kanji.components || kanji.mnemonic || kanji.words))
                });

                if (kanjiInfo) kanji = getKanjiExtended(char, kanjiInfo, kanjiDic, true, jmDict, svgList);
                else kanji = getKanji(char, kanjiDic, jmDict, svgList);

                if ((kanji.onyomi || kanji.kunyomi) && kanji.meanings) kanjis.push(kanji);
            }

            saveEntries(kanjis, filename, resultPaths.kanjiJLPT);
        }
    } catch (err: unknown) {
        throw err;
    }
}

export function getRadicals(): void {
    console.log('\nBuilding radicals');

    if (checkExistenceOfResults(resultPaths.radicals, 'radicals')) console.log('Already got radicals');
    else throw new Error('Could not find radicals JSON file');

    // Add "used-in" kanji and mnemonic for each radical from the radical info JSON file
    if (undefined === null) {
        if (!existsSync(radicalInfoFile)) throw new Error('The radicals info file does not exist');

        const radicalInfoList: Radical[] = JSON.parse(readFileSync(radicalInfoFile, 'utf-8')) as Radical[];

        let radicals: Radical[] = [];

        loadEntries(resultPaths.radicals, 'radicals', radicals);

        radicals = radicals.map((radical: Radical) => {
            const radicalInfo: Radical | undefined = radicalInfoList.find((obj: Radical) => obj.radical === radical.radical);

            if (radicalInfo) {
                if (radicalInfo.kanji && radicalInfo.kanji.length > 0) radical.kanji = radicalInfo.kanji;
                if (radicalInfo.mnemonic) radical.mnemonic = radicalInfo.mnemonic;
            }

            return radical;
        });

        saveEntries(radicals, 'radicals', resultPaths.radicals);
    }
}

export function getKanas(): void {
    console.log('\nBuilding kana');

    for (const filename of fileNames.kana)
        if (checkExistenceOfResults(resultPaths.kana, filename)) console.log(`Already got ${filename}`);
        else throw new Error(`Could not find ${filename} JSON file`);
}

export function getGrammar(): void {
    console.log('\nBuilding grammar');

    for (const filename of fileNames.grammar)
        if (checkExistenceOfResults(resultPaths.grammar, filename)) console.log(`Already got ${filename}`);
        else throw new Error(`Could not find ${filename} JSON files`);
}

export function getExtraKanji(): void {
    try {
        console.log('\nBuilding extra kanji');

        if (checkExistenceOfResults(resultPaths.extraKanji, ['extra_kanji', 'extra_kanji_words'])) {
            console.log('Already got extra_kanji and extra_kanji_words');
            return;
        }

        const kanjiDic: DictKanji[] = getDict('Kanjidic') as DictKanji[];
        const jmDict: DictWord[] = getDict('JMDict') as DictWord[];
        const tanaka: TanakaExample[] = (shuffleArray<TanakaExample>((getDict('tanaka') as TanakaExample[]))).filter((ex: TanakaExample) => ex.furigana);

        const kanjiToWordsMap: Map<string, Set<string>> = new Map<string, Set<string>>();
        const ids: Set<string> = new Set<string>();

        for (const word of jmDict) if (word.kanjiForms) for (const kanjiForm of word.kanjiForms) {
            const kanjiChars: string[] = kanjiForm.form.split('');

            for (const char of kanjiChars) {
                if (!kanjiToWordsMap.has(char)) kanjiToWordsMap.set(char, new Set<string>);

                if (!ids.has(word.id)) { kanjiToWordsMap.get(char)!.add(word.id); ids.add(word.id); }
            }
        }

        const kanjiToDelete: string[] = [];

        for (const [kanji, words] of kanjiToWordsMap.entries()) if (words.size === 0) kanjiToDelete.push(kanji);
        for (const kanji of kanjiToDelete) kanjiToWordsMap.delete(kanji);

        kanjiToDelete.length = 0;
        ids.clear();

        const kanji: Kanji[] = [];
        const kanjiWords: Word[] = [];

        let jlptKanji: Kanji[] | Set<string> = [];

        loadEntries(resultPaths.kanjiJLPT, fileNames.kanjiJLPT, jlptKanji as Kanji[]);
        loadEntries(resultPaths.vocabJLPT, fileNames.vocabJLPT, undefined, ids);

        jlptKanji = new Set<string>((jlptKanji as Kanji[]).map((kanji: Kanji) => kanji.kanji));

        if (!existsSync(kanjiInfoFile)) throw new Error('The kanji info file does not exist');

        const kanjiInfoList: Kanji[] = JSON.parse(readFileSync(kanjiInfoFile, 'utf-8')) as Kanji[];

        let searchedKanji: number = 0;
        let kanjiDicLength: number = kanjiDic.length;

        for (const kanjiEntry of kanjiDic) {
            let kanjiInfo: Kanji | undefined = undefined;

            for (const kanji of kanjiInfoList) {
                if (kanji.kanji === undefined) throw new Error('Invalid kanji info file');

                if (kanji.kanji === kanjiEntry.kanji && (kanji.components || kanji.mnemonic || kanji.words)) { kanjiInfo = kanji; break; }
            }

            const kanjiObj: Kanji | undefined = (!jlptKanji.has(kanjiEntry.kanji)) ? (kanjiInfo) ? getKanjiExtended(kanjiEntry.kanji, kanjiInfo, kanjiDic, true, jmDict) : getKanji(kanjiEntry.kanji, kanjiDic, jmDict) : undefined;
            if (kanjiObj && ((!kanjiObj.onyomi && !kanjiObj.kunyomi) || !kanjiObj.meanings)) { searchedKanji++; continue; }

            console.log(`${((searchedKanji / kanjiDicLength) * 100).toFixed()}% Searching: ${(!kanjiObj) ? `${kanjiEntry.kanji} (from JLPT list; not added to extra_kanji)` : `${kanjiEntry.kanji}`}`);

            const wordsForKanji: Set<string> | undefined = kanjiToWordsMap.get(kanjiEntry.kanji);
            if (!wordsForKanji) { searchedKanji++; continue; }

            let foundWord: boolean = false;

            for (const id of wordsForKanji) {
                if (ids.has(id)) continue;

                const word: Word = getWord(jmDict, id, kanjiDic, tanaka, undefined);

                if ((word.common === true || (word.phrases && word.phrases.length > 0)) && word.id) {
                    if (!foundWord) foundWord = true;

                    ids.add(word.id);
                    kanjiWords.push(word);
                }
            }

            if (foundWord && kanjiObj) kanji.push(kanjiObj);

            searchedKanji++;
        }

        if (kanji.length > 0) saveEntries(kanji, 'extra_kanji', resultPaths.extraKanji);
        if (kanjiWords.length > 0) saveEntries(kanjiWords, 'extra_kanji_words', resultPaths.extraKanji);
    } catch (err: unknown) {
        throw err;
    }
}

export function getKanaWords(): void {
    try {
        console.log('\nBuilding kana words');

        if (checkExistenceOfResults(resultPaths.kanaWords, 'kana_words')) {
            console.log(`Already got kana_words`);
            return;
        }

        const ids: Set<string> = new Set<string>();
        const jmDict: DictWord[] = getDict('JMDict') as DictWord[];
        const kanjiDic: DictKanji[] = getDict('Kanjidic') as DictKanji[];
        const tanaka: TanakaExample[] = (shuffleArray<TanakaExample>((getDict('tanaka') as TanakaExample[]))).filter((ex: TanakaExample) => ex.furigana);

        const wordList: Word[] = [];

        if (checkExistenceOfResults(resultPaths.extraKanji, 'extra_kanji_words')) loadEntries(resultPaths.extraKanji, 'extra_kanji_words', undefined, ids);
        if (checkExistenceOfResults(resultPaths.vocabJLPT, fileNames.vocabJLPT)) loadEntries(resultPaths.vocabJLPT, fileNames.vocabJLPT, undefined, ids);

        for (const dictWord of jmDict) {
            if (ids.has(dictWord.id)) continue;

            const word: Word = getWord(undefined, undefined, kanjiDic, tanaka, dictWord);

            if (word.kanji === undefined && (word.common === true || (word.phrases && word.phrases.length > 0))) wordList.push(word);
        }

        if (wordList.length > 0) saveEntries(wordList, 'kana_words', resultPaths.kanaWords);
        else throw new Error('Empty kana words list');
    } catch (err: unknown) {
        throw err;
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
export const createEntry: (entry: string, notes?: string[] | undefined, phrase?: true | undefined) => string = (entry: string, notes?: string[] | undefined, phrase?: true | undefined) => `<div class="entry">${entry}${(notes && notes.length > 0) ? createNotes(notes, phrase) : ''}</div>`;
export const noKanjiForms: string = '<span class="word word-kanjiform">(no kanji forms)</span>';

export function generateAnkiNote(entry: Result): string[] {
    if (!entry.noteID) throw new Error('Invalid note ID');

    const fields: string[] = [];

    if (isWord(entry)) {
        if (!entry.translations) throw new Error(`Invalid word: ${entry.noteID}`);

        const usuallyInKana: boolean = entry.translations.every((translation) => translation.notes && translation.notes.includes('Word usually written using kana alone'));

        fields.push(
            ...(entry.kanjiForms && !usuallyInKana) ?
                [
                    entry.kanjiForms.map((kanjiFormEntry: KanjiForm, index: number) => `${(index > 0) ? '<details><summary>Show kanji form</summary>' : ''}${createEntry(`<span class="word word-kanjiform">${(index === 0) ? '<ruby><rb>' : ''}${kanjiFormEntry.kanjiForm}${(index === 0) ? `</rb><rt>${(entry as Word).readings[0]!.reading}</rt></ruby>` : ''}</span>`, kanjiFormEntry.notes)}${(index > 0) ? '</details>' : ''}`).join(''),
                    entry.readings.map((readingEntry: Reading, index: number) => `${(index > 0) ? '<details><summary>Show reading</summary>' : ''}${createEntry(`<span class="word word-reading">${readingEntry.reading}${(readingEntry.audio !== undefined) ? `<br>[sound:${readingEntry.audio}]` : ''}</span>`, readingEntry.notes)}${(index > 0) ? '</details>' : ''}`).join('')
                ]
                :
                [
                    entry.readings.map((readingEntry: Reading, index: number) => `${(index > 0) ? '<details><summary>Show reading</summary>' : ''}${createEntry(`<span class="word word-reading">${readingEntry.reading}${(readingEntry.audio !== undefined) ? `<br>[sound:${readingEntry.audio}]` : ''}</span>`, readingEntry.notes)}${(index > 0) ? '</details>' : ''}`).join(''),
                    (entry.kanjiForms) ? entry.kanjiForms.map((kanjiFormEntry: KanjiForm, index: number) => `${(index > 0) ? '<details><summary>Show kanji form</summary>' : ''}${createEntry(`<span class="word word-kanjiform">${(index === 0) ? '<ruby><rb>' : ''}${kanjiFormEntry.kanjiForm}${(index === 0) ? `</rb><rt>${(entry as Word).readings[0]!.reading}</rt></ruby>` : ''}</span>`, kanjiFormEntry.notes)}${(index > 0) ? '</details>' : ''}`).join('') : noKanjiForms
                ],
            entry.translations.map((translationEntry: Translation, index: number) => `${(index > 2) ? '<details><summary>Show translation</summary>' : ''}${createEntry(`<span class="word word-translation">${translationEntry.translation}</span>`, translationEntry.notes)}${(index > 2) ? '</details>' : ''}`).join(''),
            (entry.kanji) ? entry.kanji.map((kanjiEntry: Kanji) => createEntry(`<span class="word word-kanji">${kanjiEntry.kanji}${(kanjiEntry.meanings === undefined) ? ' (no meanings)' : ''}</span>`, kanjiEntry.meanings)).join('') : '<span class="word word-kanji">(no kanji)</span>',
            (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="word word-phrase"><span class="word word-phrase-original">${phraseEntry.originalPhrase}</span><span class="word word-phrase-furigana">${phraseEntry.phrase}</span></span>`, [phraseEntry.translation], true)).join('') : '<span class="word word-phrase">(no phrases) (Search on dictionaries!)</span>',
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
        (entry.words) ? entry.words.filter((word: Word) => word.translations && word.translations.length > 0).map((word: Word) => createEntry(`<span class="kanji kanji-words">${(word.kanjiForms && word.kanjiForms.length > 0) ? word.kanjiForms[0]!.kanjiForm : '(no kanji form)'} / ${word.readings[0]!.reading} - ${word.translations![0]!.translation}</span>`)).join('') : '<span class="kanji kanji-words">(no words) (Search on dictionaries!)</span>',
        (entry.strokes) ? createEntry(`<span class="kanji kanji-strokes">${entry.strokes}<br>${(entry.svg) ? `<img class="kanji kanji-stroke-order" src="${entry.svg}" alt="${entry.kanji} stroke order SVG">` : '(no stroke order SVG available)'}</span>`) : '<span class="kanji kanji-strokes">(no stroke number)</span>',
        (entry.source) ? `<span class="kanji kanji-source"><a href="${entry.source}" target="_blank">Source</a></span>` : '<span class="kanji kanji-source">(no components/mnemonic source)</span>',
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (isKana(entry)) fields.push(
        createEntry(`<span class="kana kana-character">${entry.kana}</span>`),
        createEntry(`<span class="kana kana-reading">${entry.reading}${(entry.audio !== undefined) ? `<br>[sound:${entry.audio}]` : ''}</span>`),
        (entry.svg) ? createEntry(`<img class="kana kana-stroke-order" src="${entry.svg}" alt="${entry.kana} stroke order SVG">`) : '(no stroke order SVG available)',
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (isGrammar(entry)) fields.push(
        createEntry(`<span class="grammar grammar-point">${entry.point}</span>`),
        (entry.readings) ? entry.readings.map((readingEntry: Reading) => createEntry(`<span class="grammar grammar-reading">${readingEntry.reading}</span>`)).join('') : '<span class="grammar grammar-reading">(no additional readings)</span>',
        createEntry(`<span class="grammar grammar-meaning">${entry.meaning.meaning}${(entry.meaning.example && entry.meaning.example.length > 0) ? `<br><span class="grammar grammar-meaning-example">${entry.meaning.example}</span>` : ''}</span>`),
        (entry.usages) ? entry.usages.map((usage) => createEntry(`<span class="grammar grammar-usage">${usage}</span>`)).join('') : '<span class="grammar grammar-usage">(no usages)</span>',
        (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="grammar grammar-phrase"><span class="grammar grammar-phrase-original">${phraseEntry.originalPhrase}</span><span class="grammar grammar-phrase-furigana">${phraseEntry.phrase}</span></span>`, [phraseEntry.translation], true)).join('') : '<span class="grammar grammar-phrase">(no phrases) (Search on dictionaries!)</span>',
        (entry.source) ? `<span class="grammar grammar-source"><a href="${entry.source}" target="_blank">Source</a></span>` : '<span class="grammar grammar-source">(no source)</span>',
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (fields.length > 0) return fields.map((field: string) => field.replaceAll('\n', '<br>'));
    else throw new Error('Invalid entry');
}

export function generateAnkiNotesFile(list: Result[], filename: string): string | undefined {
    if (list.length > 0) {
        const headers: string[] = ['#separator:tab\n', '#html:true\n', '#guid column:1\n', '#notetype column:2\n', '#deck column:3\n'];

        let deck: string = `${deckName}::`;
        const filenameParts: string[] = filename.split('_');

        switch (filenameParts.length) {
            case 1:
                if (filenameParts[0]! === 'hiragana') deck += `${subDeckNames.kana._}::${subDeckNames.kana.hiragana}`;
                else if (filenameParts[0]! === 'katakana') deck += `${subDeckNames.kana._}::${subDeckNames.kana.katakana}`;
                else if (filenameParts[0]! === 'radicals') deck += subDeckNames.radicals._;

                break;
            case 2:
                if (filenameParts[0]! === 'kana' && filenameParts[1]! === 'words') deck += subDeckNames.kanaWords._;
                else if (filenameParts[0]! === 'grammar') deck += `${subDeckNames.grammar._}::${(filenameParts[1]! === 'additional') ? subDeckNames.grammar.additional : subDeckNames.grammar[filenameParts[1]!.toLowerCase() as 'n5' | 'n4' | 'n3' | 'n2' | 'n1']}`;
                else if (filenameParts[1]! === 'extended') deck += `${subDeckNames.kana._}::${(filenameParts[0]! === 'hiragana') ? subDeckNames.kana.hiraganaExtended : (filenameParts[0]! === 'katakana') ? subDeckNames.kana.katakanaExtended : ''}`;
                else if (filenameParts[0]! === 'kanji' && filenameParts[1]!.startsWith('n')) deck += `${subDeckNames.jlpt._}::${subDeckNames.jlpt.kanji._}::${subDeckNames.jlpt.kanji[filenameParts[1]!.toLowerCase() as 'n5' | 'n4' | 'n3' | 'n2' | 'n1']}`;
                else if (filenameParts[0]! === 'vocab' && filenameParts[1]!.startsWith('n')) deck += `${subDeckNames.jlpt._}::${subDeckNames.jlpt.vocab._}::${subDeckNames.jlpt.vocab[filenameParts[1]!.toLowerCase() as 'n5' | 'n4' | 'n3' | 'n2' | 'n1']}`;
                else if (filenameParts[0]! === 'extra' && filenameParts[1]! === 'kanji') deck += `${subDeckNames.extraKanji._}::${subDeckNames.extraKanji.kanji}`;

                break;
            case 3:
                if (filenameParts[0]! === 'extra' && filenameParts[1]! === 'kanji' && filenameParts[2]! === 'words') deck += `${subDeckNames.extraKanji._}::${subDeckNames.extraKanji.vocab}`;

                break;
            default:
                throw new Error('Invalid filename');
        }

        const ankiNotes: string = list.map((result: Result) => {
            if (!result.noteID) throw new Error('Invalid result');

            const note: string[] = generateAnkiNote(result);
            if (headers.length === 5) headers.push(`#tags column:${note.length + 3}\n`);

            let noteType: string = '';

            if (isWord(result)) noteType = noteTypes.word;
            if (isRadical(result)) noteType = noteTypes.radical;
            if (isKanji(result)) noteType = noteTypes.kanji;
            if (isKana(result)) noteType = noteTypes.kana;
            if (isGrammar(result)) noteType = noteTypes.grammar;

            if (noteType.length === 0) throw new Error('Invalid entry');

            return `${result.noteID}\t${noteType}\t${deck}\t${note.join('\t')}`;
        }).join('\n').trim();

        if (ankiNotes.length === 0) throw new Error('Invalid list');

        return `${headers.join('')}${ankiNotes}`;
    } else console.log('No entries available for Anki notes creation');

    return undefined;
}

export function getVocabEntries(): void {
    try {
        if (existsSync(resultPaths.vocabJLPT!)) {
            const vocabFiles: string[] = readdirSync(resultPaths.vocabJLPT!, 'utf-8');

            if (vocabFiles.length > 0) {
                if (!vocabFiles.every((file: string) => fileNames.vocabJLPT.some((name: string) => name === path.parse(file).name.trim())))
                    getJLPTVocab();
            } else getJLPTVocab();
        } else getJLPTVocab();
    } catch (err: unknown) {
        throw err;
    }
}

export function getKanjiEntries(): void {
    try {
        if (existsSync(resultPaths.kanjiJLPT!)) {
            const kanjiFiles: string[] = readdirSync(resultPaths.kanjiJLPT!, 'utf-8');

            if (kanjiFiles.length > 0) {
                if (!kanjiFiles.every((file: string) => fileNames.kanjiJLPT.some((name: string) => name === path.parse(file).name.trim())))
                    getJLPTKanji();
            } else getJLPTKanji();
        } else getJLPTKanji();
    } catch (err: unknown) {
        throw err;
    }
}

export function getRadicalEntries(): void {
    try {
        if (existsSync(resultPaths.radicals!)) {
            const radicalsFiles: string[] = readdirSync(resultPaths.radicals!, 'utf-8');

            if (!radicalsFiles.includes('radicals.txt')) getRadicals();
        } else getRadicals();
    } catch (err: unknown) {
        throw err;
    }
}

export function getKanaEntries(): void {
    try {
        if (existsSync(resultPaths.kana!)) {
            const kanaFiles: string[] = readdirSync(resultPaths.kana!, 'utf-8');

            if (kanaFiles.length > 0) {
                if (!kanaFiles.every((file: string) => fileNames.kana.some((name: string) => name === path.parse(file).name.trim())))
                    getKanas();
            } else getKanas();
        } else getKanas();
    } catch (err: unknown) {
        throw err;
    }
}

export function getGrammarEntries(): void {
    try {
        if (existsSync(resultPaths.grammar!)) {
            const grammarFiles: string[] = readdirSync(resultPaths.grammar!, 'utf-8');

            if (grammarFiles.length > 0) {
                if (!grammarFiles.every((file: string) => fileNames.grammar.some((name: string) => name === path.parse(file).name.trim())))
                    getGrammar();
            } else getGrammar();
        } else getGrammar();
    } catch (err: unknown) {
        throw err;
    }
}

export function getEntries(): void {
    try {
        getVocabEntries()
        getKanjiEntries()
        getRadicalEntries()
        getKanaEntries()
        getGrammarEntries()
        getExtraKanji()
        getKanaWords()
    } catch (err: unknown) {
        throw err;
    }
}