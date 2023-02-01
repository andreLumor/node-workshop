import { open, read, close } from "fs";
import { resolve } from "path";
import { Transform, pipeline } from "node:stream";
import createLogParser from "./log-parser.mjs";
import Split from "stream-split";
import { createJsonFormatter } from "./game-results-json-formatter.mjs";
import { pathToFileURL } from "url";
import { Readable } from "stream";
import { LOG_FILE } from '../lib/config.mjs';

const createInfiniteReadStream = (fileName) => new Readable({
  encoding: "utf-8",
  construct(callback) {
    open(fileName, "r", (error, fd) => {
      if (error) {
        return callback(error);
      }

      this.fd = fd;
      callback();
    });
  },
  read(size) {
    const buffer = Buffer.alloc(size);
    read(this.fd, buffer, 0, size, null, (error, bytesRead) => {
      if (error) {
        return this.destroy(error);
      }

      this.push(buffer.subarray(0, bytesRead));
    });
  },
  destroy(error, callback) {
    close(this.fd, () => {
      callback(error);
    });
  }
})

export const parseLogFile = (outputStream, callback) => {
  const lineSplitter = new Split("\n");

  const logFileReader = createInfiniteReadStream(resolve(LOG_FILE), {
    encoding: "utf-8",
  });

  const logParser = createLogParser();

  pipeline(
    logFileReader,
    lineSplitter,
    logParser,
    outputStream,
    callback
  );
};

const main = () => {
  const outputStream = createJsonFormatter()
  outputStream
    .pipe(new Transform({
      transform(chunk, _encoding, callback) {
        callback(null, "\u001Bc" + chunk);
      }
    }))
    .pipe(process.stdout)

  parseLogFile(outputStream, (error) => {
    if (error) {
      return console.error('Something wrong!', error);
    }

    console.error('\n\nParse is over!')
  })
}

// only run if executed, not imported
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}

