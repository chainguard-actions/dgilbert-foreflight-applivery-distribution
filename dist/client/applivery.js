import * as core from '@actions/core';
import styles from 'ansi-styles';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { AppliveryAPIError, AppliveryNetworkError, AppliveryParseError } from './errors.js';
import { buildTransformer, PublicationFilterType, PublicationSecurity, publicationTransformer, PublicationVisibility } from './models.js';
export { AppliveryAPIError, AppliveryNetworkError, AppliveryParseError, PublicationFilterType, PublicationSecurity, PublicationVisibility };
/**
 * Fetches all publications from Applivery API with pagination support
 * @param apiKey - Applivery API key
 * @param baseUrl - Base URL for the Applivery API
 * @param queryParams - Optional query parameters to filter publications (page and limit are excluded to maintain pagination logic)
 * @returns Array of all publication items with Date objects for timestamps
 * @throws {AppliveryAPIError} When the API returns an error status code
 * @throws {AppliveryNetworkError} When there's a network connectivity issue
 * @throws {AppliveryParseError} When the response cannot be parsed as JSON
 * @example
 * // Fetch all publications
 * const publications = await fetchPublications(apiKey, baseUrl);
 *
 * // Fetch publications with type-safe filters
 * const filteredPublications = await fetchPublications(apiKey, baseUrl, {
 *   visibility: PublicationVisibility.Active,
 *   security: PublicationSecurity.Public,
 *   filterType: PublicationFilterType.GitBranch,
 *   filterValue: 'main',
 *   slug: 'my-app'
 * });
 */
