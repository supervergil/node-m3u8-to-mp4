# m3u8-to-mp4
convert m3u8 to mp4 

## install

```
npm install node-m3u8-to-mp4 -S
```

## usage

```
const converter = require("node-m3u8-to-mp4");

converter("http://m3u8-url","to/your/path.mp4").then(() => {
  console.log("finished");
});
```