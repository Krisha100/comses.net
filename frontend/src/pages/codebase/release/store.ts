import { CodebaseReleaseStore } from "@/store/common";
import { CodebaseReleaseAPI, CodebaseAPI } from "@/api";
import * as _ from "lodash";
import * as yup from "yup";

const codebaseReleaseAPI = new CodebaseReleaseAPI();
const codebaseAPI = new CodebaseAPI();

const initialState: CodebaseReleaseStore = {
  files: {
    originals: {
      code: [],
      data: [],
      docs: [],
      results: [],
    },
    media: [],
  },
  release: {
    codebase: {
      associatiated_publications_text: "",
      description: "",
      doi: null,
      featured: false,
      first_published_on: "2006-01-01",
      has_published_changes: false,
      identifier: "",
      is_replication: false,
      keywords: [],
      last_published_on: "2006-01-01",
      latest_version: null,
      live: false,
      peer_reviewed: false,
      references_text: "",
      relationships: {},
      repository_url: "",
      submitter: {
        family_name: "",
        given_name: "",
        username: "",
      },
      summary: "",
      tags: [],
      title: "",
    },
    absolute_url: "",
    release_contributors: [],
    dependencies: [],
    documentation: "",
    doi: null,
    embargo_end_date: null,
    identifier: "",
    license: "",
    live: false,
    os: "",
    peer_reviewed: false,
    platforms: [],
    possible_licenses: [],
    programming_languages: [],
    release_notes: "",
    review_status: null,
    submitted_package: "",
    submitter: {
      family_name: "",
      given_name: "",
      username: "",
    },
    version_number: "",
    urls: {
      request_peer_review: null,
      review: null,
      notify_reviewers_of_changes: null,
    },
  },
};

export const contributorSchema = yup.object().shape({
  user: yup
    .object()
    .shape({
      name: yup.string(),
      institution_name: yup.string(),
      institution_url: yup.string(),
      profile_url: yup.string(),
      username: yup.string(),
    })
    .nullable(),
  given_name: yup.string().required(),
  family_name: yup.string().required(),
  middle_name: yup.string(),
  affilitions: yup.array().of(yup.string()).min(1),
  type: yup.mixed().oneOf(["person", "organization"]),
});

export const schema = yup.object().shape({
  codebase: yup
    .object()
    .shape({
      title: yup.string().required(),
      description: yup.string().required().min(20),
      live: yup.bool().label("is published?"),
      is_replication: yup.bool(),
      repository_url: yup.string().url(`Not a valid url. URLs must start with http or https`),
    })
    .required(),
  contributors: yup.array().of(contributorSchema),
  release_notes: yup.string().required(),
  embargo_end_date: yup.date().nullable().label("embargo end date"),
  os: yup.string().required(),
  platforms: yup.array().of(yup.string()),
  programming_languages: yup.array().of(yup.string()),
  live: yup.bool(),
  license: yup.string().required(),
});

function getFiles(context, category) {
  return codebaseReleaseAPI
    .listOriginalFiles({
      identifier: context.state.release.codebase.identifier,
      version_number: context.state.release.version_number,
      category,
    })
    .then(response => context.commit("setFiles", { category, value: response.data }));
}

export const store = {
  state: { ...initialState },
  getters: {
    detail(state: CodebaseReleaseStore) {
      return {
        documentation: state.release.documentation,
        embargo_end_date: state.release.embargo_end_date,
        os: state.release.os,
        license: state.release.license,
        live: state.release.live,
        platforms: state.release.platforms,
        programming_languages: state.release.programming_languages,
        release_notes: state.release.release_notes,
      };
    },

    identity(state: CodebaseReleaseStore) {
      return {
        identifier: state.release.codebase.identifier,
        version_number: state.release.version_number,
      };
    },
    release_contributors(state: CodebaseReleaseStore) {
      return state.release.release_contributors;
    },
  },
  mutations: {
    setReviewStatus(state, review_status) {
      state.release.review_status = review_status;
    },
    setUrls(state, urls) {
      state.release.urls.review = urls.review;
      state.release.urls.notify_reviewers_of_changes = urls.notify_reviewers_of_changes;
    },
    setCodebase(state, codebase) {
      state.release.codebase = _.cloneDeep(codebase);
    },
    setMediaFiles(state, files) {
      state.files.media = files;
    },
    setReleaseContributors(state, release_contributors) {
      state.release.release_contributors = release_contributors;
    },
    setCodebaseReleaseAtPath(state, { path, value }) {
      _.set(state.release, path, value);
    },
    setValidationErrorAtPath(state, { path, value }) {
      _.set(state.validation_errors, path, value);
    },
    unsetValidationErrorAtPath(state, path) {
      _.set(state.validation_errors, path, []);
    },
    setFiles(state, { category, value }) {
      state.files.originals[category] = value;
    },
    setValidationErrors(state, validation_errors) {
      console.log(validation_errors);
      validation_errors.inner.forEach(validation_error => {
        _.set(state.validation_errors, validation_error.path, [validation_error.message]);
      });
    },
    setCodebaseRelease(state, data) {
      Object.keys(state.release).forEach(function (k) {
        if (data[k] !== undefined) {
          state.release[k] = data[k];
        }
      });
      state.release.release_contributors.forEach(v => {
        v._id = _.uniqueId();
      });
    },
  },
  actions: {
    getCodebaseRelease(context, { identifier, version_number }) {
      return codebaseReleaseAPI
        .retrieve({ identifier, version_number })
        .then(response => context.commit("setCodebaseRelease", response.data));
    },

    setAtPath(context, { path, value }) {
      context.commit("setCodebaseReleaseAtPath", { path, value });
      const schema_path = path.replace(".", ".fields.");
      const subSchema = _.get(schema.fields, schema_path);
      context.dispatch("setErrorsAtPath", { schema: subSchema, path, value });
    },

    // Calculate any validation errors after 1s wait
    setErrorsAtPath: _.debounce(
      (context, { schema, path, value }) =>
        schema.validate(value).then(
          value => context.commit("unsetValidationErrorAtPath", path),
          validation_error =>
            context.commit("setValidationErrorAtPath", {
              path,
              value: validation_error.errors,
            })
        ),
      800
    ),

    getOriginalFiles(context, category) {
      return getFiles(context, category);
    },

    async getMediaFiles(context) {
      const response = await codebaseAPI.mediaList(context.state.release.codebase.identifier);
      context.commit("setMediaFiles", response.data.results);
    },

    deleteFile(context, { category, path }: { category: string; path: string }) {
      codebaseReleaseAPI
        .deleteFile({ path })
        .then(response => Promise.all([context.dispatch("getOriginalFiles", category)]));
    },

    clearCategory(context, { identifier, version_number, category }) {
      codebaseReleaseAPI
        .clearCategory({ identifier, version_number, category })
        .then(response => Promise.all([context.dispatch("getOriginalFiles", category)]));
    },

    initialize(context, { identifier, version_number }) {
      return context.dispatch("getCodebaseRelease", { identifier, version_number }).then(r => {
        if (context.state.release.live) {
          return Promise.all([context.dispatch("getMediaFiles")]);
        } else {
          return Promise.all([
            context.dispatch("getOriginalFiles", "data"),
            context.dispatch("getOriginalFiles", "docs"),
            context.dispatch("getOriginalFiles", "code"),
            context.dispatch("getOriginalFiles", "media"),
            context.dispatch("getMediaFiles"),
          ]);
        }
      });
    },
  },
};
