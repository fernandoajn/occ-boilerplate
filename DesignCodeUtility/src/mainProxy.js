"use strict"
const program = require("commander")

const t                  = require("./i18n").t
const getLastNode        = require("./metadata").getLastNode
const useBasePath        = require("./utils").useBasePath
const setVerboseLogging  = require("./logger").setVerboseLogging
const keepPartialMatches = require("./utils").keepPartialMatches
const dropPartialMatches = require("./utils").dropPartialMatches
const getHostFromUrl     = require("./utils").getHostFromUrl
const addCommonOptions = require("./optionsUtils").addCommonOptions
const getPassword = require("./optionsUtils").getPassword
const getApplicationKey = require("./optionsUtils").getApplicationKey
const endPointTransceiver = require("./endPointTransceiver")


const proxy = require("./proxyLib/ccproxy")

exports.main = function (argv) {

  // Force use of ccproxy rather than the actual file name of ccproxy.js.
  program._name = "ccproxy"

  addCommonOptions(program)
    .option("-v, --verbose", t("verboseOptionText"))
    .option("-P, --port <port>", t("portOptionText"), 8088)
    .option("-l, --list", t("listHandlerOptionText"))
    .option("-d, --disable <disable>", t("disableHandlersOptionText"))
    .option("-e, --enable <enable>", t("enableHandlersOptionText"))
    .parse(argv)

  // Pass on the base path if it was set.
  if (program.base) {
    useBasePath(program.base)
  }

  // Make sure we know which server we are working with. If the user did not supply a node, try to use the last one.
  if (!program.node) {
    program.node = getLastNode()
  }

  // Something is not quite right - tell the user.
  if (!program.node) {
    program.help()
    return 1
  }

  // Make sure hostname is normalized
  program.node = getHostFromUrl(program.node)

  setVerboseLogging(program.verbose)

  const allHandlers = proxy.getHandlers()
  let handlers = allHandlers.slice()

  if (program.enable)
    handlers = keepPartialMatches(allHandlers, program.enable.split(","))

  if (program.disable)
    handlers = dropPartialMatches(allHandlers, program.disable.split(","))


  // Options passed by environment variable should trump the command line.
  const port = process.env['CC_DEVPROXY_PORT'] || program.port

  if (program.list)
    return proxy.listHandlers(program.node)
  else {
    // Need endpoint transceiver in order to cache widget instances for use when substituting global elements
    return endPointTransceiver.init(
      program.node,
      program.username, getPassword(program.password),
      getApplicationKey(program.applicationKey),
      program.locale, program.allLocales).then(() => {
        return proxy.startProxyDaemon(program.node, port, !!program.refresh, handlers)
      })
  }
}
