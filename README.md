# Box GovSlack Demo
The Box GovSlack demo combines Box, Slack, and Salesforce.  These examples are designed to be used for demonstration, development, and test purposes.

## Pre-Requisites

1. Create a Client Credentials Grant Application in the [Box Developer Console](https://account.box.com/developers/services)
2. Copy the contents of the application JSON config file.
3. Create a free Heroku account if you don't already have one.
4. Deploy this template app to Heroku and add the environment variables below:
- `BOX_CLIENT_ID`
- `BOX_CLIENT_SECRET`
- `BOX_SUBJECT_TYPE`
- `BOX_SUBJECT_ID`
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
  
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Making modifications
1. Download and install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-command-line)
2. Log into the Heroku CLI
```shell
heroku login
```
3. Clone the repository
```shell
heroku git:clone -a <my-heroku-app-name>
```
4. Change directory to the cloned repo
```shell
cd <my-heroku-app-name>
```
5. Make your desired changes
6. Deploy your changes
```shell
git add .
git commit -am "Make mom proud"
git push heroku master
```
7. Tail logs
```shell
heroku logs --tail
```

## Disclaimer
This project is comprised of open source examples and should not be treated as an officially supported product. Use at your own risk. If you encounter any problems, please log an [issue](https://github.com/kylefernandadams/box-govslack/issues).

## License

The MIT License (MIT)

Copyright (c) 2022 Kyle Adams

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
