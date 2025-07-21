import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';

import { deckName, dictsDir, dictsNames, fileNames, jpdbFile, jpdbRadicalsFile, noteMap, noteTypes, regexps, resultPaths, subDeckNames, svgDir } from './constants';
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

export interface TanakaExample {
    phrase: string;
    translation: string;
    parts: string;
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
    furigana?: string | undefined;
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

export function convertDicts(): void {
    let dicts: string[] = readdirSync(dictsDir, 'utf-8');

    if (!existsSync(`${dictsDir}/json`)) mkdirSync(`${dictsDir}/json`, { recursive: true });

    console.log('Converting dictionary files');

    for (let dict of dicts.filter((file: string) => path.parse(file).ext.toLowerCase() === '.xml')) {
        if (existsSync(`${dictsDir}/json/${path.parse(dict).name}.json`)) { console.log(`Already converted ${dict}`); continue; }

        console.log(`Converting ${dict}`);

        let dictParsed: libxml.Document = libxml.parseXml(readFileSync(`${dictsDir}/${dict}`, 'utf-8'), { dtdvalid: true, nonet: false, noent: true, recover: false });

        xml.parseString(dictParsed, (err: Error | null, result: any) => {
            if (err) console.log(err);

            if (dict === 'JMdict_e.xml') {
                let dictObj: DictWord[] = []

                if (result.JMdict && typeof result.JMdict === 'object' && isValidArray(result.JMdict.entry))
                    for (let entry of result.JMdict.entry) {
                        let entryObj: DictWord = {
                            id: '',
                            readings: [],
                            meanings: []
                        }

                        let kanjiForms: any = entry.k_ele;
                        let readings: any = entry.r_ele;
                        let meanings: any = entry.sense;

                        if (isValidArray(entry.ent_seq) && entry.ent_seq[0] && typeof entry.ent_seq[0] === 'string') entryObj.id = entry.ent_seq[0];

                        if (isValidArray(kanjiForms)) {
                            entryObj.kanjiForms = [];

                            for (let kanjiForm of kanjiForms) {
                                let form: DictKanjiForm = { form: '' };

                                if (isValidArrayWithFirstElement(kanjiForm.keb) && typeof kanjiForm.keb[0] === 'string') form.form = kanjiForm.keb[0];
                                if (isStringArray(kanjiForm.ke_inf)) form.notes = kanjiForm.ke_inf;
                                if (isStringArray(kanjiForm.ke_pri)) form.commonness = kanjiForm.ke_pri;

                                if (form.form.length > 0) entryObj.kanjiForms.push(form);
                            }
                        }

                        if (isValidArray(readings))
                            for (let reading of readings) {
                                let readingObj: DictReading = { reading: '' };

                                if (isValidArrayWithFirstElement(reading.reb) && typeof reading.reb[0] === 'string') readingObj.reading = reading.reb[0];
                                if (isStringArray(reading.re_inf)) readingObj.notes = reading.re_inf;
                                if (isStringArray(reading.re_pri)) readingObj.commonness = reading.re_pri;
                                if (isStringArray(reading.re_restr)) readingObj.kanjiFormRestrictions = reading.re_restr;

                                if (readingObj.reading.length > 0) entryObj.readings.push(readingObj);
                            }

                        if (isValidArray(meanings))
                            for (let meaning of meanings) {
                                let meaningObj: DictMeaning = {};

                                if (isStringArray(meaning.pos)) meaningObj.partOfSpeech = meaning.pos;
                                if (isValidArray(meaning.gloss)) {
                                    meaningObj.translations = [];

                                    for (let gloss of meaning.gloss)
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
                let dictObj: DictKanji[] = [];

                if (result.kanjidic2 && typeof result.kanjidic2 === 'object' && isValidArray(result.kanjidic2.character))
                    for (let entry of result.kanjidic2.character) {
                        let kanjiObj: DictKanji = {
                            kanji: '',
                            misc: {
                                strokeNumber: ''
                            },
                            readingMeaning: []
                        }

                        if (isValidArrayWithFirstElement(entry.literal) && typeof entry.literal[0] === 'string') kanjiObj.kanji = entry.literal[0];

                        if (isValidArrayWithFirstElement(entry.misc) && typeof entry.misc[0] === 'object') {
                            let misc: any = entry.misc[0];

                            kanjiObj.misc = { strokeNumber: '' };

                            if (isValidArrayWithFirstElement(misc.stroke_count) && typeof misc.stroke_count[0] === 'string') kanjiObj.misc.strokeNumber = misc.stroke_count[0];
                            if (isValidArrayWithFirstElement(misc.jlpt) && typeof misc.jlpt[0] === 'string') kanjiObj.misc.jlpt = misc.jlpt[0];
                        }

                        if (isValidArray(entry.reading_meaning))
                            for (let rm of entry.reading_meaning) {
                                let rmObj: DictKanjiReadingMeaning = { groups: [] };

                                if (isValidArray(rm.rmgroup))
                                    for (let group of rm.rmgroup) {
                                        let groupObj: DictKanjiReadingMeaningGroup = { readings: [], meanings: [] };

                                        if (isValidArray(group.reading))
                                            for (let reading of group.reading)
                                                if (reading._ && typeof reading._ === 'string' && reading.$ && typeof reading.$ === 'object' && reading.$.r_type && (reading.$.r_type === 'ja_on' || reading.$.r_type === 'ja_kun')) groupObj.readings.push({ reading: reading._, type: reading.$.r_type });

                                        if (isValidArray(group.meaning))
                                            for (let meaning of group.meaning) if (typeof meaning === 'string') groupObj.meanings.push(meaning);

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

    let tanakaPath: string = `${dictsDir}/examples.utf`;

    let tanakaArray: TanakaExample[] = [];

    if (existsSync(`${dictsDir}/json/tanaka_examples.json`)) console.log('Already converted examples.utf');
    else if (existsSync(tanakaPath)) {
        console.log('Converting examples.utf');

        let tanakaParsed: string[] = readFileSync(tanakaPath, 'utf-8').split('\n');

        for (let i = 0; i <= tanakaParsed.length; i += 2) {
            let a: string | undefined = tanakaParsed[i];
            let b: string | undefined = tanakaParsed[i + 1];

            if (a && b && a.startsWith('A: ') && b.startsWith('B: ')) {
                a = a.replace('A: ', '').replace(/#ID=\d+_\d+$/g, '');
                b = b.replace('B: ', '');

                let aParts: string[] = a.split('\t');

                let phrase: string | undefined = aParts[0];
                let translation: string | undefined = aParts[1];

                if (phrase && translation) tanakaArray.push({ phrase: phrase, translation: translation, parts: b });
            }
        }

        if (tanakaArray.length > 0) writeFileSync(`${dictsDir}/json/tanaka_examples.json`, JSON.stringify(tanakaArray, undefined, '\t'), 'utf-8');
    }

    let kanjiDict: DictKanji[] = JSON.parse(readFileSync(`${dictsDir}/json/kanjidic2.json`, 'utf-8')) as DictKanji[];

    let radkfile2Path: string = `${dictsDir}/kradzip/radkfile2`;

    let radicals: DictRadical[] = [];

    if (existsSync(`${dictsDir}/json/radkfile2.json`)) console.log('Already converted radkfile2');
    else if (existsSync(radkfile2Path)) {
        console.log('Converting radkfile2');

        let radfileBuffer: NonSharedBuffer = readFileSync(radkfile2Path);
        let fileParsed: string[] = iconv.decode(radfileBuffer, 'euc-jp').split('\n').filter((line: string) => !line.startsWith('#'));

        for (let i = 0; i <= fileParsed.length; i++) {
            let line: string | undefined = fileParsed[i];
            if (!line) continue;

            let radical: DictRadical = { radical: '', kanji: [], strokes: '' };

            if (line.startsWith('$ ')) {
                radical.radical = line.charAt(2);
                radical.strokes = line.substring(4);

                let j: number = i + 1;
                let kanjiLine: string | undefined = fileParsed[j];
                if (!kanjiLine) continue;

                while (kanjiLine && !kanjiLine.startsWith('$ ')) {
                    let kanjis: string[] = kanjiLine.split('');

                    for (let kanji of kanjis) {
                        let foundKanji: DictKanji | undefined = kanjiDict.find((dictKanji: DictKanji) => dictKanji.kanji === kanji);
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

    let kradfile2Path: string = `${dictsDir}/kradzip/kradfile2`;

    let kanjiWithRadicals: DictKanjiWithRadicals[] = [];

    if (existsSync(`${dictsDir}/json/kradfile2.json`)) console.log('Already converted kradfile2');
    else if (existsSync(kradfile2Path)) {
        console.log('Converting kradfile2');

        let kradfileBuffer: NonSharedBuffer = readFileSync(kradfile2Path);
        let fileParsed: string[] = iconv.decode(kradfileBuffer, 'euc-jp').split('\n').filter((line: string) => !line.startsWith('#'));

        let katakana: Kana[] = [];

        loadEntries(resultPaths.kana, 'katakana', katakana);

        for (let line of fileParsed) {
            if (line.length === 0) continue;

            let kanji: DictKanjiWithRadicals = { kanji: '', radicals: [] };

            let split: string[] = line.split(' : ');

            let kanjiChar: string | undefined = split[0];
            let radicalsRow: string | undefined = split[1];

            if (kanjiChar && radicalsRow && kanjiChar.length === 1 && radicalsRow.length > 0) {
                kanji.kanji = kanjiChar;

                let radicals: string[] = radicalsRow.split(' ');

                for (let radical of radicals) {
                    let foundRadical: DictKanji | undefined = kanjiDict.find((dictKanji: DictKanji) => dictKanji.kanji === radical);

                    if (!foundRadical) {
                        let katakanaChar: Kana | undefined = katakana.find((kana: Kana) => kana.kana === radical);
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

        let dictPath: string = `${dictsDir}/json/${name}.json`;

        if (existsSync(dictPath)) {
            let content: string = readFileSync(dictPath, 'utf-8');

            if (content.length > 0) {
                let obj: any = JSON.parse(content);

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
            let command: SynthesizeSpeechCommand = new SynthesizeSpeechCommand({
                Text: text,
                TextType: 'ssml',
                OutputFormat: "mp3",
                VoiceId: 'Tomoko',
                Engine: 'neural',
                LanguageCode: "ja-JP",
            });

            let response: SynthesizeSpeechCommandOutput = await client.send(command);

            if (response.AudioStream) {
                let stream: Buffer<ArrayBuffer> = Buffer.from(await response.AudioStream.transformToByteArray());

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
    let getCharType: (char: string) => "kanji" | "hiragana" | "katakana" | "other" = (char: string): 'kanji' | 'hiragana' | 'katakana' | 'other' => {
        if (regexps.kanji.test(char)) return 'kanji';
        if (regexps.hiragana.test(char)) return 'hiragana';
        if (regexps.katakana.test(char)) return 'katakana';
        return 'other';
    };

    let splitByScript: (text: string) => string[] = (text: string): string[] => {
        let pattern: RegExp = /([\p{sc=Han}]+|[\p{sc=Hiragana}]+|[\p{sc=Katakana}]+|[^\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]+)/gu;
        return text.match(pattern) || [];
    };

    let convertToHiragana: (str: string) => string = (str: string): string => {
        return str.replace(/[\u30A1-\u30F6]/g, (c: string) =>
            String.fromCharCode(c.charCodeAt(0) - 0x60)
        );
    };

    let romajiMap: Record<string, string> = {
        A: 'エー', B: 'ビー', C: 'シー', D: 'ディー', E: 'イー', F: 'エフ',
        G: 'ジー', H: 'エイチ', I: 'アイ', J: 'ジェー', K: 'ケー', L: 'エル',
        M: 'エム', N: 'エヌ', O: 'オー', P: 'ピー', Q: 'キュー', R: 'アール',
        S: 'エス', T: 'ティー', U: 'ユー', V: 'ブイ', W: 'ダブリュー', X: 'エックス',
        Y: 'ワイ', Z: 'ゼット'
    };

    let numberMap: Record<string, string> = {
        '0': 'ゼロ', '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン',
        '5': 'ゴ', '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ'
    };

    let symbolMap: Record<string, string> = {
        '＄': 'ドル', '%': 'パーセント', '¥': 'エン', '#': 'シャープ',
        '@': 'アット', '&': 'アンド'
    };

    let convertOtherToKatakana: (str: string) => string = (str: string): string => {
        return str.split('').map((c: string) => {
            if (romajiMap[c.toUpperCase()]) return romajiMap[c.toUpperCase()];
            if (numberMap[c]) return numberMap[c];
            if (symbolMap[c]) return symbolMap[c];
            return c;
        }).join('');
    };

    function makeSSML(formText: string, fullReading: string): string {
        let ssml: string = '';

        let allTypes: ("kanji" | "hiragana" | "katakana" | "other")[] = Array.from(formText).map((c: string) => getCharType(c));
        let uniqueTypes: ("kanji" | "hiragana" | "katakana" | "other")[] = Array.from(new Set(allTypes));

        if (uniqueTypes.length === 1) switch (uniqueTypes[0]) {
            case 'kanji':
                ssml = `<speak><phoneme alphabet="x-amazon-yomigana" ph="${fullReading}">${formText}</phoneme></speak>`;
                break;
            case 'katakana':
                ssml = `<speak><phoneme alphabet="x-amazon-pron-kana" ph="${formText}">${formText}</phoneme></speak>`;
                break;
            case 'hiragana':
                ssml = `<speak>${formText}</speak>`;
                break;
            default:
                ssml = `<speak>${formText}</speak>`;
        }
        else {
            let segments: string[] = splitByScript(formText);
            let pureKanjiReading: string = convertToHiragana(fullReading);

            segments.forEach((seg: string) => {
                let type: "kanji" | "hiragana" | "katakana" | "other" = getCharType(seg[0]!);

                if (type !== 'kanji') {
                    let converted: string = (type === 'other') ? convertToHiragana(convertOtherToKatakana(seg)) : convertToHiragana(seg);
                    pureKanjiReading = pureKanjiReading.replace(converted, '');
                }
            });

            let kanjiSegments: string[] = segments.filter((seg: string) => getCharType(seg[0]!) === 'kanji');
            let readingPointer: number = 0;
            let kanjiIndex: number = 0;

            let ssmlSegments: string[] = segments.map((seg: string) => {
                let type: "kanji" | "hiragana" | "katakana" | "other" = getCharType(seg[0]!);

                if (type === 'kanji') {
                    let expectedLength: number = pureKanjiReading.length / kanjiSegments.length;
                    let allocated: string = pureKanjiReading.slice(readingPointer, readingPointer + Math.ceil(expectedLength));

                    readingPointer += allocated.length;
                    kanjiIndex++;
                    return `<phoneme alphabet="x-amazon-yomigana" ph="${allocated}">${seg}</phoneme>`;
                } else if (type === 'katakana') return `<phoneme alphabet="x-amazon-pron-kana" ph="${seg}">${seg}</phoneme>`;
                else if (type === 'other') {
                    let katakanaReading: string = convertOtherToKatakana(seg);
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

            for (let kanaPath of fileNames.kana) {
                let kana: Kana[] = [];
                loadEntries(resultPaths.kana, kanaPath, kana);

                for (let char of kana) {
                    let ssml: string = makeSSML(char.kana.replace("/", "・"), char.kana.replace("/", "・"));

                    let id: UUID = randomUUID();

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

            for (let vocabPath of fileNames.vocabJLPT) {
                let vocab: Word[] = [];
                loadEntries(resultPaths.vocabJLPT, vocabPath, vocab);

                for (let word of vocab) {
                    if (word.kanjiForms && word.translations && !word.translations.every((translation) => translation.notes && translation.notes.includes('Usually written using kana alone'))) {
                        let form: KanjiForm | undefined = word.kanjiForms[0];
                        let firstReading: Reading | undefined = word.readings[0];

                        if (form && firstReading) {
                            let ssml: string = makeSSML(form.kanjiForm, firstReading.reading);

                            let id: UUID = randomUUID();

                            await synthesizeSpeech(client, ssml, `${resultPaths.vocabJLPT}/${id}.mp3`).catch((err: any) => { throw err; });

                            word.readings[0]!.audio = `${id}.mp3`;

                            count++;

                            if (count === 40) await new Promise((resolve: (value: unknown) => void) => {
                                count = 0;
                                setTimeout(resolve, 1000);
                            });
                        }

                        let restrictedReadings: Reading[] = word.readings.filter((reading: Reading) => reading.notes && reading.notes.some((note: string) => note.startsWith('Reading restricted to ')));

                        for (let rr of restrictedReadings) {
                            let kanjiForm: string | undefined = rr.notes!.find((note: string) => note.startsWith('Reading restricted to '))!.split(' to ')[1];

                            if (kanjiForm) {
                                let ssml: string = makeSSML(kanjiForm, rr.reading);

                                let id: UUID = randomUUID();

                                await synthesizeSpeech(client, ssml, `${resultPaths.vocabJLPT}/${id}.mp3`).catch((err: any) => { throw err; });

                                word.readings[word.readings.findIndex((wordReading: Reading) => wordReading.reading === rr.reading)]!.audio = `${id}.mp3`;

                                count++;

                                if (count === 40) await new Promise((resolve: (value: unknown) => void) => {
                                    count = 0;
                                    setTimeout(resolve, 1000);
                                });
                            }
                        }
                    } else for (let reading of word.readings) {
                        let ssml: string = makeSSML(reading.reading, reading.reading);

                        let id: UUID = randomUUID();

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
    })
}

export function makeTags(notes: string[], tags: string[]): void {
    if (notes && notes.length > 0) notes.forEach((note: string) => {
        let lowerCaseNote: string = note.trim().toLowerCase();
        let resultTag: string | undefined = noteMap.get(lowerCaseNote);

        if (resultTag && !tags.some((tag: string) => tag.trim().toLowerCase() === resultTag.trim().toLowerCase())) tags.push(resultTag.trim().toLowerCase());
    });
}

export function saveEntries(list: Result[], filename: string, resultPath: string, withoutNote?: true | undefined): void {
    try {
        if (list.length > 0) {
            if (!filename || filename.trim().length === 0) throw new Error('Invalid filename');
            if (!existsSync(resultPath)) mkdirSync(resultPath, { recursive: true });

            let jsonDir: string = `${resultPath}/json`;
            if (!existsSync(jsonDir)) mkdirSync(jsonDir, { recursive: true });

            writeFileSync(`${jsonDir}/${filename}.json`, JSON.stringify(list, undefined, '\t'), 'utf-8');

            if (withoutNote === undefined) {
                let ankiNotesFile: string | undefined = generateAnkiNotesFile(list, filename);
                if (ankiNotesFile && ankiNotesFile.length > 0) writeFileSync(`${resultPath}/${filename}.txt`, ankiNotesFile, 'utf-8');
            }

            console.log(`Saved ${filename} with ${list.length.toString()} entries\n`);
        }
    } catch (err: unknown) {
        throw err;
    }
}

export function loadEntries(resultPath: string, filename: string | string[], list?: Result[] | undefined, ids?: string[] | undefined): void {
    try {
        if (list === undefined && ids === undefined) throw new Error('You must parse either a valid results list or a valid IDs list');

        if (!existsSync(resultPath)) throw new Error(`${resultPath} does not exist`);

        let jsonDir: string = `${resultPath}/json`;
        if (!existsSync(jsonDir)) throw new Error(`${jsonDir} does not exist`);

        function parsePath(filename: string): void {
            let filePath: string = `${jsonDir}/${filename}.json`;

            if (!existsSync(filePath)) return;

            let results: Result[] | null | undefined = JSON.parse(readFileSync(filePath, 'utf-8'));

            if (results && Array.isArray(results) && results.every((result: Result) => typeof result === 'object')) {
                if (list) list.push(...results);

                if (ids) {
                    let resultsWithIDs: Result[] = results.filter((result: Result) => result.id !== undefined);

                    if (resultsWithIDs.length > 0) {
                        let idsList: string[] = resultsWithIDs.map((result: Result) => result.id!);

                        for (let id of idsList) ids.push(id);
                    }
                }
            }
        }

        if (Array.isArray(filename)) for (let name of filename) parsePath(name);
        else if (typeof filename === 'string') parsePath(filename);
    } catch (err: unknown) {
        throw err;
    }
}

export function checkExistenceOfResults(resultPath: string, filename: string, withoutNote?: true | undefined): boolean {
    let exists: boolean = false;

    if (existsSync(resultPath)) {
        if (filename.length === 0) throw new Error('Invalid filename');

        let jsonDir: string = `${resultPath}/json`;

        let files: string[] = readdirSync(resultPath, { encoding: 'utf-8', recursive: false });
        let jsonFiles: string[] = (existsSync(jsonDir)) ? readdirSync(jsonDir, { encoding: 'utf-8', recursive: false }) : [];

        let jsonFile: string | undefined = jsonFiles.find((file: string) => path.parse(file).name === filename);

        if (jsonFile) {
            let jsonFileContent: Result[] | null | undefined = JSON.parse(readFileSync(`${jsonDir}/${jsonFile}`, 'utf-8'));

            if (jsonFileContent && Array.isArray(jsonFileContent) && jsonFileContent.every((result: Result) => typeof result === 'object')) {
                exists = true;

                if (withoutNote === undefined) {
                    let ankiNotesFile: string | undefined = generateAnkiNotesFile(jsonFileContent, filename);

                    if (ankiNotesFile && ankiNotesFile.length > 0) { writeFileSync(`${resultPath}/${path.parse(jsonFile).name}.txt`, ankiNotesFile, 'utf-8'); };
                }
            }
        }

        if (files.some((file: string) => filename === path.parse(file).name)) exists = true;
    }

    return exists;
}

export function getWord(dict?: DictWord[] | undefined, id?: string | undefined, kanjiDic?: DictKanji[] | undefined, tanaka?: TanakaExample[] | undefined, dictWord?: DictWord | undefined): Word {
    if (!dictWord && id && dict) dictWord = dict.find((entry) => entry.id === id);

    if (dictWord) {
        let word: Word = { id: dictWord.id, readings: [], translations: [] };

        if (dictWord.kanjiForms) word.kanjiForms = dictWord.kanjiForms.map((dictKanjiForm: DictKanjiForm) => {
            if (dictKanjiForm.commonness && dictKanjiForm.commonness.length > 0 && word.common === undefined) word.common = true;

            return { kanjiForm: dictKanjiForm.form, ...(dictKanjiForm.notes) ? { notes: dictKanjiForm.notes.map((note: string) => capitalizeFirstLetter(note)) } : {} };
        });

        word.readings = dictWord.readings.map((dictReading: DictReading) => {
            if (dictReading.commonness && dictReading.commonness.length > 0 && word.common === undefined) word.common = true;

            return { reading: dictReading.reading, ...(dictReading.kanjiFormRestrictions || dictReading.notes) ? { notes: [...(dictReading.kanjiFormRestrictions) ? dictReading.kanjiFormRestrictions.map((restriction: string) => `Reading restricted to ${restriction}`) : [], ...(dictReading.notes) ? dictReading.notes.map((note: string) => capitalizeFirstLetter(note)) : []] } : {} }
        });

        word.translations = dictWord.meanings.map((dictMeaning: DictMeaning) => {
            if (!dictMeaning.translations) throw new Error(`No translations for ${dictWord.id}`);

            let translationTypes: string[] = [];
            let translations = dictMeaning.translations.map((translation: string | { translation: string; type: "lit" | "expl" | "tm"; }) => {
                if ((typeof translation === 'string')) return translation;
                else {
                    if (translation.type === 'lit') translationTypes.push('Literal meaning');
                    else if (translation.type === 'expl') translationTypes.push('Explanation');
                    else if (translation.type === 'tm') translationTypes.push('Trademark');

                    return translation.translation;
                }
            })

            return {
                translation: translations.join(', '),
                notes: [
                    ...(dictMeaning.kanjiFormRestrictions) ? dictMeaning.kanjiFormRestrictions.map((restriction: string) => `Meaning restricted to ${restriction}`) : [],
                    ...(dictMeaning.readingRestrictions) ? dictMeaning.readingRestrictions.map((restriction: string) => `Meaning restricted to ${restriction}`) : [],
                    ...(translationTypes.length > 0) ? translationTypes : [],
                    ...(dictMeaning.partOfSpeech) ? dictMeaning.partOfSpeech : [],
                    ...(dictMeaning.fields) ? dictMeaning.fields : [],
                    ...(dictMeaning.dialects) ? dictMeaning.dialects.map((dialect: string) => `Dialect: ${dialect}`) : [],
                    ...(dictMeaning.antonyms) ? dictMeaning.antonyms.map((antonym: string) => `Antonym: ${antonym}`) : [],
                    ...(dictMeaning.references) ? dictMeaning.references.map((reference: string) => `Related: ${reference}`) : [],
                    ...(dictMeaning.info) ? dictMeaning.info : [],
                    ...(dictMeaning.misc) ? dictMeaning.misc : []
                ].map((note: string) => capitalizeFirstLetter(note))
            }
        });

        if (kanjiDic && word.kanjiForms) {
            word.kanji = [];

            for (let kanjiForm of word.kanjiForms) for (let char of kanjiForm.kanjiForm) {
                if (word.kanji.some((kanji: Kanji) => kanji.kanji === char)) continue;

                let dictKanji: DictKanji | undefined = kanjiDic.find((kanji: DictKanji) => kanji.kanji === char);

                if (dictKanji) {
                    let kanjiObj: Kanji = getKanji(dictKanji.kanji, kanjiDic, undefined);

                    word.kanji.push({ kanji: kanjiObj.kanji, ...(kanjiObj.meanings) ? { meanings: kanjiObj.meanings } : {} });
                }
            }

            if (word.kanji.length === 0) delete word.kanji;
        }

        if (tanaka) {
            let examples: TanakaExample[] = tanaka.filter((example: TanakaExample) => {
                if (word.kanjiForms) return word.kanjiForms.some((kanjiForm: KanjiForm) => example.parts.includes(kanjiForm.kanjiForm));
                else return example.parts.includes(word.readings[0]!.reading);
            });

            if (examples.length > 6) examples = examples.slice(undefined, 5);

            if (examples.length > 0) word.phrases = examples.map((example: TanakaExample) => ({ phrase: example.phrase, translation: example.translation }));
        }

        word.tags = [];

        makeTags([
            ...(word.kanjiForms) ? word.kanjiForms.filter((kanjiForm: KanjiForm) => kanjiForm.notes).map((kanjiForm: KanjiForm) => kanjiForm.notes!) : [],
            ...word.readings.filter((reading: Reading) => reading.notes).map((reading: Reading) => reading.notes!),
            ...word.translations.filter((translation: Translation) => translation.notes).map((translation: Translation) => translation.notes!)
        ].flat(), word.tags);

        if (word.id) word.noteID = `word_${word.id}`;
        else throw new Error('Invalid word ID');

        return word;
    } else throw new Error(`Word${(id) ? ` ${id}` : ''} not found`);
}

export function getKanji(kanjiChar: string, dict: DictKanji[], jmDict?: DictWord[] | undefined, svgList?: string[] | undefined): Kanji {
    try {
        let dictKanji: DictKanji | undefined = dict.find((entry: DictKanji) => entry.kanji === kanjiChar);

        if (dictKanji) {
            let kanji: Kanji = { kanji: dictKanji.kanji, ...(dictKanji.misc) ? { strokes: dictKanji.misc.strokeNumber } : {} };

            for (let rm of dictKanji.readingMeaning) {
                if (rm.nanori && rm.nanori.length > 0) { if (kanji.nanori === undefined) kanji.nanori = []; kanji.nanori.push(...rm.nanori); }

                for (let group of rm.groups) {
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
                    let wordObj = getWord(undefined, undefined, undefined, undefined, word);

                    if (!wordObj.translations) throw new Error(`Invalid word: ${word.id}`);

                    let kanjiForm: KanjiForm = wordObj.kanjiForms![0]!;
                    let reading: Reading | undefined = wordObj.readings.find((reading: Reading) => reading.notes && reading.notes.some((note: string) => note.toLowerCase().startsWith('reading restricted to ') && note.endsWith(kanjiForm.kanjiForm)));
                    let translation: Translation | undefined = wordObj.translations.find((translation: Translation) => translation.notes && translation.notes.some((note: string) => note.toLowerCase().startsWith('meaning restricted to ') && (note.endsWith(kanjiForm.kanjiForm) || (reading && note.endsWith(reading.reading)))));

                    if (!reading) reading = wordObj.readings[0]!;
                    if (!translation) translation = wordObj.translations[0]!;

                    return { kanjiForms: [kanjiForm], readings: [reading], translations: [translation] };
                });

                if (kanjiWords.length !== 3) {
                    let wordNumber: number = 3 - kanjiWords.length;

                    kanjiWords = jmDict.filter((word: DictWord) => word.kanjiForms && word.kanjiForms.some((kanjiForm: DictKanjiForm) => kanjiForm.form.includes(kanji.kanji))).map((word: DictWord) => {
                        let wordObj = getWord(undefined, undefined, undefined, undefined, word);

                        if (!wordObj.translations) throw new Error(`Invalid word: ${word.id}`);

                        let kanjiForm: KanjiForm | undefined = wordObj.kanjiForms!.find((kanjiForm: KanjiForm) => kanjiForm.kanjiForm.includes(kanji.kanji));
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

                    let svg: string | undefined = svgList.find((svgFile: string) => svgFile.toLowerCase() === `0${codePoint}.svg` || svgFile.toLowerCase() === `${codePoint}.svg`);

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
    } catch (err) {
        throw err;
    }
}

export function getKanjiExtended(kanjiChar: string, info: Kanji, dict: DictKanji[], useJpdbWords?: true | undefined, jmDict?: DictWord[] | undefined, svgList?: string[] | undefined): Kanji {
    try {
        let kanji: Kanji = getKanji(kanjiChar, dict, jmDict, svgList);

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

export async function getJLPTVocab(): Promise<void> {
    return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
        try {
            console.log('\nBuilding JLPT vocab');

            let jmDict: DictWord[] = getDict('JMDict') as DictWord[];
            let kanjiDic: DictKanji[] = getDict('Kanjidic') as DictKanji[];
            let tanaka: TanakaExample[] = getDict('tanaka') as TanakaExample[];

            let idsPath: string = `${resultPaths.vocabJLPT}/ids`;
            if (!existsSync(idsPath)) throw new Error('There are no JLPT vocab IDs files');

            let audioReadings: Word[] = [];

            if (checkExistenceOfResults(resultPaths.vocabJLPT, 'readings_with_audio', true)) loadEntries(resultPaths.vocabJLPT, 'readings_with_audio', audioReadings);
            else throw new Error('readings_with_audio does not exist');

            let kuroshiro = new Kuroshiro.default();
            await kuroshiro.init(new KuromojiAnalyzer());

            for (let filename of fileNames.vocabJLPT) {
                if (checkExistenceOfResults(resultPaths.vocabJLPT, filename)) { console.log(`Already got ${filename}`); continue; }

                console.log(`Parsing ${filename}`);

                let idFilePath: string = `${idsPath}/${filename}.json`;
                if (!existsSync(idFilePath)) throw new Error(`ID file does not exist: ${idFilePath}`);

                let idList: string[] = JSON.parse(readFileSync(idFilePath, 'utf-8')) as string[];

                let words: Word[] = [];

                for (let id of idList) {
                    if (typeof id !== 'string') throw new Error(`Invalid ID file: ${idFilePath}`);

                    let word = getWord(jmDict, id, kanjiDic, tanaka);

                    if (word.phrases) word.phrases = await Promise.all(word.phrases.map(async (phrase: Phrase) => { phrase.furigana = (await kuroshiro.convert(phrase.phrase, { to: 'hiragana', mode: 'spaced' })) as string; return phrase; }));

                    let audioReadingsWord: Word | undefined = audioReadings.find((audioWord: Word) => audioWord.noteID === word.noteID);

                    if (audioReadingsWord) word.readings = word.readings.map((reading: Reading) => {
                        let audioReading: Reading | undefined = audioReadingsWord.readings.find((rd: Reading) => rd.reading === reading.reading);

                        if (audioReading) reading.audio = audioReading.audio;

                        return reading;
                    });

                    words.push(word);
                }

                saveEntries(words, filename, resultPaths.vocabJLPT);
            }

            resolve();
        } catch (err: unknown) {
            reject(err);
        }
    });
}

export async function getJLPTKanji(): Promise<void> {
    return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
        try {
            console.log('\nBuilding JLPT kanji');

            let kanjiDic: DictKanji[] = getDict('Kanjidic') as DictKanji[];
            let jmDict: DictWord[] = getDict('JMDict') as DictWord[];

            let kanjiPath: string = `${resultPaths.kanjiJLPT}/kanji`;

            if (!existsSync(kanjiPath)) throw new Error('There are no JLPT kanji files');
            if (!existsSync(jpdbFile)) throw new Error('The jpdb file does not exist');
            if (!existsSync(svgDir)) throw new Error('The SVG folder does not exist');

            let jpdb: Kanji[] = JSON.parse(readFileSync(jpdbFile, 'utf-8')) as Kanji[];
            let svgList: string[] = readdirSync(svgDir, 'utf-8');

            for (let filename of fileNames.kanjiJLPT) {
                if (checkExistenceOfResults(resultPaths.kanjiJLPT, filename)) { console.log(`Already got ${filename}`); continue; }

                console.log(`Parsing ${filename}`);

                let kanjiFilePath: string = `${kanjiPath}/${filename}.json`;
                if (!existsSync(kanjiFilePath)) throw new Error(`Kanji file does not exist: ${kanjiFilePath}`);

                let kanjiList: string[] = JSON.parse(readFileSync(kanjiFilePath, 'utf-8')) as string[];

                let kanjis: Kanji[] = [];

                for (let char of kanjiList) {
                    if (typeof char !== 'string') throw new Error(`Invalid ID file: ${kanjiFilePath}`);

                    let kanji: Kanji | undefined = undefined;

                    let jpdbKanji: Kanji | undefined = jpdb.find((kanji: Kanji) => {
                        if (kanji.kanji === undefined) throw new Error('Invalid jpdb file');

                        return (kanji.kanji === char && (kanji.components || kanji.mnemonic || kanji.words))
                    });

                    if (jpdbKanji) kanji = getKanjiExtended(char, jpdbKanji, kanjiDic, true, jmDict, svgList);
                    else kanji = getKanji(char, kanjiDic, jmDict, svgList);

                    if ((kanji.onyomi || kanji.kunyomi) && kanji.meanings) kanjis.push(kanji);
                }

                saveEntries(kanjis, filename, resultPaths.kanjiJLPT);
            }

            resolve();
        } catch (err: unknown) {
            reject(err);
        }
    });
}

export function getRadicals(): void {
    console.log('\nBuilding radicals');

    if (checkExistenceOfResults(resultPaths.radicals, 'radicals')) console.log('Already got radicals');
    else throw new Error('Could not find radicals JSON file');

    // Add "used-in" kanji and mnemonic for each radical from the jpdb radicals JSON file
    if (undefined === null) {
        if (!existsSync(jpdbRadicalsFile)) throw new Error('The jpdb radicals file does not exist');

        let jpdbRadicals: Radical[] = JSON.parse(readFileSync(jpdbRadicalsFile, 'utf-8')) as Radical[];

        let radicals: Radical[] = [];

        loadEntries(resultPaths.radicals, 'radicals', radicals);

        radicals = radicals.map((radical: Radical) => {
            let jpdbRadical: Radical | undefined = jpdbRadicals.find((obj: Radical) => obj.radical === radical.radical);

            if (jpdbRadical) {
                if (jpdbRadical.kanji && jpdbRadical.kanji.length > 0) radical.kanji = jpdbRadical.kanji;
                if (jpdbRadical.mnemonic) radical.mnemonic = jpdbRadical.mnemonic;
            }

            return radical;
        });

        saveEntries(radicals, 'radicals', resultPaths.radicals);
    }
}

export function getKanas(): void {
    console.log('\nBuilding kana');

    for (let filename of fileNames.kana)
        if (checkExistenceOfResults(resultPaths.kana, filename)) console.log(`Already got ${filename}`);
        else throw new Error(`Could not find ${filename} JSON file`);
}

export async function getGrammar() {
    console.log('\nBuilding grammar');

    for (let filename of fileNames.grammar)
        if (checkExistenceOfResults(resultPaths.grammar, filename)) console.log(`Already got ${filename}`);
        else throw new Error(`Could not find ${filename} JSON files`);
}

export async function getExtraKanji(): Promise<void> {
    return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
        try {
            console.log('\nBuilding extra kanji');

            if (checkExistenceOfResults(resultPaths.extraKanji, 'extra_kanji') && checkExistenceOfResults(resultPaths.extraKanji, 'extra_kanji_words')) {
                resolve(console.log('Already got extra_kanji and extra_kanji_words'));
                return;
            }

            let kanjiDic: DictKanji[] = getDict('Kanjidic') as DictKanji[];
            let jmDict: DictWord[] = getDict('JMDict') as DictWord[];
            let tanaka: TanakaExample[] = getDict('tanaka') as TanakaExample[];

            let kanjiToWordsMap = new Map<string, string[]>();

            for (let word of jmDict) if (word.kanjiForms) for (let kanjiForm of word.kanjiForms) {
                let kanjiChars = kanjiForm.form.split('');

                for (let char of kanjiChars) {
                    if (!kanjiToWordsMap.has(char)) kanjiToWordsMap.set(char, []);

                    if (!kanjiToWordsMap.get(char)!.includes(word.id)) kanjiToWordsMap.get(char)!.push(word.id);
                }
            }

            let ids: string[] = [];
            let kanji: Kanji[] = [];
            let kanjiWords: Word[] = [];
            let alreadyGotKanji: string[] = [];

            let jlptKanji: Kanji[] | string[] = [];

            loadEntries(resultPaths.kanjiJLPT, fileNames.kanjiJLPT, jlptKanji as Kanji[]);
            loadEntries(resultPaths.vocabJLPT, fileNames.vocabJLPT, undefined, ids);

            jlptKanji = (jlptKanji as Kanji[]).map((kanji: Kanji) => kanji.kanji);

            if (!existsSync(jpdbFile)) throw new Error('The jpdb file does not exist');

            let jpdb: Kanji[] = JSON.parse(readFileSync(jpdbFile, 'utf-8')) as Kanji[];

            for (let kanjiEntry of kanjiDic) {
                if (alreadyGotKanji.includes(kanjiEntry.kanji)) continue;

                let jpdbKanji: Kanji | undefined = jpdb.find((kanji: Kanji) => {
                    if (kanji.kanji === undefined) throw new Error('Invalid jpdb file');

                    return (kanji.kanji === kanjiEntry.kanji && (kanji.components || kanji.mnemonic || kanji.words))
                });

                let kanjiObj: Kanji | undefined = (!jlptKanji.includes(kanjiEntry.kanji)) ? (jpdbKanji) ? getKanjiExtended(kanjiEntry.kanji, jpdbKanji, kanjiDic, true, jmDict) : getKanji(kanjiEntry.kanji, kanjiDic, jmDict) : undefined;

                if (kanjiObj) {
                    if ((!kanjiObj.onyomi && !kanjiObj.kunyomi) || !kanjiObj.meanings) {
                        alreadyGotKanji.push(kanjiEntry.kanji);
                        continue;
                    }
                }

                console.log(`Searching: ${(!kanjiObj) ? `${kanjiEntry.kanji} (from JLPT list, not added to extra_kanji)` : `${kanjiEntry.kanji}`}`);

                let wordsForKanji: string[] = kanjiToWordsMap.get(kanjiEntry.kanji) || [];
                let filteredWords: Word[] = wordsForKanji.filter((id: string) => !ids.includes(id) && !kanjiWords.some((kanjiWord: Word) => kanjiWord.id === id)).map((id: string) => getWord(jmDict, id, kanjiDic, tanaka));

                filteredWords = filteredWords.filter((word: Word) => word.common === true || (word.phrases && word.phrases.length > 0));

                let kuroshiro: any = new Kuroshiro.default();
                await kuroshiro.init(new KuromojiAnalyzer());

                let words: Word[] = await Promise.all(filteredWords.map(async (word: Word) => {
                    if (word.phrases) word.phrases = await Promise.all(word.phrases.map(async (phrase: Phrase) => { phrase.furigana = (await kuroshiro.convert(phrase.phrase, { to: 'hiragana', mode: 'spaced' })) as string; return phrase; }));

                    if (word.id) ids.push(word.id);
                    return word;
                }));

                if (words.length > 0) {
                    if (kanjiObj) kanji.push(kanjiObj);
                    kanjiWords.push(...words);
                }

                if (kanjiObj) alreadyGotKanji.push(kanjiEntry.kanji);
            }

            if (kanji.length > 0) saveEntries(kanji, 'extra_kanji', resultPaths.extraKanji);
            if (kanjiWords.length > 0) saveEntries(kanjiWords, 'extra_kanji_words', resultPaths.extraKanji);

            resolve();
        } catch (err: unknown) {
            reject(err)
        }
    });
}

export async function getKanaWords(): Promise<void> {
    return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
        try {
            console.log('\nBuilding kana words');

            if (checkExistenceOfResults(resultPaths.kanaWords, 'kana_words')) {
                resolve(console.log(`Already got kana_words`));
                return;
            }

            let ids: string[] = [];
            let jmDict: DictWord[] = getDict('JMDict') as DictWord[];
            let tanaka: TanakaExample[] = getDict('tanaka') as TanakaExample[];

            let wordList: Word[] = [];

            if (checkExistenceOfResults(resultPaths.extraKanji, 'extra_kanji_words')) loadEntries(resultPaths.extraKanji, 'extra_kanji_words', undefined, ids);

            for (let jlptVocab of fileNames.vocabJLPT) {
                let existsVocabJlpt: boolean = checkExistenceOfResults(resultPaths.vocabJLPT, jlptVocab);

                if (existsVocabJlpt) loadEntries(resultPaths.vocabJLPT, jlptVocab, undefined, ids);
            }

            let kanaDictWords = jmDict.filter((word: DictWord) => !ids.includes(word.id));
            let kanaWords = kanaDictWords.map((word: DictWord) => getWord(undefined, undefined, undefined, tanaka, word))
            kanaWords = kanaWords.filter((word: Word) => word.kanji === undefined && (word.common === true || (word.phrases && word.phrases.length > 0)));

            let kuroshiro = new Kuroshiro.default();
            await kuroshiro.init(new KuromojiAnalyzer());

            kanaWords = await Promise.all(kanaWords.map(async (word: Word) => {
                if (word.phrases) word.phrases = await Promise.all(word.phrases.map(async (phrase: Phrase) => { phrase.furigana = (await kuroshiro.convert(phrase.phrase, { to: 'hiragana', mode: 'spaced' })) as string; return phrase; }));

                return word;
            }));

            wordList.push(...kanaWords);

            if (wordList.length > 0) saveEntries(wordList, 'kana_words', resultPaths.kanaWords);
            else throw new Error('Empty kana words list');

            resolve();
        } catch (err: unknown) {
            reject(err);
        }
    });
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

    let fields: string[] = [];

    if (isWord(entry)) {
        if (!entry.translations) throw new Error(`Invalid word: ${entry.noteID}`);

        let usuallyInKana: boolean = entry.translations.every((translation) => translation.notes && translation.notes.includes('Word usually written using kana alone'));

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
            (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="word word-phrase"><ruby><rb>${phraseEntry.phrase}</rb><rt>${phraseEntry.furigana!}</rt></ruby></span>`, [phraseEntry.translation], true)).join('') : '<span class="word word-phrase">(no phrases) (Search on dictionaries!)</span>',
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
        (entry.phrases) ? entry.phrases.map((phraseEntry: Phrase) => createEntry(`<span class="grammar grammar-phrase"><ruby><rb>${phraseEntry.phrase}</rb><rt>${phraseEntry.furigana!}</rt></ruby></span>`, [phraseEntry.translation], true)).join('') : '<span class="grammar grammar-phrase">(no phrases) (Search on dictionaries!)</span>',
        (entry.source) ? `<span class="grammar grammar-source"><a href="${entry.source}" target="_blank">Source</a></span>` : '<span class="grammar grammar-source">(no source)</span>',
        ...(entry.tags && entry.tags.length > 0) ? [entry.tags.map((tag: string) => tag.trim().toLowerCase().replaceAll(' ', '::')).join(' ')] : []
    );

    if (fields.length > 0) return fields.map((field: string) => field.replaceAll('\n', '<br>'));
    else throw new Error('Invalid entry');
}

export function generateAnkiNotesFile(list: Result[], filename: string): string | undefined {
    if (list.length > 0) {
        let headers: string[] = ['#separator:tab\n', '#html:true\n', '#guid column:1\n', '#notetype column:2\n', '#deck column:3\n'];

        let deck: string = `${deckName}::`;
        let filenameParts: string[] = filename.split('_');

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

        let ankiNotes: string = list.map((result: Result) => {
            if (!result.noteID) throw new Error('Invalid result');

            let note: string[] = generateAnkiNote(result);
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