const converter = require("node-m3u8-to-mp4");
const path = require("path");

// local m3u8
converter(
  path.join(__dirname, "index.m3u8"),
  "video.mp4",
  (status, index, total) => {
    switch (status) {
      case "generating":
        console.log("extracting...");
        break;
      case "downloading":
        console.log(
          "downloading process:" + ((index / total) * 100).toFixed(2) + "%"
        );
        break;
      case "combining":
        console.log(
          "combining mp4 process:" + ((index / total) * 100).toFixed(2) + "%"
        );
        break;
    }
  }
).then(() => {
  console.log("done!");
});

