const puppeteer = require('puppeteer');
const twilio = require('twilio');

// Goldfish env vars
const login = process.env.GOLDFISH_USERNAME;
const pw = process.env.GOLDFISH_PW;

// Twilio env vars
const toNumber = process.env.MY_PHONE_NUMBER;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;

// build Twilio client
const client = new twilio(accountSid, authToken);

// build Twilio SMS function
const sendSMS = function(msg) {
  client.messages
    .create({
      body: msg,
      from: fromNumber,
      to: toNumber,
    })
    .then((message) => console.log(message.sid));
};

// build job
const scrapeIt = async () => {

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote']
  });
  const page = await browser.newPage();

  const loginUrl = 'https://app.iclasspro.com/portal/gssshoreline/login?next=gssshoreline%2Fclasses?levels=11&days=1,7&openings=1';

  await page.goto(loginUrl);

  await page.waitForTimeout(1000);

  const currentCustomerSelector = 'body > customer-portal-layout > customer-portal-login > div > div > div.body.notification-layout.kiosk > div > div > div > div.registration-wrap.vertical-center.scrollbar-light.scrollbar-custom > div > div > div > div > div > div.row.row-matrix.animate-iterate.animate-iterate-delay-between-long.animate-duration-medium.animate-delay-short > div:nth-child(1) > button';
  await page.waitForSelector(currentCustomerSelector);
  await page.click(currentCustomerSelector);

  await page.waitForTimeout(1000);

  const loginSelector = 'body > customer-portal-layout > customer-portal-login > div > div > div.body.notification-layout.kiosk > div > div > div > div.registration-wrap.vertical-center.scrollbar-light.scrollbar-custom > div > div > div > div > div > div:nth-child(2) > div > form > div > div:nth-child(1) > div > input';
  await page.waitForSelector(loginSelector);
  await page.type(loginSelector, login);

  await page.waitForTimeout(1000);

  const pwSelector = 'body > customer-portal-layout > customer-portal-login > div > div > div.body.notification-layout.kiosk > div > div > div > div.registration-wrap.vertical-center.scrollbar-light.scrollbar-custom > div > div > div > div > div > div:nth-child(2) > div > form > div > div:nth-child(2) > div > input';
  await page.waitForSelector(pwSelector);
  await page.type(pwSelector, pw);

  await page.waitForTimeout(1000);

  const nextSelector = '#nav-btn-next';
  await page.waitForSelector(nextSelector);
  await page.click(nextSelector);

  await page.waitForTimeout(1000);

  const testSearchUrl = 'https://app.iclasspro.com/portal/gssshoreline/classes?days=1';
  const searchUrl = 'https://app.iclasspro.com/portal/gssshoreline/classes?levels=11&days=1,7&openings=1';
  await page.goto(searchUrl);

  await page.waitForTimeout(5000);

  const noClassesFoundSelector = 'body > customer-portal-layout > customer-portal-classes > div > div > div.main.notification-layout.kiosk > div > div > div.inner-wrap-body > div > div.padding-top-medium > div > div.status-notice > div:nth-child(1) > div > p';

  const exists = await page.$eval(noClassesFoundSelector, () => true).catch(() => false);

  if (exists) {
    console.log('No classes found');
    await browser.close();
    return;
  }

  console.log('Classes found');

  const classesFoundSelector = 'body > customer-portal-layout > customer-portal-classes > div > div > div.main.notification-layout.kiosk > div > div > div.inner-wrap-body > div > div:nth-child(1) > span';
  await page.waitForSelector(classesFoundSelector);

  const openings = await page.$$('article');

  const getText = (parent, selector) => {
    return parent.$eval(selector, el => el.innerText);
  };

  let classes = [];
  
  for (const opening of openings) {
    try {
      const header = await opening.$eval('.vacancy-text > span > span > span', el => el.innerText);
    } catch (exception) {
      const header = await getText(opening, 'h2');
      classes.push(header);
    }
  }

  if (classes.length > 0) {
    console.log('Openings found');
    sendSMS(`${classes}`, toNumber);
  } else {
    console.log('No openings found');
  }
  
  await browser.close();
}

scrapeIt();