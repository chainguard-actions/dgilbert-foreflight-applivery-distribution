/**
 * Transforms specified string fields to Date objects
 * @param obj - The object to transform
 * @param dateFields - Array of field names that should be converted to Date
 * @returns New object with date fields transformed to Date objects
 */
export function transformDates(obj, dateFields) {
    const result = { ...obj };
    for (const field of dateFields) {
        const value = result[field];
        if (typeof value === 'string' && value) {
            result[field] = new Date(value);
        }
        else if (value === undefined || value === null) {
            // Keep undefined/null as is - don't try to convert
            result[field] = value;
        }
    }
    return result;
}
/**
 * Creates a transform function for a specific set of date fields
 * Useful for creating model-specific transformers
 */
export function createDateTransformer(dateFields) {
    return (raw) => {
        return transformDates(raw, dateFields);
    };
}
/**
 * Transforms an array of objects by converting specified date string fields to Date objects
 * @param items - Array of objects to transform
 * @param dateFields - Array of field names that should be converted to Date
 * @returns New array with all items' date fields transformed
 */
export function transformDatesArray(items, dateFields) {
    return items.map((item) => transformDates(item, dateFields));
}
export function getDeployerInfo(context) {
    const repositoryUrl = context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo;
    const buildUrl = context.serverUrl +
        '/' +
        context.repo.owner +
        '/' +
        context.repo.repo +
        '/actions/runs/' +
        context.runId;
    const branchName = context.ref.replace('refs/heads/', '');
    let commitMessage;
    switch (context.eventName) {
        case 'push':
            commitMessage = context.payload.head_commit?.message || undefined;
            break;
        case 'pull_request':
            commitMessage = context.payload.pull_request?.title || undefined;
            break;
        default:
            commitMessage = undefined;
            break;
    }
    return {
        name: 'GitHub Actions',
        info: {
            commit: context.sha,
            commitMessage: commitMessage,
            branch: branchName,
            triggerTimestamp: new Date().toISOString(),
            ciUrl: context.serverUrl,
            repositoryUrl: repositoryUrl,
            buildUrl: buildUrl,
            buildNumber: context.runId.toString()
        }
    };
}
