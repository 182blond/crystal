const { merge } = require("webpack-merge");
const common = require("./webpack.common");

// Full browser bundle (no node externals). Dependencies are inlined for <script> usage.
module.exports = merge(common, {
  mode: "production"
});