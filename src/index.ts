import dotenv from "dotenv";

import { convertDicts, generateAudio, getEntries } from "./utils/utils";

const originalConsoleLog: {
  (...data: any[]): void;
  (message?: any, ...optionalParams: any[]): void;
} = console.log.bind(console);

console.log = (...args: any[]) => {
  if (args.length === 0) {
    originalConsoleLog();
    return;
  }

  const firstArg: any = args[0];

  let newLine: boolean =
    typeof firstArg === "string" && firstArg.startsWith("\n");

  if (newLine) args[0] = (args[0] as string).substring(1);

  originalConsoleLog(
    `${newLine ? "\n" : ""}${new Date().toLocaleString()}:`,
    ...args,
  );
};

dotenv.config();

convertDicts()
  .then(async () => {
    getEntries();

    if (process.argv.slice(2).includes("--with-audio")) {
      if (process.env.TTSFREE_APIKEY === undefined)
        throw new Error("Invalid TTSFree.com API key");

      console.log("\nGenerating audio");

      await generateAudio(process.env.TTSFREE_APIKEY)
        .then(() => console.log("\nAudio generated"))
        .catch((err: any) => {
          throw err;
        });
    }

    console.log("\nAll tasks completed. Exiting...");
  })
  .catch((err: any) => {
    throw err;
  });
