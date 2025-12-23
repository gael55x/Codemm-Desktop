"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_PROFILES = void 0;
exports.listAgentSelectableLanguages = listAgentSelectableLanguages;
exports.getLanguageProfile = getLanguageProfile;
exports.isLanguageSupportedForGeneration = isLanguageSupportedForGeneration;
exports.isLanguageSupportedForJudge = isLanguageSupportedForJudge;
exports.isLanguageSupportedForExecution = isLanguageSupportedForExecution;
const profile_1 = require("./java/profile");
const profile_2 = require("./cpp/profile");
const profile_3 = require("./python/profile");
const profile_4 = require("./sql/profile");
exports.LANGUAGE_PROFILES = {
    java: profile_1.JAVA_LANGUAGE_PROFILE,
    python: profile_3.PYTHON_LANGUAGE_PROFILE,
    cpp: profile_2.CPP_LANGUAGE_PROFILE,
    sql: profile_4.SQL_LANGUAGE_PROFILE,
};
function listAgentSelectableLanguages() {
    // What we allow the agent to select without additional product work.
    return Object.values(exports.LANGUAGE_PROFILES)
        .filter((p) => p.support.generation && p.support.judge)
        .map((p) => p.language);
}
function getLanguageProfile(language) {
    return exports.LANGUAGE_PROFILES[language];
}
function isLanguageSupportedForGeneration(language) {
    return Boolean(exports.LANGUAGE_PROFILES[language]?.support.generation);
}
function isLanguageSupportedForJudge(language) {
    return Boolean(exports.LANGUAGE_PROFILES[language]?.support.judge);
}
function isLanguageSupportedForExecution(language) {
    return Boolean(exports.LANGUAGE_PROFILES[language]?.support.execution);
}
//# sourceMappingURL=profiles.js.map