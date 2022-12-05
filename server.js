const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');
const BoxSDK = require('box-node-sdk');
const winston = require('winston');
const expressWinston = require('express-winston');
const bodyParser = require('body-parser');

// Create an ExpressReceiver
const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
receiver.router.use(bodyParser.urlencoded({ extended: true }));
receiver.router.use(bodyParser.json());
receiver.router.use(expressWinston.logger({
    transports: [
      new winston.transports.Console()
    ],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.json()
    ),
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: false,
    colorize: true,
    ignoreRoute: function (req, res) { return false; }
  }));

  const clientOptions = {
    slackApiUrl: 'https://slack-gov.com/api/'
  };

 const app = new App({
    // token: process.env.SLACK_BOT_TOKEN || SLACK_BOT_TOKEN,
    token: process.env.SLACK_BOT_TOKEN,
    clientOptions,
    receiver,
    logLevel: LogLevel.DEBUG
  });

  let boxClient;
  if(process.env.BOX_SUBJECT_TYPE === 'enterprise') {
    const sdkConfig = {
        boxAppSettings: {
            clientID: process.env.BOX_CLIENT_ID,
            clientSecret: process.env.BOX_CLIENT_SECRET
        }, 
        enterpriseID: process.env.BOX_SUBJECT_ID
    }
    const sdk = BoxSDK.getPreconfiguredInstance(sdkConfig);
    boxClient = sdk.getAnonymousClient();
  } else {
    const sdkConfig = {
        boxAppSettings: {
            clientID: process.env.BOX_CLIENT_ID,
            clientSecret: process.env.BOX_CLIENT_SECRET
        }
    }
    const sdk = BoxSDK.getPreconfiguredInstance(sdkConfig);
    boxClient = sdk.getCCGClientForUser(process.env.BOX_SUBJECT_ID);
}



// Receives webhook request from Box
receiver.router.post('/box/webhook/receiver', (req, res) => {
    // You're working with an express req and res now.
    console.log('Receiver - Found webhook payload: ', JSON.stringify(req.body));
    const response = { test: 'this is a test'};
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(response);
});

// Creates webhook
receiver.router.post('/box/webhook', (req, res) => {
    // You're working with an express req and res now.
    console.log('Create - Found webhook payload: ', JSON.stringify(req.body));

    const body = req.body;
    const webhookRes = boxClient.webhooks.create(
      body.target.id,
      body.target.type,
      body.address,
      body.triggers
    )

    console.log('Found webhook creation response: ', webhookRes);

    const response = { test: 'this is a test'};
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(response);
});

(async () => {
    await app.start(process.env.PORT || 8080);
    console.log('⚡️ Slack Bolt App is running!');
  })();
  

