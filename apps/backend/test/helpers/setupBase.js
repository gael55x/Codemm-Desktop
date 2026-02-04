process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.CODEMM_TRACE = process.env.CODEMM_TRACE || "0";
process.env.CODEMM_HTTP_LOG = process.env.CODEMM_HTTP_LOG || "0";
process.env.CODEMM_LOG_CONVERSATION = process.env.CODEMM_LOG_CONVERSATION || "0";

require("ts-node/register");
