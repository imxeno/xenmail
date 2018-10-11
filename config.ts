import { readFileSync } from "fs";
import * as path from "path";

export default {
  smtp: {
    host: "localhost",
    ssl: {
      allow: true,
      force: true,
      cert: readFileSync("./ssl/localhost.cert"),
      key: readFileSync("./ssl/localhost.key")
    },
    maildir: path.resolve("./vmail")
  }
};
