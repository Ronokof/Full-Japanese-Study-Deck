import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { randomUUID, UUID } from "crypto";
import {
  convertJawiktionaryAsync,
  convertJMdict,
  convertKanjiDic,
  convertTanakaCorpusWithFurigana,
  createEntryMaps,
  DictKanji,
  DictKanjiForm,
  DictWord,
  EntryMaps,
  generateAnkiNotesFile,
  getKanji,
  getKanjiExtended,
  getValidForms,
  getWord,
  getWordDefinitionsWithFurigana,
  Grammar,
  JaWiktionaryEntry,
  Kana,
  Kanji,
  KanjiEntryMap,
  KanjiWordsMap,
  Radical,
  Reading,
  ReadingsKanjiFormsPair,
  regexps,
  Result,
  StringNumber,
  TanakaExample,
  Word,
  WordDefinitionPair,
  WordDefinitionsMap,
  WordExamplesMap,
  WordIDEntryMap,
} from "henkan";

import {
  PollyClient,
  SynthesizeSpeechCommand,
  SynthesizeSpeechCommandInput,
  SynthesizeSpeechCommandOutput,
} from "@aws-sdk/client-polly";
import {
  deckName,
  dicts,
  dictsDir,
  dictsNames,
  fileNames,
  kanjiInfoFile,
  noteTypes,
  radicalInfoFile,
  resultPaths,
  subDeckNames,
  svgDir,
} from "./constants";

