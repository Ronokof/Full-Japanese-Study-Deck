import path from "path";

import {
  DictKanji,
  DictWord,
  KanjiEntryMap,
  KanjiSVGMap,
  KanjiWordsMap,
  TanakaExample,
  WordDefinitionPair,
  WordDefinitionsMap,
  EntryExamplesMap,
  WordIDEntryMap,
} from "henkan";
import { NoteTypes, SubDeckNames } from "./utils";

export const deckName: string =
  "Full Japanese Study Deck [JLPT N5~N1 vocab/kanji + common vocab and kanji + grammar]";

export const subDeckNames: SubDeckNames = {
  kana: {
    _: "0. Kana",
    hiragana: "Hiragana",
    hiraganaExtended: "Hiragana extended",
    katakana: "Katakana",
    katakanaExtended: "Katakana extended",
  },
  jlpt: {
    _: "1. JLPT / Core",
    kanji: {
      _: "Kanji",
      n5: "N5 / Starter",
      n4: "N4 / Beginner",
      n3: "N3 / Intermediate",
      n2: "N2 / Advanced",
      n1: "N1 / Expert",
    },
    vocab: {
      _: "Vocab",
      n5: "N5 / Starter",
      n4: "N4 / Beginner",
      n3: "N3 / Intermediate",
      n2: "N2 / Advanced",
      n1: "N1 / Expert",
    },
  },
  grammar: {
    _: "2. Grammar",
    n5: "N5 / Starter",
    n4: "N4 / Beginner",
    n3: "N3 / Intermediate",
    n2: "N2 / Advanced",
    n1: "N1 / Expert",
    additional: "Additional",
  },
  radicals: { _: "3. Kanji radicals (reference)" },
  kanaWords: { _: "4. Vocab with no kanji (mining/reference)" },
  extraKanji: {
    _: "5. Extra kanji (mining/reference)",
    kanji: "Kanji",
    vocab: "Vocab",
  },
};

export const noteTypes: NoteTypes = {
  grammar: "FJSD-Grammar",
  kana: "FJSD-Kana",
  kanji: "FJSD-Kanji",
  radical: "FJSD-Radical",
  word: "FJSD-Word",
};

export const dictsDir: string = path.resolve("./dicts");
export const svgDir: string = path.resolve("./svgs");
export const kanjiInfoFile: string = path.resolve("./results/kanji-info.json");
export const radicalInfoFile: string = path.resolve(
  "./results/radical-info.json",
);

export const dictsNames: {
  jmdict: string;
  kanjidic: string;
  tanaka: string;
  radk: string;
  krad: string;
  wordDefs: string;
} = {
  jmdict: "JMdict_e",
  kanjidic: "kanjidic2",
  tanaka: "tanaka_examples",
  radk: "radkfile2",
  krad: "kradfile2",
  wordDefs: "word_definitions",
};

export const dicts: {
  jmDict?:
    | {
        array: readonly DictWord[];
        idEntryMap: WordIDEntryMap;
        kanjiWordsMap: KanjiWordsMap;
      }
    | undefined;
  kanjiDic?:
    | {
        array: readonly DictKanji[];
        kanjiEntryMap: KanjiEntryMap;
      }
    | undefined;
  tanakaCorpus?:
    | {
        array: readonly TanakaExample[];
        wordExamplesMap: EntryExamplesMap;
      }
    | undefined;
  wordDefs?:
    | {
        array: readonly WordDefinitionPair[];
        wordDefinitionsMap: WordDefinitionsMap;
      }
    | undefined;
  svg_list?: { array: readonly string[]; kanjiSVGMap: KanjiSVGMap } | undefined;
} = {};

export const fileNames: {
  kana: string[];
  vocabJLPT: string[];
  kanjiJLPT: string[];
  grammar: string[];
} = {
  kana: ["hiragana", "hiragana_extended", "katakana", "katakana_extended"],
  vocabJLPT: ["vocab_n5", "vocab_n4", "vocab_n3", "vocab_n2", "vocab_n1"],
  kanjiJLPT: ["kanji_n5", "kanji_n4", "kanji_n3", "kanji_n2", "kanji_n1"],
  grammar: [
    "grammar_n5",
    "grammar_n4",
    "grammar_n3",
    "grammar_n2",
    "grammar_n1",
    "grammar_additional",
  ],
};

export const resultPaths: {
  vocabJLPT: string;
  kanjiJLPT: string;
  radicals: string;
  kana: string;
  grammar: string;
  extraKanji: string;
  kanaWords: string;
} = {
  vocabJLPT: path.resolve("./results/vocabJLPT"),
  kanjiJLPT: path.resolve("./results/kanjiJLPT"),
  radicals: path.resolve("./results/radicals"),
  kana: path.resolve("./results/kana"),
  grammar: path.resolve("./results/grammar"),
  extraKanji: path.resolve("./results/extra-kanji"),
  kanaWords: path.resolve("./results/kana-words"),
};
