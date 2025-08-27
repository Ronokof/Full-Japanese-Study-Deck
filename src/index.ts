import dotenv from 'dotenv';
import { convertDicts, generateAudio, getEntries } from "./utils/utils";
import { PollyClient } from "@aws-sdk/client-polly";

dotenv.config();

convertDicts().then(async () => {
  getEntries();

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

  console.log('\nAll tasks completed. Exiting...');
}).catch((err: any) => { throw err; });