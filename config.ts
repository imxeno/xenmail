import { readFileSync } from "fs";

export default {
  smtp: {
    host: "localhost",
    ssl: {
      allow: true,
      force: true,
      cert: readFileSync("./ssl/localhost.cert"),
      key: readFileSync("./ssl/localhost.key")
    }
  }
};
