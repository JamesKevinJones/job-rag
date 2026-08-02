import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const models = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
];

async function main() {
  for (const model of models) {
    process.stdout.write(`${model}: `);
    try {
      const { text } = await generateText({
        model: google(model),
        prompt: "Say hi in three words",
      });
      console.log("OK", JSON.stringify(text.slice(0, 80)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("FAIL", msg.split("\n")[0]?.slice(0, 160));
    }
  }
}

main();
