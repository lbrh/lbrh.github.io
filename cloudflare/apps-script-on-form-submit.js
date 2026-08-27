/**
 * Fires the instant someone submits the PPNYC Document Hub Google Form,
 * and pushes the submission straight to the Cloudflare Worker
 * (ppnyc-docs-worker.js) so the live document link updates within
 * seconds — no polling.
 *
 * Setup:
 * 1. Open the Form's response Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Delete the placeholder code and paste this file in.
 * 4. Fill in WEBHOOK_URL (your deployed worker's URL + "/update") and
 *    SHARED_SECRET (must exactly match the worker's UPDATE_SECRET).
 * 5. Save, then click the clock icon (Triggers) in the left sidebar ->
 *    Add Trigger -> choose function "onFormSubmit", event source
 *    "From spreadsheet", event type "On form submit" -> Save.
 *    ("From form" also works — see the fallback below — but "From
 *    spreadsheet" is the one these setup steps assume.)
 * 6. Google will ask you to authorize the script (it needs permission
 *    to make an outbound request) — this is your own script running in
 *    your own account, so it's safe to allow.
 * 7. Submit a test response through the Form and check Executions
 *    (left sidebar) to confirm it ran and see the worker's response.
 *    If it logs "Missing ... — skipping", the log line now also prints
 *    the question titles it actually found — compare those against
 *    DOCUMENT_QUESTION_TITLE / FILE_QUESTION_TITLE below and fix
 *    whichever one doesn't match (capitalization/punctuation counts).
 *
 * These two must match your Form's actual question text exactly.
 */

var WEBHOOK_URL = 'https://REPLACE-WITH-YOUR-WORKER-SUBDOMAIN.workers.dev/update';
var SHARED_SECRET = 'REPLACE_WITH_THE_SAME_SECRET_YOU_SET_ON_THE_WORKER';

var DOCUMENT_QUESTION_TITLE = 'Which document?';
var FILE_QUESTION_TITLE = 'Upload the PDF';

function onFormSubmit(e) {
  var found = readSubmission(e);

  if (!found.label || !found.driveUrl) {
    Logger.log(
      'Missing "%s" or "%s" in this submission — skipping. Question titles found: %s',
      DOCUMENT_QUESTION_TITLE,
      FILE_QUESTION_TITLE,
      found.titlesSeen.length ? found.titlesSeen.join(', ') : '(none — check the trigger is "On form submit")'
    );
    return;
  }

  var payload = { label: found.label, driveUrl: found.driveUrl };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Update-Secret': SHARED_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log('Worker responded: %s %s', response.getResponseCode(), response.getContentText());
}

// Handles both installable-trigger shapes Google can hand us:
//   - trigger added on the response SPREADSHEET ("From spreadsheet"):
//     e.namedValues is a map of exact question title -> [answer(s)].
//     A file-upload answer here is already a full Drive share link.
//   - trigger added on the FORM itself ("From form"): e.response is a
//     FormResponse; a file-upload answer here is an array of raw Drive
//     file IDs, not a link, so one gets built from the ID.
function readSubmission(e) {
  var label = null;
  var driveUrl = null;
  var titlesSeen = [];

  if (e && e.namedValues) {
    titlesSeen = Object.keys(e.namedValues);
    label = firstValue(findByTitle(e.namedValues, DOCUMENT_QUESTION_TITLE));
    var fileLinkRaw = firstValue(findByTitle(e.namedValues, FILE_QUESTION_TITLE));
    if (fileLinkRaw) driveUrl = fileLinkRaw.split(',')[0].trim();
  }

  if ((!label || !driveUrl) && e && e.response) {
    e.response.getItemResponses().forEach(function (itemResponse) {
      var title = itemResponse.getItem().getTitle();
      titlesSeen.push(title);

      if (!label && titleMatches(title, DOCUMENT_QUESTION_TITLE)) {
        label = itemResponse.getResponse();
      }
      if (!driveUrl && titleMatches(title, FILE_QUESTION_TITLE)) {
        var ids = itemResponse.getResponse(); // array of Drive file IDs
        if (ids && ids.length) driveUrl = 'https://drive.google.com/open?id=' + ids[0];
      }
    });
  }

  return { label: label, driveUrl: driveUrl, titlesSeen: titlesSeen };
}

// Case/whitespace-tolerant lookup, since a trailing space or different
// capitalization in the Form question shouldn't silently break this.
function findByTitle(namedValues, expectedTitle) {
  var exact = namedValues[expectedTitle];
  if (exact) return exact;

  var wantedKey = Object.keys(namedValues).filter(function (key) {
    return titleMatches(key, expectedTitle);
  })[0];
  return wantedKey ? namedValues[wantedKey] : null;
}

function titleMatches(actual, expected) {
  return !!actual && actual.trim().toLowerCase() === expected.trim().toLowerCase();
}

function firstValue(arr) {
  return arr && arr.length ? arr[0] : null;
}
