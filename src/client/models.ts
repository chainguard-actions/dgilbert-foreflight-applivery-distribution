import * as utils from '../utils.js'

export enum PublicationFilterType {
  Last = 'last',
  Builds = 'builds',
  GitBranch = 'gitBranch',
  GitTag = 'gitTag',
  Tag = 'tag'
}

export enum PublicationVisibility {
  Active = 'active',
  Inactive = 'inactive',
  Unlisted = 'unlisted'
}

export enum PublicationSecurity {
  Public = 'public',
  Password = 'password',
  Logged = 'logged'
}

/**
 * Type-safe query parameters for fetching publications
 * Leverages existing enums for better type checking
 */
export interface PublicationQueryParams {
  /** Filter by publication visibility */
  visibility?: PublicationVisibility
  /** Filter by publication security level */
  security?: PublicationSecurity
  /** Filter by publication filter type */
  filterType?: PublicationFilterType
  /** Filter by publication filter value */
  filterValue?: string
  /** Filter by publication slug */
  slug?: string
}

export interface Publication {
  id: string
  slug: string
  distributionUrl: string
  updatedAt: Date
  createdAt: Date
  filter: {
    type: PublicationFilterType
    value: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
  visibility: PublicationVisibility
  security: PublicationSecurity
  groups: string[]
  tags: string[]
  // Add other fields as needed based on the API response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Raw API response type (what comes from JSON.parse)
export type PublicationRaw = Omit<Publication, 'updatedAt' | 'createdAt'> & {
  updatedAt: string
  createdAt: string
}

/**
 * Transforms a raw publication (with date strings) to a Publication (with Date objects)
 * Uses the reusable date transformer utility
 */
export const publicationTransformer = utils.createDateTransformer<
  PublicationRaw,
  Publication
>(['updatedAt', 'createdAt'])

// Raw API response (what comes from JSON.parse)
export type PublicationsResponseRaw = {
  data: {
    items: PublicationRaw[]
    totalItems: number
    itemsPerPage: number
    currentPage: number
    totalPages: number
  }
}

/**
 * Request payload to create a new publication
 */
export interface CreatePublicationRequest {
  /** Slug used to access the distribution */
  slug: string
  /** Publication security level */
  security?: PublicationSecurity
  /** Password for the publication */
  password: string
  /** Publication visibility */
  visibility: PublicationVisibility
  /** Filter applied to this publication (e.g., git branch) */
  filter: {
    type: PublicationFilterType
    value: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
  /** Tags for categorization */
  tags?: string[]
  /** Target groups allowed to access the distribution */
  groups?: string[]
  /** Show developer info in the distribution */
  showDevInfo?: boolean
  /** Show history in the distribution */
  showHistory?: boolean
  /** Additional vendor-specific fields */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Raw API response (single item) for create/read endpoints
export type PublicationCreateResponseRaw = {
  data: PublicationRaw
}

export interface DeployerInfo {
  name?: string
  info?: {
    commitMessage?: string
    commit?: string
    branch?: string
    triggerTimestamp?: string
    buildUrl?: string
    ciUrl?: string
    repositoryUrl?: string
    buildNumber?: string
    tag?: string
  }
}

export interface UploadedBy {
  id?: string
  email?: string
  firstName?: string
  lastName?: string
  picture?: string
}

export interface StorageProvider {
  id?: string
  name?: string
  region?: string
  config?: string
}

export interface ApplicationInfo {
  id?: string
  name?: string
  slug?: string
  picture?: string
}

export interface Build {
  id: string
  status: string
  tags: string[]
  versionName: string
  application: string
  applicationInfo: ApplicationInfo
  changelog?: string
  info?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
  size?: number
  processTime?: number
  queuedTime?: number
  versionCode?: string
  os?: BuildPlatform
  deployer?: DeployerInfo
  uploadedBy?: UploadedBy
  storageProvider?: StorageProvider
  updatedAt: Date
  createdAt: Date
  /** Additional vendor-specific fields */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Raw API response type (what comes from JSON.parse)
export type BuildRaw = Omit<Build, 'updatedAt' | 'createdAt'> & {
  updatedAt: string
  createdAt: string
}

/**
 * Transforms a raw build (with date strings) to a Build (with Date objects)
 * Uses the reusable date transformer utility
 */
export const buildTransformer = utils.createDateTransformer<BuildRaw, Build>([
  'updatedAt',
  'createdAt'
])

// Raw API response for build upload
export type BuildUploadResponseRaw = {
  status: boolean
  error?: {
    code: number
    message: string
  }
  data: BuildRaw
}

/**
 * Request payload to upload a new build
 */
export interface UploadBuildRequest {
  /** Human readable version name for this build */
  versionName: string
  /** Comma separated tags */
  tags?: string[]
  /** Build release notes or log of changes */
  changelog?: string
  /** Platform type */
  buildPlatform: BuildPlatform
  /** Notify App and Organization collaborators */
  notifyCollaborators?: boolean
  /** Notify App and Organization employees */
  notifyEmployees?: boolean
  /** Notification message to send in the email */
  notifyMessage?: string
  /** Notification language */
  notifyLanguage?: NotifyLanguage
  /** Deployer information */
  deployer?: DeployerInfo
}

export enum NotifyLanguage {
  Spanish = 'es',
  English = 'en',
  French = 'fr',
  German = 'ge',
  Italian = 'it',
  Chinese = 'zh',
  Portuguese = 'pt',
  Russian = 'ru'
}

export enum BuildPlatform {
  iOS = 'ios',
  Android = 'android'
}