export async function fetchPublications(apiKey, baseUrl, queryParams, sortBy, sortOrder) {
    // Ensure baseUrl ends with a slash
    const apiBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    // Construct query string from parameters, excluding page and limit
    const buildQueryString = (page, customParams) => {
        const params = new URLSearchParams();
        // Add custom query parameters (excluding page and limit)
        if (customParams) {
            Object.entries(customParams).forEach(([key, value]) => {
                if (key !== 'page' &&
                    key !== 'limit' &&
                    value !== undefined &&
                    value !== null) {
                    params.append(key, String(value));
                }
            });
        }
        if (sortBy) {
            params.append('sort', `${sortBy}:${sortOrder}`);
        }
        // Always add page parameter for pagination
        params.append('page', String(page));
        const queryString = params.toString();
        return queryString ? `?${queryString}` : '';
    };
    const allItems = [];
    let currentPage = 1;
    let totalPages = 1;
    try {
        do {
            core.startGroup(styles.magenta.open +
                `Fetching publications for ${queryParams?.slug || queryParams?.filterValue || 'all'} via Applivery API` +
                styles.magenta.close);
            const queryString = buildQueryString(currentPage, queryParams);
            const url = `${apiBaseUrl}integrations/distributions${queryString}`;
            // Log outbound request details
            core.debug(styles.color.cyan.open + `Request URL: ${url}` + styles.color.cyan.close);
            let response;
            try {
                response = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            catch (error) {
                if (axios.isAxiosError(error)) {
                    if (error.response) {
                        // Server responded with error status
                        throw new AppliveryAPIError(`Failed to fetch publications: ${error.response.statusText || 'Unknown error'}`, error.response.status, JSON.stringify(error.response.data));
                    }
                    else if (error.request) {
                        // Network error
                        throw new AppliveryNetworkError(`Network error while fetching publications from ${url}`, error);
                    }
                    else {
                        // Other error
                        throw new AppliveryNetworkError(`Error while fetching publications from ${url}`, error);
                    }
                }
                else {
                    throw new AppliveryNetworkError(`Unexpected error while fetching publications from ${url}`, error);
                }
            }
            switch (response.status) {
                case 201:
                case 200:
                    core.debug(styles.green.open +
                        `Response Status: ${response.status} ${response.statusText || ''}` +
                        styles.green.close);
                    core.debug(styles.green.open +
                        `Response Body Length: ${JSON.stringify(response.data).length} bytes` +
                        styles.green.close);
                    break;
                default:
                    core.debug(styles.red.open +
                        `Response Status: ${response.status} ${response.statusText || ''}` +
                        styles.red.close);
                    throw new AppliveryAPIError(`Failed to fetch publications: ${response.statusText || 'Unknown error'}`, response.status, JSON.stringify(response.data));
            }
            // Validate response structure
            if (!response.data.data || !Array.isArray(response.data.data.items)) {
                throw new AppliveryParseError('Invalid response structure: missing data.items array', JSON.stringify(response.data));
            }
            // Transform raw publications to have proper Date objects
            let transformedItems = response.data.data.items.map(publicationTransformer);
            if (queryParams?.filterType && queryParams?.filterValue) {
                transformedItems = transformedItems.filter((item) => {
                    return (item.filter.type === queryParams.filterType &&
                        item.filter.value === queryParams.filterValue);
                });
            }
            // Add items from current page
            allItems.push(...transformedItems);
            // Update pagination info
            totalPages = response.data.data.totalPages || 1;
            core.debug(`Fetched ${transformedItems.length} items from page ${currentPage}/${totalPages}`);
            currentPage++;
            core.endGroup();
        } while (currentPage <= totalPages);
        core.startGroup(styles.green.open +
            `Total items fetched: ${allItems.length}` +
            styles.green.close);
        core.debug(styles.cyan.open + JSON.stringify(allItems, null, 2) + styles.cyan.close);
        core.endGroup();
        return allItems;
    }
    catch (error) {
        // Re-throw custom errors as-is
        if (error instanceof AppliveryAPIError ||
            error instanceof AppliveryNetworkError ||
            error instanceof AppliveryParseError) {
            throw error;
        }
        // Wrap unexpected errors
        throw new Error(`Unexpected error while fetching publications: ${error}`);
    }
}
/**
 * Creates a new publication in Applivery
 * Mirrors the style of fetchPublications for consistency in logging and error handling
 * @param apiKey - Applivery API key
 * @param baseUrl - Base URL for the Applivery API
 * @param payload - Payload to create the publication
 * @returns The created publication
 * @throws {AppliveryAPIError} When the API returns an error status code
 * @throws {AppliveryNetworkError} When there's a network connectivity issue
 * @throws {AppliveryParseError} When the response cannot be parsed as JSON
 * @example
 * // Create a new publication (Public - Unlisted)
 * const publication = await createPublication(apiKey, baseUrl, {
 *   slug: 'my-app',
 *   visibility: PublicationVisibility.Unlisted,
 *   security: PublicationSecurity.Public,
 *   password: null,
 *   filter: {
 *     type: PublicationFilterType.GitBranch,
 *     value: 'main',
 *   },
 * });
 *
 * // Create a new publication with a password (Password - Unlisted)
 * const publication = await createPublication(apiKey, baseUrl, {
 *   slug: 'my-app',
 *   visibility: PublicationVisibility.Unlisted,
 *   security: PublicationSecurity.Password,
 *   password: 'my-password',
 *   filter: {
 *     type: PublicationFilterType.GitBranch,
 *     value: 'main',
 *   },
 * });
 */
export async function createPublication(apiKey, baseUrl, payload) {
    const apiBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = `${apiBaseUrl}integrations/distributions`;
    core.startGroup(styles.magenta.open +
        `Creating publication '${payload.slug}' via Applivery API` +
        styles.magenta.close);
    core.debug(styles.color.cyan.open + `Request URL: ${url}` + styles.color.cyan.close);
    core.debug(styles.color.cyan.open +
        `Request Body: ${JSON.stringify(payload)}` +
        styles.color.cyan.close);
    let response;
    try {
        response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Server responded with error status
                throw new AppliveryAPIError(`Failed to create publication: ${error.response.statusText || 'Unknown error'}`, error.response.status, JSON.stringify(error.response.data));
            }
            else if (error.request) {
                // Network error
                throw new AppliveryNetworkError(`Network error while creating publication at ${url}`, error);
            }
            else {
                // Other error
                throw new AppliveryNetworkError(`Error while creating publication at ${url}`, error);
            }
        }
        else {
            throw new AppliveryNetworkError(`Unexpected error while creating publication at ${url}`, error);
        }
    }
    switch (response.status) {
        case 201:
        case 200:
            core.debug(styles.green.open +
                `Response Status: ${response.status} ${response.statusText || ''}` +
                styles.green.close);
            core.debug(styles.green.open +
                `Response Body Length: ${JSON.stringify(response.data).length} bytes` +
                styles.green.close);
            break;
        default:
            core.debug(styles.red.open +
                `Response Status: ${response.status} ${response.statusText || ''}` +
                styles.red.close);
            throw new AppliveryAPIError(`Failed to create publication: ${response.statusText || 'Unknown error'}`, response.status, JSON.stringify(response.data));
    }
    if (!response.data.data) {
        throw new AppliveryParseError('Invalid response structure: missing data object', JSON.stringify(response.data));
    }
    const transformed = publicationTransformer(response.data.data);
    core.endGroup();
    return transformed;
}
/**
 * Uploads a new build to Applivery
 * @param apiKey - Applivery API key
 * @param baseUrl - Base URL for the Applivery API
 * @param payload - Payload to upload the build
 * @returns The uploaded build
 * @throws {AppliveryAPIError} When the API returns an error status code
 * @throws {AppliveryNetworkError} When there's a network connectivity issue
 * @throws {AppliveryParseError} When the response cannot be parsed as JSON
 */
