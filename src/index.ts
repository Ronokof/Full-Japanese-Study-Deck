import { existsSync, readdirSync } from "fs";
import path from "path";
import dotenv from 'dotenv';
import { fileNames, resultPaths } from "./utils/constants";
import { convertDicts, generateAudio, getExtraKanji, getGrammar, getJLPTKanji, getJLPTVocab, getKanas, getKanaWords, getRadicals } from "./utils/utils";
import { PollyClient } from "@aws-sdk/client-polly";

dotenv.config();

convertDicts();

async function getVocabEntries(): Promise<void> {
  return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    try {
      if (existsSync(resultPaths.vocabJLPT!)) {
        let vocabFiles: string[] = readdirSync(resultPaths.vocabJLPT!, 'utf-8');

        if (vocabFiles.length > 0) {
          if (!vocabFiles.every((file: string) => fileNames.vocabJLPT.some((name: string) => name === path.parse(file).name.trim())))
            await getJLPTVocab();
        } else await getJLPTVocab();
      } else await getJLPTVocab();

      resolve();
    } catch (err: unknown) {
      reject(err);
    }
  },
  );
}

async function getKanjiEntries(): Promise<void> {
  return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    try {
      if (existsSync(resultPaths.kanjiJLPT!)) {
        let kanjiFiles: string[] = readdirSync(resultPaths.kanjiJLPT!, 'utf-8');

        if (kanjiFiles.length > 0) {
          if (!kanjiFiles.every((file: string) => fileNames.kanjiJLPT.some((name: string) => name === path.parse(file).name.trim())))
            await getJLPTKanji();
        } else await getJLPTKanji();
      } else await getJLPTKanji();

      resolve();
    } catch (err: unknown) {
      reject(err);
    }
  },
  );
}

async function getRadicalEntries(): Promise<void> {
  return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    try {
      if (existsSync(resultPaths.radicals!)) {
        let radicalsFiles: string[] = readdirSync(resultPaths.radicals!, 'utf-8');

        if (!radicalsFiles.includes('radicals.txt')) getRadicals();
      } else getRadicals();

      resolve();
    } catch (err: unknown) {
      reject(err);
    }
  },
  );
}

async function getKanaEntries(): Promise<void> {
  return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    try {
      if (existsSync(resultPaths.kana!)) {
        let kanaFiles: string[] = readdirSync(resultPaths.kana!, 'utf-8');

        if (kanaFiles.length > 0) {
          if (!kanaFiles.every((file: string) => fileNames.kana.some((name: string) => name === path.parse(file).name.trim())))
            getKanas();
        } else getKanas();
      } else getKanas();

      resolve();
    } catch (err: unknown) {
      reject(err);
    }
  },
  );
}

async function getGrammarEntries(): Promise<void> {
  return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    try {
      if (existsSync(resultPaths.grammar!)) {
        let grammarFiles: string[] = readdirSync(resultPaths.grammar!, 'utf-8');

        if (grammarFiles.length > 0) {
          if (!grammarFiles.every((file: string) => fileNames.grammar.some((name: string) => name === path.parse(file).name.trim())))
            await getGrammar();
        } else await getGrammar();
      } else await getGrammar();

      resolve();
    } catch (err: unknown) {
      reject(err);
    }
  },
  );
}

export async function getEntries(): Promise<void> {
  return await new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    try {
      await getVocabEntries().catch((err: any) => { throw err; });
      await getKanjiEntries().catch((err: any) => { throw err; });
      await getRadicalEntries().catch((err: any) => { throw err; });
      await getKanaEntries().catch((err: any) => { throw err; });
      await getGrammarEntries().catch((err: any) => { throw err; });
      await getExtraKanji().catch((err: any) => { throw err; });
      await getKanaWords().catch((err: any) => { throw err; });

      resolve();
    } catch (err: unknown) {
      reject(err);
    }
  },
  );
}

getEntries().then(async () => {
  if (process.argv.slice(2).includes('--with-audio')) {
    if (process.env.AWS_REGION === undefined || process.env.AWS_ACCESS_KEY === undefined || process.env.AWS_SECRET === undefined) throw new Error('Invalid AWS info');

    console.log('\nGenerating audio');

    await generateAudio(new PollyClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
      }
    })).then(() => console.log('\nAudio generated')).catch((err: any) => { throw err; });
  }
}).then(() => console.log('\nAll tasks completed. Exiting...')).catch((err: any) => { throw err; });