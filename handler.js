'use strict';

async function getPuppeteer() {
  const aws = require('aws-sdk');
  const puppeteer_params = {
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--single-process'],
  };

  let browser;

  if (process.env.IS_LOCAL)   {
    aws.config.credentials = new aws.SharedIniFileCredentials({ profile: 'default' });

    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch(puppeteer_params); 

  } else {
    puppeteer_params.executablePath = '/opt/headless-chromium';

    const puppeteer = require('puppeteer-core');
    browser = await puppeteer.launch(puppeteer_params); 
  }

  return { browser, aws };
}

module.exports.main = async (event, context) => {
  const { browser, aws } = await getPuppeteer();
  const ssm = new aws.SSM();
  const userid   = await ssm.getParameter({ Name: '/webservice/fc_and/user_id',  WithDecryption: true }).promise().then(d => d.Parameter.Value);
  const password = await ssm.getParameter({ Name: '/webservice/fc_and/password', WithDecryption: true }).promise().then(d => d.Parameter.Value);

  const page = await browser.newPage();
  page.setViewport({ width: 1200, height: 800 });

  // load page
  const url = 'https://kobayashiaika.jp/s/n85/login';
  await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle0'] });

  // login
  await page.type("input[type=email]", userid);
  await page.type("input[type=password]", password);
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  //await page.screenshot({ path: 'test2.png' });

  // login ok page
  await page.focus("#prevPageBtn");
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  //await page.screenshot({ path: 'test3.png' });

  // goto fortune page
  await page.focus(".fortune a");
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  //await page.screenshot({ path: 'test4.png' });

  // get element screenshot
  //const clip = await page.evaluate(s => {
  //  const elem = document.querySelector(s);
  //  const { width, height, top: y, left: x } = elem.getBoundingClientRect();
  //  return { width, height, x, y, test: elem.textContent };
  //}, '.uranai_result');
  //await page.screenshot({ clip, path: 'test5.png' });

  const result = await page.evaluate(s => {
    const elems = document.querySelectorAll(s);
    return [...elems].map(e => e.textContent).map(text => text.replace(/[\s\n]/g, '')).join(" ");
  }, '.uranai_result .text, .uranai_result .point');

  console.log(result);

  return 'OK';
};
