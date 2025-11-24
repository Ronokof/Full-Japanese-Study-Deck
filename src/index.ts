import dotenv from "dotenv";
import { PollyClient } from "@aws-sdk/client-polly";
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

  const newLine: boolean =
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
      if (
        process.env.AWS_REGION === undefined ||
        process.env.AWS_ACCESS_KEY === undefined ||
        process.env.AWS_SECRET === undefined
      )
        throw new Error("Invalid AWS info");

      console.log("\nGenerating audio");

      await generateAudio(
        new PollyClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET,
          },
        }),
      )
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
