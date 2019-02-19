require('babel-polyfill')
const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");
const https = require("https");
const axios = require("axios");

const targetPath = path.resolve("tmp");

// 解析m3u8主文件

const parseM3u8 = source => {
  const sourceUrl = source
    .split("/")
    .slice(0, -1)
    .join("/");
  return new Promise(async (resolve, reject) => {
    try {
      const { status, data } = await axios.get(source, {
        timeout: 200000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          agent: false
        })
      });
      if (status === 200) {
        const infoList = data.split("\n").filter(item => item.length > 0).filter(item => !item.startsWith("#"));
        if (data.includes("#EXT-X-STREAM-INF")) {
          if(infoList[0].startsWith('http')){
            resolve(await parseM3u8(infoList[0]));
          }else{
            resolve(await parseM3u8(`${sourceUrl}/${infoList[0]}`));
          }
        } else {
          resolve(
            infoList.map(item => {
              if (item.startsWith("http")) {
                return item;
              } else {
                return `${sourceUrl}/${item}`;
              }
            })
          );
        }
      }
    } catch (e) {
      reject(e);
    }
  });
};

// 下载ts文件列表
const downloadTsList = list => {
  return new Promise(async (resolve, reject) => {
    try {
      // 创建文件夹
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath);
      }
      // 数组分片
      const splitDownloadList = list.reduce((current, next, index) => {
        if (index % 10 === 0) {
          current.push([next]);
          return current;
        } else {
          current[Math.floor(index / 10)].push(next);
          return current;
        }
      }, []);

      let index = 0;

      for (let item of splitDownloadList) {
        console.log(`正在下载第${++index}分片..........................`);
        await Promise.all(
          item.map(async (item, n) => {
            return downloadTsItem(item, (index - 1) * 10 + n);
          })
        );
      }
      console.log("全部下载完成！");
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

// 下载具体某个ts文件
const downloadTsItem = (item, name) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { status, data } = await axios.get(item, {
        timeout: 200000,
        responseType: "stream",
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          agent: false
        })
      });
      if (status === 200) {
        const stream = fs.createWriteStream(`${targetPath}/${name}.ts`);
        stream.on("close", () => {
          console.log(item + "下载完成！");
          resolve();
        });
        data.pipe(stream);
      }
    } catch (e) {
      console.error(e);
      console.log(item + "下载失败！正在重新下载...");
      return downloadTsItem(item, name);
    }
  });
};

// 文件流转换为buffer
const streamToBuffer = stream => {
  return new Promise(async (resolve, reject) => {
    try {
      const bufferArr = [];
      stream.on("data", data => {
        bufferArr.push(data);
      });
      stream.on("end", () => {
        resolve(Buffer.concat(bufferArr));
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = (source, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      fse.removeSync(targetPath);

      await downloadTsList(await parseM3u8(source));

      // 合并操作
      const list = fs.readdirSync(targetPath).sort((prev, next) => {
        return parseInt(prev) - parseInt(next);
      });

      let index = 0;

      for (let item of list) {
        console.log(`正在合并第${++index}个文件...`);
        const data = await streamToBuffer(
          fs.createReadStream(`${targetPath}/${item}`)
        );
        fs.appendFileSync(outputPath, data);
      }

      // 删除分片文件
      fse.removeSync(targetPath);

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};
