import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { randomUUID, UUID } from "crypto";
import { PollyClient } from "@aws-sdk/client-polly";
import {
  convertJMdict,
  convertKanjiDic,
  convertKradFile,
  convertRadkFile,
  convertTanakaCorpus,
  Dict,
  DictKanji,
  DictKanjiReadingMeaning,
  DictKanjiReadingMeaningGroup,
  DictKanjiWithRadicals,
  DictRadical,
  DictWord,
  generateAnkiNotesFile,
  getKanji,
  getKanjiExtended,
  getWord,
  Grammar,
  isValidArray,
  Kana,
  Kanji,
  KanjiForm,
  makeSSML,
  Radical,
  Reading,
  Result,
  shuffleArray,
  synthesizeSpeech,
  TanakaExample,
  Translation,
  Word,
} from "henkan";

import {
  deckName,
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

export type DictName = "JMDict" | "Kanjidic" | "tanaka" | "radk" | "krad";

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
  return await new Promise<void>(
    async (
      resolve: (value: void | PromiseLike<void>) => void,
      reject: (reason?: any) => void,
    ) => {
      try {
        if (!existsSync(`${dictsDir}/json`))
          mkdirSync(`${dictsDir}/json`, { recursive: true });

        console.log("\nConverting dictionary files\n");

        let tanakaArray: TanakaExample[] | undefined = undefined;

        {
          const tanakaPath: string = `${dictsDir}/examples.utf`;
          const outputPath: string = `${dictsDir}/json/tanaka_examples.json`;

          if (existsSync(outputPath)) {
            console.log("Already converted examples.utf");
            tanakaArray = getDict("tanaka") as TanakaExample[];
          } else if (existsSync(tanakaPath)) {
            console.log("Converting examples.utf");

            tanakaArray = await convertTanakaCorpus(
              readFileSync(tanakaPath, "utf-8"),
              true,
            );

            if (tanakaArray.length > 0)
              writeFileSync(
                outputPath,
                JSON.stringify(tanakaArray, undefined, "\t"),
                "utf-8",
              );
          }
        }

        {
          const outputPath: string = `${dictsDir}/json/JMdict_e.json`;

          if (existsSync(outputPath)) console.log("Already converted JMdict_e");
          else {
            console.log("Converting JMdict_e");

            let dictPath: string = `${dictsDir}/JMdict_e`;
            if (!existsSync(dictPath)) dictPath += ".xml";

            const dictFile: string = readFileSync(dictPath, "utf-8");
            const jmDict: DictWord[] = convertJMdict(dictFile, tanakaArray);

            if (jmDict.length > 0)
              writeFileSync(
                outputPath,
                JSON.stringify(jmDict, undefined, "\t"),
                "utf-8",
              );
          }
        }

        {
          const outputPath: string = `${dictsDir}/json/kanjidic2.json`;

          if (existsSync(outputPath))
            console.log("Already converted kanjidic2");
          else {
            console.log("Converting kanjidic2");

            const dictFile: string = readFileSync(
              `${dictsDir}/kanjidic2.xml`,
              "utf-8",
            );
            const kanjiDic: DictKanji[] = convertKanjiDic(dictFile);

            if (kanjiDic.length > 0)
              writeFileSync(
                outputPath,
                JSON.stringify(kanjiDic, undefined, "\t"),
                "utf-8",
              );
          }
        }

        const kanjiDic: DictKanji[] = getDict("Kanjidic") as DictKanji[];

        {
          const radkfile2Path: string = `${dictsDir}/kradzip/radkfile2`;
          const outputPath: string = `${dictsDir}/json/radkfile2.json`;

          if (existsSync(outputPath))
            console.log("Already converted radkfile2");
          else if (existsSync(radkfile2Path)) {
            console.log("Converting radkfile2");

            const radicals: DictRadical[] = convertRadkFile(
              readFileSync(radkfile2Path),
              kanjiDic,
            );

            if (radicals.length > 0)
              writeFileSync(
                outputPath,
                JSON.stringify(radicals, undefined, "\t"),
                "utf-8",
              );
          }
        }

        {
          const kradfile2Path: string = `${dictsDir}/kradzip/kradfile2`;
          const outputPath: string = `${dictsDir}/json/kradfile2.json`;

          if (existsSync(outputPath))
            console.log("Already converted kradfile2");
          else if (existsSync(kradfile2Path)) {
            console.log("Converting kradfile2");

            const katakana: Kana[] = [];
            loadEntries(resultPaths.kana, "katakana", katakana);

            const kanjiWithRadicals: DictKanjiWithRadicals[] = convertKradFile(
              readFileSync(kradfile2Path),
              kanjiDic,
              katakana,
            );

            if (kanjiWithRadicals.length > 0)
              writeFileSync(
                outputPath,
                JSON.stringify(kanjiWithRadicals, undefined, "\t"),
                "utf-8",
              );

            katakana.length = 0;
          }
        }

        resolve();
      } catch (err: unknown) {
        reject(err);
      }
    },
  );
}

