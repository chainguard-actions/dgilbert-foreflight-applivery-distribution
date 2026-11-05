import * as utils from '../utils.js';
export var PublicationFilterType;
(function (PublicationFilterType) {
    PublicationFilterType["Last"] = "last";
    PublicationFilterType["Builds"] = "builds";
    PublicationFilterType["GitBranch"] = "gitBranch";
    PublicationFilterType["GitTag"] = "gitTag";
    PublicationFilterType["Tag"] = "tag";
})(PublicationFilterType || (PublicationFilterType = {}));
export var PublicationVisibility;
(function (PublicationVisibility) {
    PublicationVisibility["Active"] = "active";
    PublicationVisibility["Inactive"] = "inactive";
    PublicationVisibility["Unlisted"] = "unlisted";
})(PublicationVisibility || (PublicationVisibility = {}));
export var PublicationSecurity;
(function (PublicationSecurity) {
    PublicationSecurity["Public"] = "public";
    PublicationSecurity["Password"] = "password";
    PublicationSecurity["Logged"] = "logged";
})(PublicationSecurity || (PublicationSecurity = {}));
/**
 * Transforms a raw publication (with date strings) to a Publication (with Date objects)
 * Uses the reusable date transformer utility
 */
export const publicationTransformer = utils.createDateTransformer(['updatedAt', 'createdAt']);
/**
 * Transforms a raw build (with date strings) to a Build (with Date objects)
 * Uses the reusable date transformer utility
 */
export const buildTransformer = utils.createDateTransformer([
    'updatedAt',
    'createdAt'
]);
export var NotifyLanguage;
(function (NotifyLanguage) {
    NotifyLanguage["Spanish"] = "es";
    NotifyLanguage["English"] = "en";
    NotifyLanguage["French"] = "fr";
    NotifyLanguage["German"] = "ge";
    NotifyLanguage["Italian"] = "it";
    NotifyLanguage["Chinese"] = "zh";
    NotifyLanguage["Portuguese"] = "pt";
    NotifyLanguage["Russian"] = "ru";
})(NotifyLanguage || (NotifyLanguage = {}));
export var BuildPlatform;
(function (BuildPlatform) {
    BuildPlatform["iOS"] = "ios";
    BuildPlatform["Android"] = "android";
})(BuildPlatform || (BuildPlatform = {}));