export interface SubDeckNames {
  kana: {
    _: string;
    hiragana: string;
    hiraganaExtended: string;
    katakana: string;
    katakanaExtended: string;
  };
  jlpt: {
    _: string;
    kanji: {
      _: string;
      n5: string;
      n4: string;
      n3: string;
      n2: string;
      n1: string;
    };
    vocab: {
      _: string;
      n5: string;
      n4: string;
      n3: string;
      n2: string;
      n1: string;
    };
  };
  grammar: {
    _: string;
    n5: string;
    n4: string;
    n3: string;
    n2: string;
    n1: string;
    additional: string;
  };
  radicals: { _: string };
  kanaWords: { _: string };
  extraKanji: {
    _: string;
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

export async function convertDicts(): Promise<void> {
  if (!existsSync(`${dictsDir}/json`))
    mkdirSync(`${dictsDir}/json`, { recursive: true });

  console.log("\nConverting dictionary files\n");

  let tanakaArray: readonly TanakaExample[] = [];

  {
    const tanakaPath: string = `${dictsDir}/examples.utf`;
    const outputPath: string = `${dictsDir}/json/${dictsNames.tanaka}.json`;

    if (existsSync(outputPath)) {
      console.log("Already converted examples.utf");
      tanakaArray = Array.from(JSON.parse(readFileSync(outputPath, "utf-8")));
    } else if (existsSync(tanakaPath)) {
      console.log("Converting examples.utf");

      tanakaArray = await convertTanakaCorpusWithFurigana(
        readFileSync(tanakaPath, "utf-8"),
      );

      if (tanakaArray.length > 0)
        writeFileSync(
          outputPath,
          JSON.stringify(tanakaArray, undefined, "\t"),
          "utf-8",
        );
    }
  }

  let jmDict: readonly DictWord[] = [];

  {
    let jmdictPath: string = `${dictsDir}/JMdict_e`;
    const outputPath: string = `${dictsDir}/json/${dictsNames.jmdict}.json`;

    if (existsSync(outputPath)) {
      console.log("Already converted JMdict_e");
      jmDict = Array.from(JSON.parse(readFileSync(outputPath, "utf-8")));
    } else {
      console.log("Converting JMdict_e");

      if (!existsSync(jmdictPath)) jmdictPath += ".xml";

      jmDict = convertJMdict(readFileSync(jmdictPath, "utf-8"), tanakaArray);

      if (jmDict.length > 0)
        writeFileSync(
          outputPath,
          JSON.stringify(jmDict, undefined, "\t"),
          "utf-8",
        );
    }
  }

  let kanjiDic: readonly DictKanji[] = [];

  {
    const kanjiDicPath: string = `${dictsDir}/kanjidic2.xml`;
    const outputPath: string = `${dictsDir}/json/${dictsNames.kanjidic}.json`;

    if (existsSync(outputPath)) {
      console.log("Already converted kanjidic2");
      kanjiDic = Array.from(JSON.parse(readFileSync(outputPath, "utf-8")));
    } else {
      console.log("Converting kanjidic2");

      kanjiDic = convertKanjiDic(readFileSync(kanjiDicPath, "utf-8"));

      if (kanjiDic.length > 0)
        writeFileSync(
          outputPath,
          JSON.stringify(kanjiDic, undefined, "\t"),
          "utf-8",
        );
    }
  }

  let wordDefs: readonly WordDefinitionPair[] = [];

  {
    const jaWiktionaryPath: string = `${dictsDir}/raw-wiktextract-data.jsonl`;
    const outputPath: string = `${dictsDir}/json/${dictsNames.wordDefs}.json`;

    if (existsSync(outputPath)) {
      console.log("Already converted jawiktionary");
      wordDefs = Array.from(JSON.parse(readFileSync(outputPath, "utf-8")));
    } else if (existsSync(jaWiktionaryPath)) {
      console.log("Converting jawiktionary");

      const entries: JaWiktionaryEntry[] = await convertJawiktionaryAsync(
        createReadStream(jaWiktionaryPath, "utf-8"),
      );

      if (entries.length > 0) {
        wordDefs = await getWordDefinitionsWithFurigana(entries, jmDict);

        if (wordDefs.length > 0)
          writeFileSync(
            outputPath,
            JSON.stringify(wordDefs, undefined, "\t"),
            "utf-8",
          );
      }

      entries.length = 0;
    }
  }

  if (process.argv.slice(2).includes("--only-convert-dicts")) return;

  if (!existsSync(svgDir)) throw new Error(`${svgDir} does not exist`);

  const svg_list: string[] = readdirSync(svgDir, "utf-8");

  if (svg_list.length === 0) throw new Error(`${svgDir} is empty`);

  const entryMaps: EntryMaps = createEntryMaps(
    jmDict,
    kanjiDic,
    tanakaArray,
    wordDefs,
    svg_list,
  );

  if (
    entryMaps.kanjiEntryMap !== undefined &&
    entryMaps.kanjiSVGMap !== undefined &&
    entryMaps.kanjiWordsMap !== undefined &&
    entryMaps.wordDefinitionsMap !== undefined &&
    entryMaps.wordExamplesMap !== undefined &&
    entryMaps.wordIDEntryMap !== undefined &&
    jmDict.length > 0 &&
    kanjiDic.length > 0 &&
    tanakaArray.length > 0 &&
    wordDefs.length > 0 &&
    svg_list.length > 0
  ) {
    dicts.jmDict = {
      array: jmDict,
      idEntryMap: entryMaps.wordIDEntryMap,
      kanjiWordsMap: entryMaps.kanjiWordsMap,
    };
    dicts.kanjiDic = {
      array: kanjiDic,
      kanjiEntryMap: entryMaps.kanjiEntryMap,
    };
    dicts.tanakaCorpus = {
      array: tanakaArray,
      wordExamplesMap: entryMaps.wordExamplesMap,
    };
    dicts.wordDefs = {
      array: wordDefs,
      wordDefinitionsMap: entryMaps.wordDefinitionsMap,
    };
    dicts.svg_list = {
      array: svg_list,
      kanjiSVGMap: entryMaps.kanjiSVGMap,
    };
  } else throw new Error("Invalid dicts");
}

export function loadEntries(
  resultPath: string,
  filename: string | string[],
  list?: Result[],
  ids?: Set<string>,
): void {
  if (list === undefined && ids === undefined)
    throw new Error(
      "You must parse either a valid results list or a valid IDs list",
    );

  if (!existsSync(resultPath)) throw new Error(`${resultPath} does not exist`);

  const jsonDir: string = `${resultPath}/json`;
  if (!existsSync(jsonDir)) throw new Error(`${jsonDir} does not exist`);

  function parsePath(file: string): void {
    const filePath: string = `${jsonDir}/${file}.json`;

    if (!existsSync(filePath)) return;

    const results: Result[] = Array.from(
      JSON.parse(readFileSync(filePath, "utf-8")),
    );

    if (
      results.length > 0 &&
      results.every((result: Result) => typeof result === "object")
    ) {
      if (list !== undefined) list.push(...results);

      if (ids !== undefined) {
        const resultsWithIDs: Result[] = results.filter(
          (result: Result) => result.id !== undefined,
        );

        if (resultsWithIDs.length > 0) {
          const idsList: string[] = resultsWithIDs.map(
            (result: Result) => result.id!,
          );

          for (const id of idsList) ids.add(id);
        }
      }
    }
  }

  if (Array.isArray(filename)) for (const name of filename) parsePath(name);
  else parsePath(filename);
}

export function saveEntries(
  list: Result[],
  filename: string,
  resultPath: string,
  withoutNote?: true,
): void {
  if (list.length > 0) {
    if (filename.length === 0) throw new Error("Invalid filename");
    if (!existsSync(resultPath)) mkdirSync(resultPath, { recursive: true });

    const jsonDir: string = `${resultPath}/json`;
    if (!existsSync(jsonDir)) mkdirSync(jsonDir, { recursive: true });

    writeFileSync(
      `${jsonDir}/${filename}.json`,
      JSON.stringify(list, undefined, "\t"),
      "utf-8",
    );

    if (withoutNote === undefined)
      writeFileSync(
        `${resultPath}/${filename}.txt`,
        generateAnkiNotesFile(list),
        "utf-8",
      );

    console.log(`Saved ${filename} with ${list.length.toString()} entries\n`);
  }
}

export function checkExistenceOfResults(
  resultPath: string,
  filename: string | string[],
  withoutNote?: true,
): boolean {
  let exists: boolean = false;

  if (existsSync(resultPath)) {
    if (filename.length === 0) throw new Error("Invalid filename");

    const jsonDir: string = `${resultPath}/json`;

    const files: string[] = readdirSync(resultPath, {
      encoding: "utf-8",
      recursive: false,
    });
    const jsonFiles: string[] = existsSync(jsonDir)
      ? readdirSync(jsonDir, { encoding: "utf-8", recursive: false })
      : [];

    function parsePath(file: string): boolean {
      let fileExists: boolean = false;

      const jsonFile: string | undefined = jsonFiles.find(
        (f: string) => path.parse(f).name === file,
      );

      if (jsonFile !== undefined) {
        const jsonFileContent: Result[] = Array.from(
          JSON.parse(readFileSync(`${jsonDir}/${jsonFile}`, "utf-8")),
        );

        if (
          jsonFileContent.length > 0 &&
          jsonFileContent.every((result: Result) => typeof result === "object")
        ) {
          fileExists = true;

          if (withoutNote === undefined)
            writeFileSync(
              `${resultPath}/${path.parse(jsonFile).name}.txt`,
              generateAnkiNotesFile(jsonFileContent),
              "utf-8",
            );
        }
      }

      if (files.some((f: string) => file === path.parse(f).name))
        fileExists = true;

      return fileExists;
    }

    if (Array.isArray(filename))
      exists = filename.every((name: string) => parsePath(name));
    else exists = parsePath(filename);
  }

  return exists;
}

export async function synthesizeSpeech(
  client: PollyClient,
  input: string,
  options: Omit<SynthesizeSpeechCommandInput, "Text">,
): Promise<Buffer<ArrayBuffer> | null> {
  const command: SynthesizeSpeechCommand = new SynthesizeSpeechCommand({
    Text: input,
    ...options,
  });
  const response: SynthesizeSpeechCommandOutput = await client.send(command);
  const stream: Buffer<ArrayBuffer> | null =
    response.AudioStream !== undefined
      ? Buffer.from(await response.AudioStream.transformToByteArray())
      : null;

  return stream;
}

export async function generateAudio(client: PollyClient): Promise<void> {
  let count: number = 0;

  const resetCount: () => void = () => (count = 0);

  const kanaAudioPath: string = `${resultPaths.kana}/audio`;
  if (!existsSync(kanaAudioPath)) mkdirSync(kanaAudioPath, { recursive: true });

  for (const kanaPath of fileNames.kana) {
    const kana: Kana[] = [];
    loadEntries(resultPaths.kana, kanaPath, kana);

    for (let i: number = 0; i < kana.length; i++) {
      const char: Kana = kana[i]!;

      if (
        char.audio !== undefined &&
        existsSync(`${kanaAudioPath}/${char.audio}`)
      )
        continue;

      const id: UUID = randomUUID();

      const ssml: string = `<phoneme alphabet="x-amazon-yomigana" ph="${char.kana.replace("/", "・")}">${char.kana.replace("/", "・")}</phoneme>`;

      let audioBuffer: Buffer<ArrayBuffer> | null = null;

      while (audioBuffer === null)
        try {
          audioBuffer = await synthesizeSpeech(client, ssml, {
            TextType: "ssml",
            OutputFormat: "mp3",
            VoiceId: "Tomoko",
            Engine: "neural",
            LanguageCode: "ja-JP",
          }).catch((err: any) => {
            throw err;
          });
        } catch (err: unknown) {
          console.log(err);
        }

      if (audioBuffer.length === 0)
        throw new Error(`Invalid audio: ${char.kana}`);

      await writeFile(`${kanaAudioPath}/${id}.mp3`, audioBuffer);

      kana[i]!.audio = `${id}.mp3`;

      count++;

      if (count === 40)
        await new Promise((resolve: (value: unknown) => void) => {
          resetCount();
          setTimeout(resolve, 1000);
        });
    }

    saveEntries(kana, kanaPath, resultPaths.kana);
  }

  const jlptAudioPath: string = `${resultPaths.vocabJLPT}/audio`;
  if (!existsSync(jlptAudioPath)) mkdirSync(jlptAudioPath, { recursive: true });

  const readingsWithAudio: Word[] = [];
  if (
    checkExistenceOfResults(resultPaths.vocabJLPT, "readings_with_audio", true)
  )
    loadEntries(
      resultPaths.vocabJLPT,
      "readings_with_audio",
      readingsWithAudio,
    );

  const jmDict: WordIDEntryMap | undefined = dicts.jmDict?.idEntryMap;

  if (jmDict !== undefined)
    for (const vocabPath of fileNames.vocabJLPT) {
      const vocab: Word[] = [];
      loadEntries(resultPaths.vocabJLPT, vocabPath, vocab);

      for (let i: number = 0; i < vocab.length; i++) {
        const word: Word = vocab[i]!;

        const dictWord: DictWord | undefined = jmDict.get(word.id!);
        if (dictWord === undefined) throw new Error(`Invalid word: ${word.id}`);

        const readingsWithAudioWord: Word = {
          id: word.id,
          readings: [],
          translations: [],
        };

        const rkf: ReadingsKanjiFormsPair = getValidForms(
          dictWord.readings,
          dictWord.kanjiForms,
          dictWord.isCommon,
        );

        for (const validReading of rkf.readings) {
          let readingIndex: number = NaN;

          const wordReading: Reading | undefined = word.readings.find(
            (r: Reading, index: number) => {
              if (r.reading === validReading.reading) {
                readingIndex = index;

                return true;
              } else return false;
            },
          );

          const kanjiForm: DictKanjiForm | undefined =
            rkf.kanjiForms !== undefined
              ? (rkf.kanjiForms.find(
                  (kf: DictKanjiForm) =>
                    validReading.kanjiFormRestrictions !== undefined &&
                    validReading.kanjiFormRestrictions.some(
                      (r: string) => r === kf.form,
                    ),
                ) ?? rkf.kanjiForms[0])
              : undefined;

          if (
            wordReading !== undefined &&
            (wordReading.audio === undefined ||
              !existsSync(`${jlptAudioPath}/${wordReading.audio}`))
          )
            if (kanjiForm !== undefined) {
              const id: UUID = randomUUID();

              const ssml: string = `<phoneme alphabet="x-amazon-yomigana" ph="${wordReading.reading}">${kanjiForm.form}</phoneme>`;

              let audioBuffer: Buffer<ArrayBuffer> | null = null;

              while (audioBuffer === null)
                try {
                  audioBuffer = await synthesizeSpeech(client, ssml, {
                    TextType: "ssml",
                    OutputFormat: "mp3",
                    VoiceId: "Tomoko",
                    Engine: "neural",
                    LanguageCode: "ja-JP",
                  }).catch((err: any) => {
                    throw err;
                  });
                } catch (err: unknown) {
                  console.log(err);
                }

              if (audioBuffer.length === 0)
                throw new Error(
                  `Invalid audio: ${kanjiForm.form}-${wordReading.reading}`,
                );

              await writeFile(`${jlptAudioPath}/${id}.mp3`, audioBuffer);

              vocab[i]!.readings[readingIndex]!.audio = `${id}.mp3`;

              readingsWithAudioWord.readings.push(
                vocab[i]!.readings[readingIndex]!,
              );

              count++;

              if (count === 40)
                await new Promise((resolve: (value: unknown) => void) => {
                  resetCount();
                  setTimeout(resolve, 1000);
                });
            } else {
              const id: UUID = randomUUID();

              const ssml: string = `<phoneme alphabet="x-amazon-yomigana" ph="${wordReading.reading}">${wordReading.reading}</phoneme>`;

              let audioBuffer: Buffer<ArrayBuffer> | null = null;

              while (audioBuffer === null)
                try {
                  audioBuffer = await synthesizeSpeech(client, ssml, {
                    TextType: "ssml",
                    OutputFormat: "mp3",
                    VoiceId: "Tomoko",
                    Engine: "neural",
                    LanguageCode: "ja-JP",
                  }).catch((err: any) => {
                    throw err;
                  });
                } catch (err: unknown) {
                  console.log(err);
                }

              if (audioBuffer.length === 0)
                throw new Error(`Invalid audio: ${wordReading.reading}`);

              await writeFile(`${jlptAudioPath}/${id}.mp3`, audioBuffer);

              vocab[i]!.readings[readingIndex]!.audio = `${id}.mp3`;

              readingsWithAudioWord.readings.push(
                vocab[i]!.readings[readingIndex]!,
              );

              count++;

              if (count === 40)
                await new Promise((resolve: (value: unknown) => void) => {
                  resetCount();
                  setTimeout(resolve, 1000);
                });
            }
        }

        vocab[i]!.readings = vocab[i]!.readings.map((r: Reading) => {
          if (
            r.audio !== undefined &&
            !existsSync(`${jlptAudioPath}/${r.audio}`)
          )
            delete r.audio;

          return r;
        });

        if (readingsWithAudioWord.readings.length > 0)
          readingsWithAudio.push(readingsWithAudioWord);
      }

      saveEntries(vocab, vocabPath, resultPaths.vocabJLPT);
    }

  if (readingsWithAudio.length > 0)
    saveEntries(
      readingsWithAudio.toSorted(
        (a: Word, b: Word) => Number(a.id!) - Number(b.id!),
      ),
      "readings_with_audio",
      resultPaths.vocabJLPT,
      true,
    );
}

export function getJLPTVocab(): void {
  console.log("\nBuilding JLPT vocab");

  const idsPath: string = `${resultPaths.vocabJLPT}/ids`;
  if (!existsSync(idsPath))
    throw new Error("There are no JLPT vocab IDs files");

  const audioReadings: Word[] = [];

  if (
    checkExistenceOfResults(resultPaths.vocabJLPT, "readings_with_audio", true)
  )
    loadEntries(resultPaths.vocabJLPT, "readings_with_audio", audioReadings);

  const audioReadingIDs: Set<StringNumber> = new Set<StringNumber>(
    audioReadings.map((word: Word) => word.id!),
  );

  const tanaka: WordExamplesMap = new Map<StringNumber, TanakaExample[]>();

  for (const [id, exes] of dicts.tanakaCorpus!.wordExamplesMap)
    tanaka.set(
      id,
      exes.filter((ex: TanakaExample) => ex.furigana !== undefined),
    );

  const wordAudio: Map<string, Word> = new Map<string, Word>();
  const jmDict: WordIDEntryMap | undefined = dicts.jmDict?.idEntryMap;

  if (jmDict !== undefined)
    for (const entry of Array.from(jmDict.values()).filter((word: DictWord) =>
      audioReadingIDs.has(word.id),
    ))
      wordAudio.set(
        entry.id,
        audioReadings.find((w: Word) => w.id === entry.id)!,
      );

  const kanjiDic: KanjiEntryMap | undefined = dicts.kanjiDic?.kanjiEntryMap;
  const wordDefs: WordDefinitionsMap | undefined =
    dicts.wordDefs?.wordDefinitionsMap;

  if (
    jmDict !== undefined &&
    tanaka.size > 0 &&
    kanjiDic !== undefined &&
    wordDefs !== undefined
  )
    for (const filename of fileNames.vocabJLPT) {
      if (checkExistenceOfResults(resultPaths.vocabJLPT, filename)) {
        console.log(`Already got ${filename}`);
        continue;
      }

      console.log(`Parsing ${filename}`);

      const idFilePath: string = `${idsPath}/${filename}.json`;
      if (!existsSync(idFilePath))
        throw new Error(`ID file does not exist: ${idFilePath}`);

      const idList: StringNumber[] = Array.from(
        JSON.parse(readFileSync(idFilePath, "utf-8")),
      );

      const jlptWords: Word[] = [];

      let deck: string = `${deckName}::${subDeckNames.jlpt._}::${subDeckNames.jlpt.vocab._}::`;

      if (filename.endsWith("n5")) deck += subDeckNames.jlpt.vocab.n5;
      else if (filename.endsWith("n4")) deck += subDeckNames.jlpt.vocab.n4;
      else if (filename.endsWith("n3")) deck += subDeckNames.jlpt.vocab.n3;
      else if (filename.endsWith("n2")) deck += subDeckNames.jlpt.vocab.n2;
      else if (filename.endsWith("n1")) deck += subDeckNames.jlpt.vocab.n1;

      if (deck.endsWith("::")) throw new Error("Invalid deck name");

      let wordCount: number = 0;
      const idListLength: number = idList.length;

      for (const id of idList) {
        if (
          typeof id !== "string" ||
          !Number.isSafeInteger(Number.parseInt(id))
        )
          throw new Error(`Invalid ID file: ${idFilePath}`);

        console.log(
          `${((wordCount / idListLength) * 100).toFixed()}% Searching: ${id}`,
        );

        const word: Word | undefined = getWord(
          id,
          jmDict,
          kanjiDic,
          tanaka,
          wordDefs,
          noteTypes.word,
          deck,
        );
        if (word === undefined) throw new Error(`Invalid word: ${id}`);

        if (wordAudio.size > 0) {
          const audioReadingsWord: Word | undefined = wordAudio.get(id);

          if (audioReadingsWord !== undefined)
            word.readings = word.readings.map((reading: Reading) => {
              const audioReading: Reading | undefined =
                audioReadingsWord.readings.find(
                  (rd: Reading) => rd.reading === reading.reading,
                );

              if (audioReading !== undefined)
                reading.audio = audioReading.audio;

              return reading;
            });
          else throw new Error(`No audio for word: ${word.id}`);
        }

        jlptWords.push(word);

        wordCount++;
      }

      saveEntries(jlptWords, filename, resultPaths.vocabJLPT);
    }
}

export function getJLPTKanji(): void {
  console.log("\nBuilding JLPT kanji");

  const kanjiPath: string = `${resultPaths.kanjiJLPT}/kanji`;

  if (!existsSync(kanjiPath)) throw new Error("There are no JLPT kanji files");
  if (!existsSync(kanjiInfoFile))
    throw new Error("The kanji file does not exist");

  const kanjiInfoList: Map<string, Kanji> = new Map<string, Kanji>();

  const infoList: Kanji[] = Array.from(
    JSON.parse(readFileSync(kanjiInfoFile, "utf-8")),
  );

  for (const info of infoList) kanjiInfoList.set(info.kanji, info);

  const kanjiDic: KanjiEntryMap | undefined = dicts.kanjiDic?.kanjiEntryMap;
  const jmDict: KanjiWordsMap | undefined = dicts.jmDict?.kanjiWordsMap;
  const svg_list: readonly string[] | undefined = dicts.svg_list?.array;

  if (kanjiDic !== undefined && jmDict !== undefined && svg_list !== undefined)
    for (const filename of fileNames.kanjiJLPT) {
      if (checkExistenceOfResults(resultPaths.kanjiJLPT, filename)) {
        console.log(`Already got ${filename}`);
        continue;
      }

      console.log(`Parsing ${filename}`);

      const kanjiFilePath: string = `${kanjiPath}/${filename}.json`;
      if (!existsSync(kanjiFilePath))
        throw new Error(`Kanji file does not exist: ${kanjiFilePath}`);

      const kanjiList: string[] = Array.from(
        JSON.parse(readFileSync(kanjiFilePath, "utf-8")),
      );

      const jlptKanji: Kanji[] = [];

      let deck: string = `${deckName}::${subDeckNames.jlpt._}::${subDeckNames.jlpt.kanji._}::`;

      if (filename.endsWith("n5")) deck += subDeckNames.jlpt.kanji.n5;
      else if (filename.endsWith("n4")) deck += subDeckNames.jlpt.kanji.n4;
      else if (filename.endsWith("n3")) deck += subDeckNames.jlpt.kanji.n3;
      else if (filename.endsWith("n2")) deck += subDeckNames.jlpt.kanji.n2;
      else if (filename.endsWith("n1")) deck += subDeckNames.jlpt.kanji.n1;

      if (deck.endsWith("::")) throw new Error("Invalid deck name");

      let kanjiCount: number = 0;
      const kanjiListLength: number = kanjiList.length;

      for (const char of kanjiList) {
        if (typeof char !== "string")
          throw new Error(`Invalid kanji file: ${kanjiFilePath}`);

        console.log(
          `${((kanjiCount / kanjiListLength) * 100).toFixed()}% Searching: ${char}`,
        );

        let kanji: Kanji | undefined = undefined;

        const kanjiInfo: Kanji | undefined = kanjiInfoList.get(char);

        if (
          kanjiInfo !== undefined &&
          (kanjiInfo.components !== undefined ||
            kanjiInfo.mnemonic !== undefined ||
            kanjiInfo.words !== undefined)
        )
          kanji = getKanjiExtended(
            kanjiInfo,
            char,
            kanjiDic,
            true,
            jmDict,
            svg_list,
            noteTypes.kanji,
            deck,
            `https://jpdb.io/kanji/${char}`,
          );
        else
          kanji = getKanji(
            char,
            kanjiDic,
            jmDict,
            svg_list,
            noteTypes.kanji,
            deck,
          );
        if (kanji === undefined) throw new Error(`Invalid kanji: ${char}`);

        if (
          (kanji.onyomi !== undefined || kanji.kunyomi !== undefined) &&
          kanji.meanings !== undefined
        )
          jlptKanji.push(kanji);

        kanjiCount++;
      }

      saveEntries(jlptKanji, filename, resultPaths.kanjiJLPT);
    }
}

export function getRadicals(): void {
  console.log("\nBuilding radicals");

  if (checkExistenceOfResults(resultPaths.radicals, "radicals"))
    console.log("Already got radicals");
  else throw new Error("Could not find radicals JSON file");

  const radicalInfoList: Radical[] = existsSync(radicalInfoFile)
    ? Array.from(JSON.parse(readFileSync(radicalInfoFile, "utf-8")))
    : [];

  let radicals: Radical[] = [];

  loadEntries(resultPaths.radicals, "radicals", radicals);

  const deck: string = `${deckName}::${subDeckNames.radicals._}`;

  radicals = radicals.map((radical: Radical) => {
    const radicalInfo: Radical | undefined = radicalInfoList.find(
      (obj: Radical) => obj.radical === radical.radical,
    );

    if (radicalInfo !== undefined) {
      if (radicalInfo.kanji !== undefined && radicalInfo.kanji.length > 0)
        radical.kanji = radicalInfo.kanji;
      if (radicalInfo.mnemonic !== undefined && radicalInfo.mnemonic.length > 0)
        radical.mnemonic = radicalInfo.mnemonic;
    }

    radical.noteTypeName = noteTypes.radical;
    radical.deckPath = deck;

    return radical;
  });

  saveEntries(radicals, "radicals", resultPaths.radicals);
}

export function getKanas(): void {
  console.log("\nBuilding kana");

  for (const filename of fileNames.kana)
    if (checkExistenceOfResults(resultPaths.kana, filename))
      console.log(`Already got ${filename}`);
    else throw new Error(`Could not find ${filename} JSON file`);

  for (const filename of fileNames.kana) {
    let kana: Kana[] = [];

    loadEntries(resultPaths.kana, filename, kana);

    let deck: string = `${deckName}::${subDeckNames.kana._}::`;

    if (filename === "hiragana") deck += subDeckNames.kana.hiragana;
    else if (filename === "hiragana_extended")
      deck += subDeckNames.kana.hiraganaExtended;
    else if (filename === "katakana") deck += subDeckNames.kana.katakana;
    else if (filename === "katakana_extended")
      deck += subDeckNames.kana.katakanaExtended;

    if (deck.endsWith("::")) throw new Error("Invalid deck name");

    kana = kana.map((char: Kana) => {
      char.noteTypeName = noteTypes.kana;
      char.deckPath = deck;

      return char;
    });

    saveEntries(kana, filename, resultPaths.kana);
  }
}

export function getGrammar(): void {
  console.log("\nBuilding grammar");

  for (const filename of fileNames.grammar)
    if (checkExistenceOfResults(resultPaths.grammar, filename))
      console.log(`Already got ${filename}`);
    else throw new Error(`Could not find ${filename} JSON files`);

  for (const filename of fileNames.grammar) {
    let grammar: Grammar[] = [];

    loadEntries(resultPaths.grammar, filename, grammar);

    let deck: string = `${deckName}::${subDeckNames.grammar._}::`;

    if (filename === "grammar_n5") deck += subDeckNames.grammar.n5;
    else if (filename === "grammar_n4") deck += subDeckNames.grammar.n4;
    else if (filename === "grammar_n3") deck += subDeckNames.grammar.n3;
    else if (filename === "grammar_n2") deck += subDeckNames.grammar.n2;
    else if (filename === "grammar_n1") deck += subDeckNames.grammar.n1;
    else if (filename === "grammar_additional")
      deck += subDeckNames.grammar.additional;

    if (deck.endsWith("::")) throw new Error("Invalid deck name");

    grammar = grammar.map((point: Grammar) => {
      point.noteTypeName = noteTypes.grammar;
      point.deckPath = deck;

      return point;
    });

    saveEntries(grammar, filename, resultPaths.grammar);
  }
}

export function getExtraKanji(): void {
  console.log("\nBuilding extra kanji");

  if (
    checkExistenceOfResults(resultPaths.extraKanji, [
      "extra_kanji",
      "extra_kanji_words",
    ])
  ) {
    console.log("Already got extra_kanji and extra_kanji_words");
    return;
  }

  const tanaka: WordExamplesMap = new Map<StringNumber, TanakaExample[]>();

  for (const [id, exes] of dicts.tanakaCorpus!.wordExamplesMap)
    tanaka.set(
      id,
      exes.filter((ex: TanakaExample) => ex.furigana !== undefined),
    );

  const ids: Set<string> = new Set<string>();

  loadEntries(resultPaths.vocabJLPT, fileNames.vocabJLPT, undefined, ids);

  const dictKanji: Set<string> = new Set<string>(
    dicts.kanjiDic!.array.map((entry: DictKanji) => entry.kanji),
  );

  const kanjiDic: KanjiEntryMap | undefined = dicts.kanjiDic?.kanjiEntryMap;
  const wordDefs: WordDefinitionsMap | undefined =
    dicts.wordDefs?.wordDefinitionsMap;

  const jmDict: KanjiWordsMap = new Map<string, DictWord[]>();

  const kanjiWordsMap: KanjiWordsMap | undefined = dicts.jmDict?.kanjiWordsMap;

  if (kanjiWordsMap !== undefined)
    for (const [kanji, words] of kanjiWordsMap)
      jmDict.set(
        kanji,
        words.filter(
          (word: DictWord) =>
            !ids.has(word.id) &&
            (word.isCommon === true || word.hasPhrases === true) &&
            word.kanjiForms !== undefined &&
            word.kanjiForms.some((kf: DictKanjiForm) =>
              kf.form.split("").some((char: string) => dictKanji.has(char)),
            ),
        ),
      );

  const kanji: Kanji[] = [];
  const kanjiWords: Word[] = [];

  let jlptKanji: Kanji[] | Set<string> = [];

  loadEntries(resultPaths.kanjiJLPT, fileNames.kanjiJLPT, jlptKanji);

  jlptKanji = new Set<string>(jlptKanji.map((char: Kanji) => char.kanji));

  if (!existsSync(kanjiInfoFile))
    throw new Error("The kanji info file does not exist");

  const kanjiInfoList: Map<string, Kanji> = new Map<string, Kanji>();

  const infoList: Kanji[] = Array.from(
    JSON.parse(readFileSync(kanjiInfoFile, "utf-8")),
  );

  for (const info of infoList) kanjiInfoList.set(info.kanji, info);

  const kanjiDeck: string = `${deckName}::${subDeckNames.extraKanji._}::${subDeckNames.extraKanji.kanji}`;
  const vocabDeck: string = `${deckName}::${subDeckNames.extraKanji._}::${subDeckNames.extraKanji.vocab}`;

  let kanjiCount: number = 0;

  const kanjiDicLength: number = dicts.kanjiDic!.array.length;

  ids.clear();

  if (
    jmDict.size > 0 &&
    tanaka.size > 0 &&
    kanjiDic !== undefined &&
    wordDefs !== undefined
  )
    for (const kanjiEntry of dicts.kanjiDic!.array) {
      if (!jmDict.has(kanjiEntry.kanji)) {
        kanjiCount++;
        continue;
      }

      const kanjiInfo: Kanji | undefined = kanjiInfoList.get(kanjiEntry.kanji);

      const kanjiObj: Kanji | undefined = !jlptKanji.has(kanjiEntry.kanji)
        ? kanjiInfo !== undefined &&
          (kanjiInfo.components !== undefined ||
            kanjiInfo.mnemonic !== undefined ||
            kanjiInfo.words !== undefined)
          ? getKanjiExtended(
              kanjiInfo,
              kanjiEntry,
              undefined,
              true,
              jmDict,
              undefined,
              noteTypes.kanji,
              kanjiDeck,
              `https://jpdb.io/kanji/${kanjiEntry.kanji}`,
            )
          : getKanji(
              kanjiEntry,
              undefined,
              jmDict,
              undefined,
              noteTypes.kanji,
              kanjiDeck,
            )
        : undefined;
      if (
        kanjiObj !== undefined &&
        ((kanjiObj.onyomi === undefined && kanjiObj.kunyomi === undefined) ||
          kanjiObj.meanings === undefined)
      ) {
        kanjiCount++;
        continue;
      }

      console.log(
        `${Math.round((kanjiCount / kanjiDicLength) * 100)}% Searching: ${kanjiObj === undefined ? `${kanjiEntry.kanji} (from JLPT list; not creating note for it)` : kanjiEntry.kanji}`,
      );

      const wordsForKanji: readonly DictWord[] | undefined = jmDict.get(
        kanjiEntry.kanji,
      );
      if (wordsForKanji === undefined) {
        kanjiCount++;
        continue;
      }

      let foundWord: boolean = false;

      for (const dictWord of wordsForKanji) {
        if (ids.has(dictWord.id)) continue;

        const word: Word | undefined = getWord(
          dictWord,
          undefined,
          kanjiDic,
          tanaka,
          wordDefs,
          noteTypes.word,
          vocabDeck,
        );
        if (word === undefined) throw new Error(`Invalid word: ${dictWord.id}`);

        if (
          (word.common === true ||
            (word.phrases !== undefined && word.phrases.length > 0)) &&
          word.id !== undefined
        ) {
          if (!foundWord) foundWord = true;

          ids.add(word.id);
          kanjiWords.push(word);
        }
      }

      if (foundWord && kanjiObj !== undefined) kanji.push(kanjiObj);

      kanjiCount++;
    }

  if (kanji.length > 0)
    saveEntries(kanji, "extra_kanji", resultPaths.extraKanji);
  if (kanjiWords.length > 0)
    saveEntries(kanjiWords, "extra_kanji_words", resultPaths.extraKanji);
}

export function getKanaWords(): void {
  console.log("\nBuilding kana words");

  if (checkExistenceOfResults(resultPaths.kanaWords, "kana_words")) {
    console.log(`Already got kana_words`);
    return;
  }

  const ids: Set<string> = new Set<string>();

  const tanaka: WordExamplesMap = new Map<StringNumber, TanakaExample[]>();

  for (const [id, exes] of dicts.tanakaCorpus!.wordExamplesMap)
    tanaka.set(
      id,
      exes.filter((ex: TanakaExample) => ex.furigana !== undefined),
    );

  const wordList: Word[] = [];

  if (checkExistenceOfResults(resultPaths.extraKanji, "extra_kanji_words"))
    loadEntries(resultPaths.extraKanji, "extra_kanji_words", undefined, ids);
  if (checkExistenceOfResults(resultPaths.vocabJLPT, fileNames.vocabJLPT))
    loadEntries(resultPaths.vocabJLPT, fileNames.vocabJLPT, undefined, ids);

  const deck: string = `${deckName}::${subDeckNames.kanaWords._}`;

  const kanjiDic: KanjiEntryMap | undefined = dicts.kanjiDic?.kanjiEntryMap;
  const wordDefs: WordDefinitionsMap | undefined =
    dicts.wordDefs?.wordDefinitionsMap;

  const jmDict: DictWord[] | undefined = dicts.jmDict?.array.filter(
    (word: DictWord) =>
      !ids.has(word.id) &&
      (word.isCommon === true || word.hasPhrases === true) &&
      (word.kanjiForms === undefined ||
        word.kanjiForms.every(
          (kf: DictKanjiForm) => !regexps.kanji.test(kf.form),
        )),
  );

  if (
    jmDict !== undefined &&
    tanaka.size > 0 &&
    kanjiDic !== undefined &&
    wordDefs !== undefined
  ) {
    const jmDictLength: number = jmDict.length;
    let wordCount: number = 0;

    for (const dictWord of jmDict) {
      console.log(
        `${Math.round((wordCount / jmDictLength) * 100)}% Searching: ${dictWord.id}`,
      );

      const word: Word | undefined = getWord(
        dictWord,
        undefined,
        kanjiDic,
        tanaka,
        wordDefs,
        noteTypes.word,
        deck,
      );
      if (word === undefined) throw new Error(`Invalid word: ${dictWord.id}`);

      if (
        word.kanji === undefined &&
        (word.common === true ||
          (word.phrases !== undefined && word.phrases.length > 0))
      )
        wordList.push(word);

      wordCount++;
    }

    if (wordList.length > 0)
      saveEntries(wordList, "kana_words", resultPaths.kanaWords);
    else throw new Error("Empty kana words list");
  }
}

export function getEntries(): void {
  getJLPTVocab();
  getJLPTKanji();
  getRadicals();
  getKanas();
  getGrammar();
  getExtraKanji();
  getKanaWords();
}
