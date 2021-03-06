/*
This is a one-off script to run on all open PRs to add
a comment and "status: needs update" label to any PR with guide articles which
have frontmatter issues.
*/

require('dotenv').config({ path: '../.env' });
const fetch = require('node-fetch');

const { owner, repo, octokitConfig, octokitAuth } = require('../constants');

const octokit = require('@octokit/rest')(octokitConfig);

const { getPRs, getUserInput } = require('../getPRs');
const { addLabels, addComment } = require('../prTasks');
const { rateLimiter, savePrData, ProcessingLog } = require('../utils');
const { frontmatterCheck } = require('../validation/guideFolderChecks/frontmatterCheck');
const { createErrorMsg } = require('../validation/guideFolderChecks/createErrorMsg');

const allowedLangDirNames = [
  "arabic",
  "chinese",
  "english",
  "portuguese",
  "russian",
  "spanish"
];

octokit.authenticate(octokitAuth);

const log = new ProcessingLog();

const labeler = async (number, prFiles, currentLabels, guideFolderErrorsComment) => {
  const labelsToAdd = {}; // holds potential labels to add based on file path
  if (guideFolderErrorsComment) {
    labelsToAdd['status: needs update'] = 1;
  }
  const existingLabels = currentLabels.map(({ name }) => name);

  /* this next section only adds needed labels which are NOT currently on the PR. */
  const newLabels = Object.keys(labelsToAdd).filter(label => !existingLabels.includes(label));
  if (newLabels.length) {
    if (process.env.PRODUCTION_RUN === 'true') {
      addLabels(number, newLabels);
    }
    await rateLimiter(+process.env.RATELIMIT_INTERVAL | 1500);
  }
  return newLabels;
};

const checkPath = (fullPath, fileContent) => {
  let errorMsgs = [];
  const remaining = fullPath.split("/");
  const isTranslation = allowedLangDirNames.includes(remaining[1]) && remaining[1] !== 'english';
  const frontMatterErrMsgs = frontmatterCheck(fullPath, isTranslation, fileContent);
  return errorMsgs.concat(frontMatterErrMsgs);
};

const guideFolderChecks = async (number, prFiles, user) => {
  let prErrors = [];
  for (let { filename: fullPath, raw_url: fileUrl } of prFiles) {
    let newErrors;
    if (/^guide\//.test(fullPath)) {
      const response = await fetch(fileUrl);
      const fileContent = await response.text();
      newErrors = checkPath(fullPath, fileContent);
    }
    if (newErrors) {
      prErrors = prErrors.concat(newErrors);
    }
  }

  if (prErrors.length) {
    const comment = createErrorMsg(prErrors, user)
    if (process.env.PRODUCTION_RUN === 'true') {
      const result = await addComment(number, comment);
    }
    await rateLimiter(+process.env.RATELIMIT_INTERVAL | 1500);
    return comment;
  }
  else {
    return null;
  }
};

(async () => {
  const { firstPR, lastPR } = await getUserInput();
  const prPropsToGet = ['number', 'labels', 'user'];
  const { openPRs } = await getPRs(firstPR, lastPR, prPropsToGet);

  if (openPRs.length) {
    savePrData(openPRs, firstPR, lastPR);
    log.start();
    console.log('Starting frontmatter checks process...');
    for (let count in openPRs) {
      let { number, labels: currentLabels, user: { login: username } } = openPRs[count];
      log.add(number, 'comment');
      log.add(number, 'labels');

      const { data: prFiles } = await octokit.pullRequests.listFiles({ owner, repo, number });

      const guideFolderErrorsComment = await guideFolderChecks(number, prFiles, username);
      const commentLogVal = guideFolderErrorsComment ? guideFolderErrorsComment : 'none';
      log.update(number, 'comment', commentLogVal)

      const labelsAdded = await labeler(number, prFiles, currentLabels, guideFolderErrorsComment);
      const labelLogVal = labelsAdded.length ? labelsAdded : 'none added';
      log.update(number, 'labels', labelLogVal);
    }
  }
})()
.then(() => {
  log.finish();
  console.log('Successfully completed frontmatter checks');
})
.catch(err => {
  log.finish();
  console.log(err)
})
