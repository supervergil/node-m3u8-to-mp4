const m3u8ToMp4 = require("./compiled");

m3u8ToMp4(
  `https://cdn.youku-letv.com/20190129/16118_e0d99b6e/index.m3u8`,
  "test.mp4"
).then(() => {
  console.log("已生成mp4");
});