export async function uploadBuild(apiKey, baseUrl, buildPath, payload) {
    const apiBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = `${apiBaseUrl}integrations/builds`;
    const filename = path.basename(buildPath);
    // Validate the build file exists
    if (!fs.existsSync(buildPath)) {
        throw new Error(`Build file does not exist: ${buildPath}`);
    }
    // Construct the form data
    let formData = new FormData();
    // Required Fields
    formData.append('build', fs.createReadStream(buildPath), {
        filename: filename
    });
    formData.append('versionName', payload.versionName);
    formData.append('buildPlatform', payload.buildPlatform);
    // Optional Fields
    if (payload.tags && payload.tags.length > 0)
        formData.append('tags', payload.tags.join(','));
    if (payload.changelog)
        formData.append('changelog', payload.changelog);
    if (payload.notifyCollaborators)
        formData.append('notifyCollaborators', payload.notifyCollaborators.toString());
    if (payload.notifyEmployees)
        formData.append('notifyEmployees', payload.notifyEmployees.toString());
    if (payload.notifyMessage)
        formData.append('notifyMessage', payload.notifyMessage);
    if (payload.notifyLanguage)
        formData.append('notifyLanguage', payload.notifyLanguage);
    // Deployer information
    if (payload.deployer) {
        if (payload.deployer.name)
            formData.append('deployer.name', payload.deployer.name);
        if (payload.deployer.info) {
            const info = payload.deployer.info;
            if (info.commitMessage)
                formData.append('deployer.info.commitMessage', info.commitMessage);
            if (info.commit)
                formData.append('deployer.info.commit', info.commit);
            if (info.branch)
                formData.append('deployer.info.branch', info.branch);
            if (info.tag)
                formData.append('deployer.info.tag', info.tag);
            if (info.triggerTimestamp)
                formData.append('deployer.info.triggerTimestamp', info.triggerTimestamp);
            if (info.buildUrl)
                formData.append('deployer.info.buildUrl', info.buildUrl);
            if (info.ciUrl)
                formData.append('deployer.info.ciUrl', info.ciUrl);
            if (info.repositoryUrl)
                formData.append('deployer.info.repositoryUrl', info.repositoryUrl);
            if (info.buildNumber)
                formData.append('deployer.info.buildNumber', info.buildNumber);
        }
    }
    let config = {
        url: url,
        method: 'post',
        maxBodyLength: Infinity,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            ...formData.getHeaders()
        },
        data: formData
    };
    core.startGroup(styles.magenta.open +
        `Uploading build '${filename}' via Applivery Uploads API` +
        styles.magenta.close);
    core.debug(styles.color.cyan.open + `Request URL: ${url}` + styles.color.cyan.close);
    core.debug(JSON.stringify(config, null, 2));
    let response;
    try {
        response = await axios.request(config);
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Server responded with error status
                throw new AppliveryAPIError(`Failed to upload build: ${error.response.statusText || 'Unknown error'}`, error.response.status, JSON.stringify(error.response.data));
            }
            else if (error.request) {
                // Network error
                throw new AppliveryNetworkError(`Network error while uploading build to ${url}`, error);
            }
            else {
                // Other error
                throw new AppliveryNetworkError(`Error while uploading build to ${url}`, error);
            }
        }
        else {
            throw new AppliveryNetworkError(`Unexpected error while uploading build to ${url}`, error);
        }
    }
    switch (response.status) {
        case 201:
        case 200:
            core.debug(styles.green.open +
                `Response Status: ${response.status} ${response.statusText || ''}` +
                styles.green.close);
            core.debug(styles.green.open +
                `Response Body Length: ${JSON.stringify(response.data).length} bytes` +
                styles.green.close);
            break;
        default:
            throw new AppliveryAPIError(`Failed to upload build: ${response.statusText || 'Unknown error'}`, response.status, JSON.stringify(response.data));
    }
    const transformed = buildTransformer(response.data.data);
    core.endGroup();
    return transformed;
}
export async function getBuild(apiKey, baseUrl, buildId) {
    const apiBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = `${apiBaseUrl}integrations/builds/${buildId}`;
    let config = {
        url: url,
        method: 'get',
        headers: {
            Authorization: `Bearer ${apiKey}`
        }
    };
    let response;
    try {
        response = await axios.request(config);
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Server responded with error status
                throw new AppliveryAPIError(`Failed to upload build: ${error.response.statusText || 'Unknown error'}`, error.response.status, JSON.stringify(error.response.data));
            }
            else if (error.request) {
                // Network error
                throw new AppliveryNetworkError(`Network error while uploading build to ${url}`, error);
            }
            else {
                // Other error
                throw new AppliveryNetworkError(`Error while uploading build to ${url}`, error);
            }
        }
        else {
            throw new AppliveryNetworkError(`Unexpected error while uploading build to ${url}`, error);
        }
    }
    switch (response.status) {
        case 201:
        case 200:
            core.debug(styles.green.open +
                `Response Status: ${response.status} ${response.statusText || ''}` +
                styles.green.close);
            core.debug(styles.green.open +
                `Response Body Length: ${JSON.stringify(response.data).length} bytes` +
                styles.green.close);
            break;
        default:
            throw new AppliveryAPIError(`Failed to upload build: ${response.statusText || 'Unknown error'}`, response.status, JSON.stringify(response.data));
    }
    const transformed = buildTransformer(response.data.data);
    core.endGroup();
    return transformed;
}
