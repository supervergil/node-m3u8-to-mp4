require("babel-polyfill");

const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");
const https = require("https");
const axios = require("axios");

// consts
const targetPath = path.resolve(".tmp");
const isRemoteReg = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/;
const hostReg = /^(http|ftp|https):\/\/((?!\/).)*/;
const m3u8Reg = /\.m3u8$/;

// functions
const generateMediaList = async source => {
  try {
    let mediaList = [];
    // judge local or remote
    if (isRemoteReg.test(source)) {
      //  remote use axios parse
      mediaList = await parseRemote(source);
    } else {
      //  local use fse parse
      mediaList = await parseLocal(source);
    }
    return mediaList;
  } catch (e) {
    throw e;
  }
};

const parseRemote = async url => {
  try {
    const urlPath = url
      .split("/")
      .slice(0, -1)
      .join("/");
    const host = url.match(hostReg)[0];
    const { status, data } = await axios.get(url, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        agent: false
      })
    });
    if (status === 200) {
      let tmpList = [];
      const infoList = data
        .split("\n")
        .filter(
          item => item.replace(/\s*/g, "").length > 0 && !item.startsWith("#")
        );
      for (let item of infoList) {
        let tmpUrl = "";
        if (isRemoteReg.test(item)) {
          tmpUrl = item;
        } else {
          if (item.startsWith("/")) {
            tmpUrl = `${host}${item}`;
          } else {
            tmpUrl = `${urlPath}/${item}`;
          }
        }
        if (m3u8Reg.test(item)) {
          tmpList = tmpList.concat(await parseRemote(tmpUrl));
        } else {
          tmpList.push(tmpUrl);
        }
      }
      return tmpList;
    } else {
      throw e;
    }
  } catch (e) {
    throw e;
  }
};

const parseLocal = async url => {
  try {
    const urlPath = url
      .split("/")
      .slice(0, -1)
      .join("/");
    let tmpList = [];
    const data = fs.readFileSync(url, "utf-8");
    const infoList = data
      .split("\n")
      .filter(
        item => item.replace(/\s*/g, "").length > 0 && !item.startsWith("#")
      );
    for (let item of infoList) {
      if (isRemoteReg.test(item)) {
        tmpList = tmpList.concat(await parseRemote(item));
      } else {
        let tmpUrl = `${urlPath}/${item}`;
        if (m3u8Reg.test(item)) {
          tmpList = tmpList.concat(await parseLocal(tmpUrl));
        } else {
          tmpList.push(tmpUrl);
        }
      }
    }
    return tmpList;
  } catch (e) {
    throw e;
  }
};

// download media list
const downloadMedia = (list, cb) => {
  return new Promise(async (resolve, reject) => {
    try {
      // make dir
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath);
      }

      // split list 10 per
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

      cb && cb("downloading", index, splitDownloadList.length);

      for (let item of splitDownloadList) {
        ++index;
        await Promise.all(
          item.map((item, n) => downloadTsItem(item, (index - 1) * 10 + n))
        );
        cb && cb("downloading", index, splitDownloadList.length);
      }
      resolve();
    } catch (e) {
      reject(e);
    }
    return true;
  });
};

// download Ts Item
const downloadTsItem = (item, name) => {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = fs.createWriteStream(`${targetPath}/${name}.ts`, {
        emitClose: true
      });
      const { status, data } = await axios.get(item, {
        timeout: 10000,
        responseType: "stream",
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          agent: false
        })
      });
      if (status === 200) {
        let fileSize = 0;
        let closed = false;
        let over = false;
        const startTime = Date.now();

        stream.on("close", () => {
          if (!over) {
            closed = true;
            data.destroy();
            stream.destroy();
            resolve();
          }
        });

        data.pipe(stream);

        compare(startTime, `${targetPath}/${name}.ts`, fileSize, () => {
          if (!closed) {
            over = true;
            data.destroy();
            stream.destroy();
            downloadTsItem(item, name).then(() => resolve());
          }
        });
      } else {
        throw new Error("网络错误");
      }
    } catch (e) {
      downloadTsItem(item, name).then(() => resolve());
      reject(e);
    }
  });
};

const compare = (startTime, path, size, cb) => {
  let timer = setTimeout(() => {
    if (Date.now() - startTime > 10000) {
      if (fs.existsSync(path)) {
        const fileInfo = fs.statSync(path);
        if (size < fileInfo.size) {
          clearTimeout(timer);
          return compare(startTime, path, fileInfo.size, cb);
        }
      }
    } else {
      clearTimeout(timer);
      return compare(startTime, path, size, cb);
    }
    clearTimeout(timer);
    cb();
  }, 3000);
};

// stream to buffer
const streamToBuffer = stream =>
  new Promise(async (resolve, reject) => {
    try {
      const bufferArr = [];
      stream.on("data", data => {
        bufferArr.push(data);
      });
      stream.on("error", e => {
        reject(e);
      });
      stream.on("end", () => {
        resolve(Buffer.concat(bufferArr));
      });
    } catch (e) {
      reject(e);
    }
  });

module.exports = (source, outputPath, cb) =>
  new Promise(async (resolve, reject) => {
    try {
      // remove target path
      fse.removeSync(targetPath);

      // get ts file list
      cb && cb("generating");
      const mediaList = await generateMediaList(source);

      // download media files
      await downloadMedia(mediaList, cb);

      // combine
      const tsList = fs.readdirSync(targetPath).sort((prev, next) => {
        return parseInt(prev) - parseInt(next);
      });

      let index = 0;

      for (let item of tsList) {
        ++index;
        cb && cb("combining", index, tsList.length);
        const data = await streamToBuffer(
          fs.createReadStream(`${targetPath}/${item}`)
        );
        fs.appendFileSync(outputPath, data);
      }

      // remove target path
      fse.removeSync(targetPath);
      resolve();
    } catch (e) {
      fse.removeSync(targetPath);
      reject(e);
    }
  });