export function getDict(dict: DictName): Dict {
  try {
    let name: string = "";

    switch (dict) {
      case "JMDict":
        name = dictsNames.jmdict;
        break;
      case "Kanjidic":
        name = dictsNames.kanjidic;
        break;
      case "tanaka":
        name = dictsNames.tanaka;
        break;
      case "radk":
        name = dictsNames.radk;
        break;
      case "krad":
        name = dictsNames.krad;
        break;
    }

    const dictPath: string = `${dictsDir}/json/${name}.json`;

    if (existsSync(dictPath)) {
      const content: string = readFileSync(dictPath, "utf-8");

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

export async function generateAudio(client: PollyClient): Promise<void> {
  return new Promise<void>(
    async (
      resolve: (value: void | PromiseLike<void>) => void,
      reject: (reason?: any) => void,
    ) => {
      try {
        let count: number = 0;

        for (const kanaPath of fileNames.kana) {
          const kana: Kana[] = [];
          loadEntries(resultPaths.kana, kanaPath, kana);

          for (const char of kana) {
            const ssml: string = makeSSML(
              char.kana.replace("/", "・"),
              char.kana.replace("/", "・"),
            );

            const id: UUID = randomUUID();

            const audioBuffer: Buffer<ArrayBuffer> | null =
              await synthesizeSpeech(client, ssml, {
                OutputFormat: "mp3",
                VoiceId: "Tomoko",
                Engine: "neural",
                LanguageCode: "ja-JP",
              }).catch((err: any) => {
                throw err;
              });

            if (!audioBuffer) throw new Error(`Invalid audio: ${char.kana}`);

            await writeFile(`${resultPaths.kana}/${id}.mp3`, audioBuffer);

            char.audio = `${id}.mp3`;

            count++;

            if (count === 40)
              await new Promise((resolve: (value: unknown) => void) => {
                count = 0;
                setTimeout(resolve, 1000);
              });

            kana[
              kana.findIndex((kanaChar: Kana) => kanaChar.kana === char.kana)
            ] = char;
          }

          saveEntries(kana, kanaPath, resultPaths.kana);
        }

        for (const vocabPath of fileNames.vocabJLPT) {
          const vocab: Word[] = [];
          loadEntries(resultPaths.vocabJLPT, vocabPath, vocab);

          for (const word of vocab) {
            if (
              word.kanjiForms &&
              word.translations &&
              !word.translations.every(
                (translation: Translation) =>
                  translation.notes &&
                  translation.notes.includes(
                    "Usually written using kana alone",
                  ),
              )
            ) {
              const form: KanjiForm | undefined = word.kanjiForms[0];
              const firstReading: Reading | undefined = word.readings[0];

              if (form && firstReading) {
                const ssml: string = makeSSML(
                  form.kanjiForm,
                  firstReading.reading,
                );

                const id: UUID = randomUUID();

                const audioBuffer: Buffer<ArrayBuffer> | null =
                  await synthesizeSpeech(client, ssml, {
                    OutputFormat: "mp3",
                    VoiceId: "Tomoko",
                    Engine: "neural",
                    LanguageCode: "ja-JP",
                  }).catch((err: any) => {
                    throw err;
                  });

                if (!audioBuffer)
                  throw new Error(
                    `Invalid audio: ${form.kanjiForm}-${firstReading.reading}`,
                  );

                await writeFile(
                  `${resultPaths.vocabJLPT}/${id}.mp3`,
                  audioBuffer,
                );

                word.readings[0]!.audio = `${id}.mp3`;

                count++;

                if (count === 40)
                  await new Promise((resolve: (value: unknown) => void) => {
                    count = 0;
                    setTimeout(resolve, 1000);
                  });
              }

              const restrictedReadings: Reading[] = word.readings.filter(
                (reading: Reading) =>
                  reading.notes &&
                  reading.notes.some((note: string) =>
                    note.startsWith("Reading restricted to "),
                  ),
              );

              for (const rr of restrictedReadings) {
                const kanjiForm: string | undefined = rr
                  .notes!.find((note: string) =>
                    note.startsWith("Reading restricted to "),
                  )!
                  .split(" to ")[1];

                if (kanjiForm) {
                  const ssml: string = makeSSML(kanjiForm, rr.reading);

                  const id: UUID = randomUUID();

                  const audioBuffer: Buffer<ArrayBuffer> | null =
                    await synthesizeSpeech(client, ssml, {
                      OutputFormat: "mp3",
                      VoiceId: "Tomoko",
                      Engine: "neural",
                      LanguageCode: "ja-JP",
                    }).catch((err: any) => {
                      throw err;
                    });

                  if (!audioBuffer)
                    throw new Error(
                      `Invalid audio: ${kanjiForm}-${rr.reading}`,
                    );

                  await writeFile(
                    `${resultPaths.vocabJLPT}/${id}.mp3`,
                    audioBuffer,
                  );

                  word.readings[
                    word.readings.findIndex(
                      (wordReading: Reading) =>
                        wordReading.reading === rr.reading,
                    )
                  ]!.audio = `${id}.mp3`;

                  count++;

                  if (count === 40)
                    await new Promise((resolve: (value: unknown) => void) => {
                      count = 0;
                      setTimeout(resolve, 1000);
                    });
                }
              }
            } else
              for (const reading of word.readings) {
                const ssml: string = makeSSML(reading.reading, reading.reading);

                const id: UUID = randomUUID();

                const audioBuffer: Buffer<ArrayBuffer> | null =
                  await synthesizeSpeech(client, ssml, {
                    OutputFormat: "mp3",
                    VoiceId: "Tomoko",
                    Engine: "neural",
                    LanguageCode: "ja-JP",
                  }).catch((err: any) => {
                    throw err;
                  });

                if (!audioBuffer)
                  throw new Error(`Invalid audio: ${reading.reading}`);

                await writeFile(
                  `${resultPaths.vocabJLPT}/${id}.mp3`,
                  audioBuffer,
                );

                word.readings[
                  word.readings.findIndex(
                    (wordReading: Reading) =>
                      wordReading.reading === reading.reading,
                  )
                ]!.audio = `${id}.mp3`;

                count++;

                if (count === 40)
                  await new Promise((resolve: (value: unknown) => void) => {
                    count = 0;
                    setTimeout(resolve, 1000);
                  });
              }

            vocab[
              vocab.findIndex((vocabWord: Word) => vocabWord.id === word.id)
            ] = word;
          }

          saveEntries(vocab, vocabPath, resultPaths.vocabJLPT);
        }

        resolve();
      } catch (err: unknown) {
        reject(err);
      }
    },
  );
}

export function saveEntries(
  list: Result[],
  filename: string,
  resultPath: string,
  withoutNote?: true | undefined,
): void {
  try {
    if (list.length > 0) {
      if (!filename || filename.trim().length === 0)
        throw new Error("Invalid filename");
      if (!existsSync(resultPath)) mkdirSync(resultPath, { recursive: true });

      const jsonDir: string = `${resultPath}/json`;
      if (!existsSync(jsonDir)) mkdirSync(jsonDir, { recursive: true });

      writeFileSync(
        `${jsonDir}/${filename}.json`,
        JSON.stringify(list, undefined, "\t"),
        "utf-8",
      );

      if (withoutNote === undefined) {
        const ankiNotesFile: string | undefined = generateAnkiNotesFile(list);
        if (ankiNotesFile && ankiNotesFile.length > 0)
          writeFileSync(
            `${resultPath}/${filename}.txt`,
            ankiNotesFile,
            "utf-8",
          );
      }

      console.log(`Saved ${filename} with ${list.length.toString()} entries\n`);
    }
  } catch (err: unknown) {
    throw err;
  }
}

export function loadEntries(
  resultPath: string,
  filename: string | string[],
  list?: Result[] | undefined,
  ids?: Set<string> | undefined,
): void {
  try {
    if (list === undefined && ids === undefined)
      throw new Error(
        "You must parse either a valid results list or a valid IDs list",
      );

    if (!existsSync(resultPath))
      throw new Error(`${resultPath} does not exist`);

    const jsonDir: string = `${resultPath}/json`;
    if (!existsSync(jsonDir)) throw new Error(`${jsonDir} does not exist`);

    function parsePath(filename: string): void {
      const filePath: string = `${jsonDir}/${filename}.json`;

      if (!existsSync(filePath)) return;

      const results: Result[] | null | undefined = JSON.parse(
        readFileSync(filePath, "utf-8"),
      );

      if (
        results &&
        Array.isArray(results) &&
        results.every((result: Result) => typeof result === "object")
      ) {
        if (list) list.push(...results);

        if (ids) {
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
  } catch (err: unknown) {
    throw err;
  }
}

export function checkExistenceOfResults(
  resultPath: string,
  filename: string | string[],
  withoutNote?: true | undefined,
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

    function parsePath(filename: string): boolean {
      let exists: boolean = false;

      const jsonFile: string | undefined = jsonFiles.find(
        (file: string) => path.parse(file).name === filename,
      );

      if (jsonFile) {
        const jsonFileContent: Result[] | null | undefined = JSON.parse(
          readFileSync(`${jsonDir}/${jsonFile}`, "utf-8"),
        );

        if (
          jsonFileContent &&
          Array.isArray(jsonFileContent) &&
          jsonFileContent.every((result: Result) => typeof result === "object")
        ) {
          exists = true;

          if (withoutNote === undefined) {
            const ankiNotesFile: string | undefined =
              generateAnkiNotesFile(jsonFileContent);

            if (ankiNotesFile && ankiNotesFile.length > 0) {
              writeFileSync(
                `${resultPath}/${path.parse(jsonFile).name}.txt`,
                ankiNotesFile,
                "utf-8",
              );
            }
          }
        }
      }

      if (files.some((file: string) => filename === path.parse(file).name))
        exists = true;

      return exists;
    }

    if (Array.isArray(filename))
      exists = filename.every((name: string) => parsePath(name));
    else exists = parsePath(filename);
  }

  return exists;
}

export function getJLPTVocab(): void {
  try {
    console.log("\nBuilding JLPT vocab");

    const idsPath: string = `${resultPaths.vocabJLPT}/ids`;
    if (!existsSync(idsPath))
      throw new Error("There are no JLPT vocab IDs files");

    const audioReadings: Word[] = [];

    if (
      checkExistenceOfResults(
        resultPaths.vocabJLPT,
        "readings_with_audio",
        true,
      )
    )
      loadEntries(resultPaths.vocabJLPT, "readings_with_audio", audioReadings);
    else throw new Error("readings_with_audio JSON file does not exist");

    const jmDict: DictWord[] = getDict("JMDict") as DictWord[];
    const kanjiDic: DictKanji[] = getDict("Kanjidic") as DictKanji[];
    const tanaka: TanakaExample[] = shuffleArray<TanakaExample>(
      getDict("tanaka") as TanakaExample[],
    ).filter((ex: TanakaExample) => ex.furigana);

    for (const filename of fileNames.vocabJLPT) {
      if (checkExistenceOfResults(resultPaths.vocabJLPT, filename)) {
        console.log(`Already got ${filename}`);
        continue;
      }

      console.log(`Parsing ${filename}`);

      const idFilePath: string = `${idsPath}/${filename}.json`;
      if (!existsSync(idFilePath))
        throw new Error(`ID file does not exist: ${idFilePath}`);

      const idList: string[] = JSON.parse(
        readFileSync(idFilePath, "utf-8"),
      ) as string[];

      const words: Word[] = [];

      let deck: string = `${deckName}::${subDeckNames.jlpt._}::${subDeckNames.jlpt.vocab._}::`;

      if (filename.endsWith("n5")) deck += subDeckNames.jlpt.vocab.n5;
      else if (filename.endsWith("n4")) deck += subDeckNames.jlpt.vocab.n4;
      else if (filename.endsWith("n3")) deck += subDeckNames.jlpt.vocab.n3;
      else if (filename.endsWith("n2")) deck += subDeckNames.jlpt.vocab.n2;
      else if (filename.endsWith("n1")) deck += subDeckNames.jlpt.vocab.n1;

      if (deck.endsWith("::")) throw new Error("Invalid deck name");

      let wordCount: number = 0;
      const idListLength: number = idList.length;

      for (let i: number = 0; i < idListLength; i++) {
        const id: string | undefined = idList[i];
        if (typeof id !== "string")
          throw new Error(`Invalid ID file: ${idFilePath}`);

        console.log(
          `${((wordCount / idListLength) * 100).toFixed()}% Searching: ${id}`,
        );

        const word: Word = getWord(
          jmDict,
          id,
          kanjiDic,
          tanaka,
          undefined,
          noteTypes.word,
          deck,
        );

        const audioReadingsWord: Word | undefined = audioReadings.find(
          (audioWord: Word) => audioWord.noteID === word.noteID,
        );

        if (audioReadingsWord)
          word.readings = word.readings.map((reading: Reading) => {
            const audioReading: Reading | undefined =
              audioReadingsWord.readings.find(
                (rd: Reading) => rd.reading === reading.reading,
              );

            if (audioReading) reading.audio = audioReading.audio;

            return reading;
          });

        words.push(word);

        wordCount++;
      }

      saveEntries(words, filename, resultPaths.vocabJLPT);
    }
  } catch (err: unknown) {
    throw err;
  }
}

export function getJLPTKanji(): void {
  try {
    console.log("\nBuilding JLPT kanji");

    const kanjiDic: DictKanji[] = getDict("Kanjidic") as DictKanji[];
    const jmDict: DictWord[] = getDict("JMDict") as DictWord[];

    const kanjiPath: string = `${resultPaths.kanjiJLPT}/kanji`;

    if (!existsSync(kanjiPath))
      throw new Error("There are no JLPT kanji files");
    if (!existsSync(kanjiInfoFile))
      throw new Error("The kanji file does not exist");
    if (!existsSync(svgDir)) throw new Error("The SVG folder does not exist");

    const kanjiInfoList: Kanji[] = JSON.parse(
      readFileSync(kanjiInfoFile, "utf-8"),
    ) as Kanji[];
    const svgList: string[] = readdirSync(svgDir, "utf-8");

    for (const filename of fileNames.kanjiJLPT) {
      if (checkExistenceOfResults(resultPaths.kanjiJLPT, filename)) {
        console.log(`Already got ${filename}`);
        continue;
      }

      console.log(`Parsing ${filename}`);

      const kanjiFilePath: string = `${kanjiPath}/${filename}.json`;
      if (!existsSync(kanjiFilePath))
        throw new Error(`Kanji file does not exist: ${kanjiFilePath}`);

      const kanjiList: string[] = JSON.parse(
        readFileSync(kanjiFilePath, "utf-8"),
      ) as string[];

      const kanjis: Kanji[] = [];

      let deck: string = `${deckName}::${subDeckNames.jlpt._}::${subDeckNames.jlpt.kanji._}::`;

      if (filename.endsWith("n5")) deck += subDeckNames.jlpt.kanji.n5;
      else if (filename.endsWith("n4")) deck += subDeckNames.jlpt.kanji.n4;
      else if (filename.endsWith("n3")) deck += subDeckNames.jlpt.kanji.n3;
      else if (filename.endsWith("n2")) deck += subDeckNames.jlpt.kanji.n2;
      else if (filename.endsWith("n1")) deck += subDeckNames.jlpt.kanji.n1;

      if (deck.endsWith("::")) throw new Error("Invalid deck name");

      let kanjiCount: number = 0;
      const kanjiListLength: number = kanjiList.length;

      for (let i: number = 0; i < kanjiListLength; i++) {
        const char: string | undefined = kanjiList[i];
        if (typeof char !== "string")
          throw new Error(`Invalid ID file: ${kanjiFilePath}`);

        console.log(
          `${((kanjiCount / kanjiListLength) * 100).toFixed()}% Searching: ${char}`,
        );

        let kanji: Kanji | undefined = undefined;

        const kanjiInfo: Kanji | undefined = kanjiInfoList.find(
          (kanji: Kanji) => {
            if (kanji.kanji === undefined)
              throw new Error("Invalid kanji info file");

            return (
              kanji.kanji === char &&
              (kanji.components || kanji.mnemonic || kanji.words)
            );
          },
        );

        if (kanjiInfo)
          kanji = getKanjiExtended(
            char,
            kanjiInfo,
            kanjiDic,
            true,
            jmDict,
            svgList,
            noteTypes.kanji,
            deck,
          );
        else
          kanji = getKanji(
            char,
            kanjiDic,
            jmDict,
            svgList,
            noteTypes.kanji,
            deck,
          );

        if ((kanji.onyomi || kanji.kunyomi) && kanji.meanings)
          kanjis.push(kanji);

        kanjiCount++;
      }

      saveEntries(kanjis, filename, resultPaths.kanjiJLPT);
    }
  } catch (err: unknown) {
    throw err;
  }
}

export function getRadicals(): void {
  console.log("\nBuilding radicals");

  if (checkExistenceOfResults(resultPaths.radicals, "radicals"))
    console.log("Already got radicals");
  else throw new Error("Could not find radicals JSON file");

  // Add "used-in" kanji and mnemonic for each radical from the radical info JSON file
  if (undefined === null) {
    const radicalInfoList: Radical[] = existsSync(radicalInfoFile)
      ? (JSON.parse(readFileSync(radicalInfoFile, "utf-8")) as Radical[])
      : [];

    let radicals: Radical[] = [];

    loadEntries(resultPaths.radicals, "radicals", radicals);

    const deck: string = `${deckName}::${subDeckNames.radicals._}`;

    radicals = radicals.map((radical: Radical) => {
      const radicalInfo: Radical | undefined = radicalInfoList.find(
        (obj: Radical) => obj.radical === radical.radical,
      );

      if (radicalInfo) {
        if (radicalInfo.kanji && radicalInfo.kanji.length > 0)
          radical.kanji = radicalInfo.kanji;
        if (radicalInfo.mnemonic) radical.mnemonic = radicalInfo.mnemonic;
      }

      radical.noteTypeName = noteTypes.radical;
      radical.deckPath = deck;

      return radical;
    });

    saveEntries(radicals, "radicals", resultPaths.radicals);
  }
}

export function getKanas(): void {
  console.log("\nBuilding kana");

  for (const filename of fileNames.kana)
    if (checkExistenceOfResults(resultPaths.kana, filename))
      console.log(`Already got ${filename}`);
    else throw new Error(`Could not find ${filename} JSON file`);

  if (undefined === null)
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

  if (undefined === null)
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
  try {
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

    const tanaka: TanakaExample[] = shuffleArray<TanakaExample>(
      getDict("tanaka") as TanakaExample[],
    ).filter((ex: TanakaExample) => ex.furigana);

    const kanjiToWordsMap: Map<string, DictWord[]> = new Map<
      string,
      DictWord[]
    >();
    const ids: Set<string> = new Set<string>();
    const kanji: Kanji[] = [];
    const kanjiWords: Word[] = [];

    loadEntries(resultPaths.vocabJLPT, fileNames.vocabJLPT, undefined, ids);

    const jmDict: DictWord[] = (getDict("JMDict") as DictWord[]).filter(
      (word: DictWord) =>
        !ids.has(word.id) &&
        word.kanjiForms &&
        (word.isCommon === true || word.hasPhrases === true),
    );

    for (const word of jmDict)
      for (const kanjiForm of word.kanjiForms!) {
        const kanjiChars: string[] = kanjiForm.form.split("");

        for (const char of kanjiChars) {
          if (!kanjiToWordsMap.has(char)) kanjiToWordsMap.set(char, []);

          if (!ids.has(word.id)) {
            kanjiToWordsMap.get(char)!.push(word);
            ids.add(word.id);
          }
        }
      }

    const kanjiToDelete: string[] = [];

    for (const [kanji, words] of kanjiToWordsMap.entries())
      if (words.length === 0) kanjiToDelete.push(kanji);
    for (const kanji of kanjiToDelete) kanjiToWordsMap.delete(kanji);

    kanjiToDelete.length = 0;
    ids.clear();

    let jlptKanji: Kanji[] | Set<string> = [];

    loadEntries(
      resultPaths.kanjiJLPT,
      fileNames.kanjiJLPT,
      jlptKanji as Kanji[],
    );

    jlptKanji = new Set<string>(
      (jlptKanji as Kanji[]).map((kanji: Kanji) => kanji.kanji),
    );

    if (!existsSync(kanjiInfoFile))
      throw new Error("The kanji info file does not exist");

    const kanjiInfoList: Kanji[] = JSON.parse(
      readFileSync(kanjiInfoFile, "utf-8"),
    ) as Kanji[];

    const kanjiDeck: string = `${deckName}::${subDeckNames.extraKanji._}::${subDeckNames.extraKanji.kanji}`;
    const vocabDeck: string = `${deckName}::${subDeckNames.extraKanji._}::${subDeckNames.extraKanji.vocab}`;

    const kanjiDic: DictKanji[] = (getDict("Kanjidic") as DictKanji[]).filter(
      (char: DictKanji) =>
        char.readingMeaning.length > 0 &&
        char.readingMeaning.some(
          (pair: DictKanjiReadingMeaning) =>
            pair.groups.length > 0 &&
            pair.groups.some(
              (group: DictKanjiReadingMeaningGroup) =>
                group.meanings.length > 0 && group.readings.length > 0,
            ),
        ),
    );

    let kanjiCount: number = 0;

    const kanjiDicLength: number = kanjiDic.length;

    for (let i: number = 0; i < kanjiDicLength; i++) {
      const kanjiEntry: DictKanji | undefined = kanjiDic[i];
      if (!kanjiEntry) throw new Error("Invalid KANJIDIC file");
      if (!kanjiToWordsMap.has(kanjiEntry.kanji)) {
        kanjiCount++;
        continue;
      }

      let kanjiInfo: Kanji | undefined = undefined;

      for (let j: number = 0; j < kanjiInfoList.length; j++) {
        const kanji: Kanji | undefined = kanjiInfoList[j];
        if (!kanji || kanji.kanji === undefined)
          throw new Error("Invalid kanji info file");

        if (
          kanji.kanji === kanjiEntry.kanji &&
          (kanji.components || kanji.mnemonic || kanji.words)
        ) {
          kanjiInfo = kanji;
          break;
        }
      }

      const kanjiObj: Kanji | undefined = !jlptKanji.has(kanjiEntry.kanji)
        ? kanjiInfo
          ? getKanjiExtended(
            kanjiEntry.kanji,
            kanjiInfo,
            kanjiDic,
            true,
            jmDict,
            undefined,
            noteTypes.kanji,
            kanjiDeck,
          )
          : getKanji(
            kanjiEntry.kanji,
            kanjiDic,
            jmDict,
            undefined,
            noteTypes.kanji,
            kanjiDeck,
          )
        : undefined;
      if (
        kanjiObj &&
        ((!kanjiObj.onyomi && !kanjiObj.kunyomi) || !kanjiObj.meanings)
      ) {
        kanjiCount++;
        continue;
      }

      console.log(
        `${Math.round((kanjiCount / kanjiDicLength) * 100)}% Searching: ${!kanjiObj ? `${kanjiEntry.kanji} (from JLPT list; not creating note for it)` : `${kanjiEntry.kanji}`}`,
      );

      const wordsForKanji: DictWord[] | undefined = kanjiToWordsMap.get(
        kanjiEntry.kanji,
      );
      if (!wordsForKanji || wordsForKanji.length === 0) {
        kanjiCount++;
        continue;
      }

      let foundWord: boolean = false;

      for (let j: number = 0; j < wordsForKanji.length; j++) {
        const dictWord: DictWord | undefined = wordsForKanji[j];
        if (!dictWord || ids.has(dictWord.id)) continue;

        const word: Word = getWord(
          undefined,
          undefined,
          kanjiDic,
          tanaka,
          dictWord,
          noteTypes.word,
          vocabDeck,
        );

        if (
          (word.common === true || (word.phrases && word.phrases.length > 0)) &&
          word.id
        ) {
          if (!foundWord) foundWord = true;

          ids.add(word.id);
          kanjiWords.push(word);
        }
      }

      if (foundWord && kanjiObj) kanji.push(kanjiObj);

      kanjiCount++;

      kanjiToWordsMap.delete(kanjiEntry.kanji);
    }

    if (kanji.length > 0)
      saveEntries(kanji, "extra_kanji", resultPaths.extraKanji);
    if (kanjiWords.length > 0)
      saveEntries(kanjiWords, "extra_kanji_words", resultPaths.extraKanji);
  } catch (err: unknown) {
    throw err;
  }
}

export function getKanaWords(): void {
  try {
    console.log("\nBuilding kana words");

    if (checkExistenceOfResults(resultPaths.kanaWords, "kana_words")) {
      console.log(`Already got kana_words`);
      return;
    }

    const ids: Set<string> = new Set<string>();

    const kanjiDic: DictKanji[] = getDict("Kanjidic") as DictKanji[];
    const tanaka: TanakaExample[] = shuffleArray<TanakaExample>(
      getDict("tanaka") as TanakaExample[],
    ).filter((ex: TanakaExample) => ex.furigana);

    const wordList: Word[] = [];

    if (checkExistenceOfResults(resultPaths.extraKanji, "extra_kanji_words"))
      loadEntries(resultPaths.extraKanji, "extra_kanji_words", undefined, ids);
    if (checkExistenceOfResults(resultPaths.vocabJLPT, fileNames.vocabJLPT))
      loadEntries(resultPaths.vocabJLPT, fileNames.vocabJLPT, undefined, ids);

    const deck: string = `${deckName}::${subDeckNames.kanaWords._}`;

    const jmDict: DictWord[] = (getDict("JMDict") as DictWord[]).filter(
      (word: DictWord) =>
        !ids.has(word.id) &&
        (word.isCommon === true || word.hasPhrases === true),
    );

    const jmDictLength: number = jmDict.length;
    let wordCount: number = 0;

    for (let i: number = 0; i < jmDictLength; i++) {
      const dictWord: DictWord | undefined = jmDict[i];
      if (!dictWord) throw new Error("Invalid JMDict file");
      if (ids.has(dictWord.id)) continue;

      console.log(`${Math.round((wordCount / jmDictLength) * 100)}% Searching: ${dictWord.id}`);

      const word: Word = getWord(
        undefined,
        undefined,
        kanjiDic,
        tanaka,
        dictWord,
        noteTypes.word,
        deck,
      );

      if (
        word.kanji === undefined &&
        (word.common === true || (word.phrases && word.phrases.length > 0))
      )
        wordList.push(word);

      wordCount++;
    }

    if (wordList.length > 0)
      saveEntries(wordList, "kana_words", resultPaths.kanaWords);
    else throw new Error("Empty kana words list");
  } catch (err: unknown) {
    throw err;
  }
}

export function getEntries(): void {
  try {
    getJLPTVocab();
    getJLPTKanji();
    getRadicals();
    getKanas();
    getGrammar();
    getExtraKanji();
    getKanaWords();
  } catch (err: unknown) {
    throw err;
  }
}
