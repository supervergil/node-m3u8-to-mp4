# m3u8-to-mp4
convert m3u8 to mp4 

## latest version

v2.0.0

## install

```
npm install node-m3u8-to-mp4 -S
```

## usage

```
const converter = require("node-m3u8-to-mp4");

converter("http://m3u8-url","to/your/path.mp4",(status)=>{
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
}).then(() => {
  console.log("finished");
});
```

now you can get converter working status through the third param, customize the callback function if u want

if you want to convert ts file to other media type, just modify the destination path extension

```
const converter = require("node-m3u8-to-mp4");

converter("http://m3u8-url","to/your/path.extension").then(() => {
  console.log("finished");
});
```

node-m3u8-to-mp4 now supports local m3u8 files, see example from ```example-local.js``` file