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

or if you want to convert ts file to other media type, just modify the destination path extension：

```
const converter = require("node-m3u8-to-mp4");

converter("http://m3u8-url","to/your/path.extension").then(() => {
  console.log("finished");
});
```

see mechanism: [https://www.zhangyangjun.com/post/m3u8-to-mp4-development.html](https://www.zhangyangjun.com/post/m3u8-to-mp4-development.html)
