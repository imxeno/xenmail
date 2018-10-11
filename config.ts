export default {
  smtp: {
    host: "localhost",
    ssl: {
      allow: true,
      force: true,
      cert: "./ssl/localhost.cert",
      key: "./ssl/localhost.key"
    }
  }
};
