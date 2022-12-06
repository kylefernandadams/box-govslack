const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');
const BoxSDK = require('box-node-sdk');
const winston = require('winston');
const expressWinston = require('express-winston');
const bodyParser = require('body-parser');
const jsforce = require('jsforce');


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

const { SFDC_LOGIN_URL, SFDC_USERNAME, SFDC_PASSWORD } = process.env;

const connection = new jsforce.Connection({
  loginUrl: SFDC_LOGIN_URL
});


// Receives webhook request from Box
receiver.router.post('/box/webhook/receiver', async (req, res) => {
    // You're working with an express req and res now.
    // console.log('Receiver - Found webhook payload: ', JSON.stringify(req.body));

    const body = req.body;
    const trigger = body.trigger;
    const fileId = body.source.id;
    const parentFolderId = body.source.parent.id;
    console.log('Found trigger: ', trigger);
    console.log('Found File Id: ', fileId);
    console.log('Found Parent Folder Id: ', parentFolderId);

    const userInfo = await connection.login(SFDC_USERNAME, SFDC_PASSWORD)
    console.log('Access token: ', connection.accessToken);
    console.log('Instance url: ', connection.instanceUrl);
    console.log('User id: ', userInfo.id);
    console.log('Org Id: ', userInfo.organizationId);

    const results = await connection.query(`
        SELECT box__Box_user__c,box__CollaborationID__c,box__Folder_ID__c,box__Object_Name__c,box__Record_ID__c,Id,Name 
        FROM box__FRUP__c 
        WHERE box__Folder_ID__c = '${parentFolderId}' LIMIT 1`);

    const records = results.records;
    const recordId = records[0].box__Record_ID__c;
    const objectType = records[0].box__Object_Name__c;
    console.log(`Found record with id: ${recordId} and object type: ${objectType}`);

    let metadataRes;
    switch(trigger) {
      case 'FILE.UPLOADED':
        //Set Submission status mdt and sfdc field
        metadataRes = await boxClient.files.setMetadata(fileId,boxClient.metadata.scopes.ENTERPRISE,'documentApproval',
          {
            documentStatus: 'New'
          });
        console.log('Doc Status MDT res: ', metadataRes);

        metadataRes = await boxClient.files.setMetadata(fileId,boxClient.metadata.scopes.ENTERPRISE,'salesforceMapping',
          {
            salesforceRecordId: recordId
          });
        console.log('SFDC MDT res: ', metadataRes);
        
        const taskRes = await boxClient.tasks.create(fileId, { message: 'Please review and approve the supporting documentation!'});
        console.log('Task creation response: ', taskRes);
        const taskAssignRes = await boxClient.tasks.assignByEmail(taskRes.id, 'kadams+govslack@boxdemo.com');
        console.log('Task assignment res: ', taskAssignRes); 
        break;
      case 'TASK_ASSIGNMENT.CREATED':
        //Set Submission status mdt and sfdc field
        metadataRes = await boxClient.files.setMetadata(fileId,boxClient.metadata.scopes.ENTERPRISE,'documentApproval',
          {
            documentStatus: 'In-Review'
          });
        console.log('MDT res: ', metadataRes);


        break;
      case 'TASK_ASSIGNMENT.UPDATED':
        console.log('Task updated: ', body);
        metadataRes = await boxClient.files.setMetadata(fileId,boxClient.metadata.scopes.ENTERPRISE,'documentApproval',
          {
            documentStatus: 'Approved'
          });
        console.log('MDT res: ', metadataRes);
        break;
      case 'METADATA_INSTANCE.UPDATED':
        const metadata = await boxClient.files.getMetadata(fileId, boxClient.metadata.scopes.ENTERPRISE, 'documentApproval');
        console.log('Found metadata values: ', metadata);
        const documentStatus = metadata.documentStatus;
        let updateRes;
        switch(documentStatus) {
          case 'New':
            updateRes = await connection.sobject(objectType).update({ 
              Id : recordId,
              SubmissionStatus__c : 'IND Received'
            });
            console.log('Update record with res: ', updateRes);
            break;
          case 'In-Review':
            updateRes = await connection.sobject(objectType).update({ 
              Id : recordId,
              SubmissionStatus__c : 'IND In-Review'
            });
            console.log('Update record with res: ', updateRes);
            break;
          case 'Approved':
            updateRes = await connection.sobject(objectType).update({ 
              Id : recordId,
              SubmissionStatus__c : 'IND Approved'
            });
            console.log('Update record with res: ', updateRes);
            break;
          default:
            console.log('Not matching document status: ', documentStatus);
        
        }
        break;
      default:
        console.log('No matching event trigger for: ', trigger);
    }
    

    const response = { test: 'this is a test'};
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(response);
});

// Creates webhook
receiver.router.post('/box/webhook', async (req, res) => {
    // You're working with an express req and res now.
    console.log('Create - Found webhook payload: ', JSON.stringify(req.body));

    const body = req.body;
    const webhookRes = await boxClient.webhooks.create(
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

receiver.router.post('/box/metadata', async (req, res) => {
  // You're working with an express req and res now.
  console.log('Create - Found metadata payload: ', JSON.stringify(req.body));
  
  const body = req.body;
  

  const response = { test: 'this is a test'};
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(response);
});

(async () => {
    await app.start(process.env.PORT || 8080);
    console.log('⚡️ Slack Bolt App is running!');
  })();
  

