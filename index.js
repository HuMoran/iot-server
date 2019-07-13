/**
 * File: index.js
 * Project: iot-server
 * Created Date: Saturday, July 13th 2019, 3:27:15 pm
 * Author: Tao Hu htax2013@gmail.com
 * -----
 * Last Modified: Sat Jul 13 2019
 * Modified By: Tao Hu
 * -----
 * Copyright (c) 2019 Kideasoft Tech Co.,Ltd.
 */
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const dayjs = require('dayjs');

function getCheckCode(str) {
  let sum = 0;
  for (let i = 0; i < str.length - 2; i += 2) {
    console.log(sum, parseInt(str.slice(i, i + 2), 10));
    sum += parseInt(str.slice(i, i + 2), 10);
  }
  return sum.toString(16).slice(-2).padStart(2, '0');
}

function doMsg(msg) {
  if (msg === '74696d653f') { // 查询时间
    const time = dayjs().format('YY/MM/DD HH:mm:ss');
    const week = dayjs().day() === 0 ? 7 : dayjs().day();
    const strHex = Buffer.from(`${time} ${week}`).toString('hex');
    const code = getCheckCode(strHex);
    return `${strHex}${code}`;
  }
  const msgType = msg[0];
  
  switch (msgType) {
    case '0': { // 登录注册或者心跳
      if (msg[1] === '0') { // 心跳
        // TODO: 心跳处理
        break;
      }
      // 登录
      const idLen = Number(msg[1]);
      const id = msg.slice(2, (idLen + 1) * 2);
      // TODO 存ID，验证等后续业务
      return '00';
    }
    default:
      break;
  }
}


server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg.toString('hex')} from ${rinfo.address}:${rinfo.port}`);
  const data = msg.toString('hex');
  const returnMsg = doMsg(data);
  if (returnMsg) {
    server.send(returnMsg, 0, returnMsg.length, rinfo.port, rinfo.address);
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(60000);