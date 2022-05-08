'use strict';

const core = require('@actions/core'),
    github = require('@actions/github');

if(!github.context.payload.issue && !/\/(?:issue|pull-request)s\/\d+$/.test(github.context.payload.project_card?.content_url)) {
    core.info('Not running on an event with an associated issue.');
    return;
}

const MAX_WEIGHTED_LENGTH = 280;

function isValidTweetUrl(url) {
  return /^https?:\/\/(?:www\.)?twitter.com\/[^/]+\/status\/([0-9]+)\/?$/.test(url);
}

const inputs = {
    cardContent: JSON.parse(core.getInput('cardContent')),
    failOnValidationError: core.getBooleanInput('failOnValidationError'),
};

async function validate() {
    const content = inputs.cardContent;
    const errors = [];

    if (!content.description) {
        errors.push(`No content description provided. Please add a content description section to your issue.`);
    }

    if (content.hasOwnProperty('replyTo') && (!content.replyTo || !isValidTweetUrl(content.replyTo))) {
        errors.push(`The reply section needs to have content and only link a Tweet URL to reply to.`);
    }

    if (content.hasOwnProperty('repost') && (!content.repost || !isValidTweetUrl(content.repost))) {
        errors.push(`Retweets need to have a Tweet URL to retweet in the retweet section.`);
    }

    if (!content.hasOwnProperty('repost') && !content.content) {
        errors.push(`Tweets need to have a content section.`);
    }

    if (content.hasOwnProperty('content')) {
        const pureTweet = content.content.replace(/!\[[^\]]*\]\(([^)]+)\)/g, '');
        const parsedTweet = twitter.parseTweet(pureTweet);
        if(parsedTweet.weightedLength > MAX_WEIGHTED_LENGTH) {
            errors.push(`Tweet content too long by ${parsedTweet.weightedLength - MAX_WEIGHTED_LENGTH} weighted characters.`);
        }
    }

    core.setOutput('validationErrors', JSON.stringify(errors));

    if (inputs.failOnValidationError && errors.length > 0) {
        const errorMessage = 'Content validations failed';
        console.error(errorMessage, errors);
        core.setFailed(errorMessage);
        return;
    }
}

validate().catch((error) => {
    console.error(error);
    core.setFailed(error.message);
});
